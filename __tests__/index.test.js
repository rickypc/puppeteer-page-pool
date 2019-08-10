/*!
 *  index.test.js - tests for PagePool functionality.
 *  Copyright (c) 2018 - 2019 Richard Huang <rickypc@users.noreply.github.com>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const PagePool = require('../index.js');

const createMocks = ({
  browserAction = '',
  createPoolAction = '',
  pageClosed = false,
  poolOnAction = '',
  poolUseAction = '',
} = {}) => {
  const mocks = Object.assign({
    browserAction,
    createPoolAction,
    pageClosed,
    poolOnAction,
    poolUseAction,
  }, {
    browser: {
      close: jest.fn(() => {}),
      newPage: jest.fn(() => (mocks.browserAction === 'error'
        ? Promise.reject(Error('error')) : Promise.resolve(mocks.page))),
    },
    createPool: jest.spyOn(PagePool.__test__, 'createPool')
      .mockImplementation(() => (mocks.createPoolAction === 'error' ? null : mocks.pool)),
    debug: jest.spyOn(PagePool.__test__, 'debug').mockImplementation(() => {}),
    defaultPuppeteer: {
      launch: jest.spyOn(PagePool.__test__.defaultPuppeteer, 'launch')
        .mockImplementation(() => mocks.browser),
    },
    page: {
      isClosed: jest.fn(() => mocks.pageClosed),
      close: jest.fn(() => {}),
    },
    pool: {
      clear: jest.fn(() => {}),
      drain: jest.fn(() => {}),
      on: jest.fn((topic, callback) => {
        if (mocks.poolOnAction === 'error') {
          callback(Error('error'));
        }
      }),
      use: jest.fn((callback, ...args) => {
        callback(mocks.page, ...args, mocks.pool);
        return mocks.poolUseAction === 'error'
          ? Promise.reject(Error('error')) : Promise.resolve();
      }),
    },
  });
  return mocks;
};

describe('PoolFactory helper test', () => {
  describe('create', () => {
    it('should return expected without event handler', async () => {
      const mocks = createMocks();
      const actual = await PagePool.__test__.poolFactory.create.call({
        browser: mocks.browser,
        options: {},
      });
      expect(actual).toEqual(mocks.page);
      expect(mocks.browser.newPage).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'page is created');
    });

    it('should return expected with event handler', async () => {
      const mocks = createMocks();
      const context = {
        browser: mocks.browser,
        options: {
          onPageCreated (page) {
            expect(page).toEqual(mocks.page);
            expect(this).toEqual(context);
          },
        },
      };
      const actual = await PagePool.__test__.poolFactory.create.call(context);
      expect(actual).toEqual(mocks.page);
      expect(mocks.browser.newPage).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'page is created');
    });

    it('should log error on failed to create new page', async () => {
      const mocks = createMocks({ browserAction: 'error' });
      const actual = await PagePool.__test__.poolFactory.create.call({
        browser: mocks.browser,
        options: {},
      });
      expect(actual).toBeUndefined();
      expect(mocks.browser.newPage).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'create page error: %s', expect.any(Error));
    });

    it('should log error on failed event handler', async () => {
      const mocks = createMocks();
      const context = {
        browser: mocks.browser,
        options: {
          onPageCreated (page) {
            expect(page).toEqual(mocks.page);
            expect(this).toEqual(context);
            throw Error('error');
          },
        },
      };
      const actual = await PagePool.__test__.poolFactory.create.call(context);
      expect(actual).toEqual(mocks.page);
      expect(mocks.browser.newPage).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(2);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'page is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'onPageCreated error: %s', expect.any(Error));
    });
  });

  describe('destroy', () => {
    it('should destroy the page without event handler', async () => {
      const mocks = createMocks();
      await PagePool.__test__.poolFactory.destroy.call({
        options: {},
      }, mocks.page);
      expect(mocks.page.isClosed).toHaveBeenCalledTimes(1);
      expect(mocks.page.close).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'page is destroyed');
    });

    it('should destroy the page with event handler', async () => {
      const mocks = createMocks();
      const context = {
        options: {
          onBeforePageDestroy (page) {
            expect(page).toEqual(mocks.page);
            expect(this).toEqual(context);
          },
        },
      };
      await PagePool.__test__.poolFactory.destroy.call(context, mocks.page);
      expect(mocks.page.isClosed).toHaveBeenCalledTimes(1);
      expect(mocks.page.close).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'page is destroyed');
    });

    it('should ignore without page resource', async () => {
      const mocks = createMocks();
      await PagePool.__test__.poolFactory.destroy.call({
        options: {},
      });
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.debug).not.toHaveBeenCalled();
    });

    it('should ignore on page closed', async () => {
      const mocks = createMocks({ pageClosed: true });
      await PagePool.__test__.poolFactory.destroy.call({
        options: {},
      }, mocks.page);
      expect(mocks.page.isClosed).toHaveBeenCalledTimes(1);
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'page is destroyed');
    });

    it('should log error on failed event handler', async () => {
      const mocks = createMocks();
      const context = {
        options: {
          onBeforePageDestroy (page) {
            expect(page).toEqual(mocks.page);
            expect(this).toEqual(context);
            throw Error('error');
          },
        },
      };
      await PagePool.__test__.poolFactory.destroy.call(context, mocks.page);
      expect(mocks.page.isClosed).toHaveBeenCalledTimes(1);
      expect(mocks.page.close).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenCalledTimes(2);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'onBeforePageDestroy error: %s',
        expect.any(Error));
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'page is destroyed');
    });
  });

  describe('validate', () => {
    it('should validate without event handler', async () => {
      const mocks = createMocks();
      const actual = await PagePool.__test__.poolFactory.validate.call({
        options: {},
      }, mocks.page);
      expect(actual).toBeTruthy();
      expect(mocks.debug).not.toHaveBeenCalled();
    });

    it('should validate with event handler', async () => {
      const mocks = createMocks();
      const context = {
        options: {
          onValidate (page) {
            expect(page).toEqual(mocks.page);
            expect(this).toEqual(context);
            return true;
          },
        },
      };
      const actual = await PagePool.__test__.poolFactory.validate.call(context, mocks.page);
      expect(actual).toBeTruthy();
      expect(mocks.debug).not.toHaveBeenCalled();
    });

    it('should validate without page resource', async () => {
      const mocks = createMocks();
      const actual = await PagePool.__test__.poolFactory.validate.call({
        options: {},
      });
      expect(actual).toBeFalsy();
      expect(mocks.debug).not.toHaveBeenCalled();
    });

    it('should log error on failed event handler', async () => {
      const mocks = createMocks();
      const context = {
        options: {
          onValidate (page) {
            expect(page).toEqual(mocks.page);
            expect(this).toEqual(context);
            throw Error('error');
          },
        },
      };
      const actual = await PagePool.__test__.poolFactory.validate.call(context, mocks.page);
      expect(actual).toBeFalsy();
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'onValidate error: %s', expect.any(Error));
    });
  });
});

describe('PagePool module test', () => {
  describe('constructor', () => {
    it('should return expected', () => {
      const mocks = createMocks();
      const actual = new PagePool();
      expect(actual instanceof PagePool).toBeTruthy();
      expect(actual).toEqual(expect.objectContaining({
        browser: null,
        destroy: expect.any(Function),
        launch: expect.any(Function),
        options: {},
        process: expect.any(Function),
        pool: null,
      }));
      expect(mocks.createPool).not.toHaveBeenCalled();
      expect(mocks.debug).not.toHaveBeenCalled();
      expect(mocks.defaultPuppeteer.launch).not.toHaveBeenCalled();
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).not.toHaveBeenCalled();
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });

    it('should return expected on non-object options', () => {
      const mocks = createMocks();
      const actual = new PagePool(null);
      expect(actual instanceof PagePool).toBeTruthy();
      expect(actual).toEqual(expect.objectContaining({
        browser: null,
        destroy: expect.any(Function),
        launch: expect.any(Function),
        options: {},
        process: expect.any(Function),
        pool: null,
      }));
      expect(mocks.createPool).not.toHaveBeenCalled();
      expect(mocks.debug).not.toHaveBeenCalled();
      expect(mocks.defaultPuppeteer.launch).not.toHaveBeenCalled();
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).not.toHaveBeenCalled();
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should destroy member variables before launch', async () => {
      const mocks = createMocks();
      const actual = new PagePool();
      expect(await actual.destroy()).toBeNull();
      expect(actual).toEqual(expect.objectContaining({
        browser: null,
        destroy: expect.any(Function),
        launch: expect.any(Function),
        options: null,
        process: expect.any(Function),
        pool: null,
      }));
      expect(mocks.createPool).not.toHaveBeenCalled();
      expect(mocks.debug).not.toHaveBeenCalled();
      expect(mocks.defaultPuppeteer.launch).not.toHaveBeenCalled();
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).not.toHaveBeenCalled();
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });

    it('should destroy member variables after launch', async () => {
      const mocks = createMocks();
      const actual = new PagePool();
      await actual.launch();
      expect(await actual.destroy()).toBeNull();
      expect(actual).toEqual(expect.objectContaining({
        browser: null,
        destroy: expect.any(Function),
        launch: expect.any(Function),
        options: null,
        process: expect.any(Function),
        pool: null,
      }));
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(4);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(3, 'pool is closed');
      expect(mocks.debug).toHaveBeenNthCalledWith(4, 'browser is closed');
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).toHaveBeenCalledTimes(1);
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).toHaveBeenCalledTimes(1);
      expect(mocks.pool.drain).toHaveBeenCalledTimes(1);
      expect(mocks.pool.on).toHaveBeenCalledTimes(2);
      expect(mocks.pool.on).toHaveBeenNthCalledWith(1, 'factoryCreateError', expect.any(Function));
      expect(mocks.pool.on).toHaveBeenNthCalledWith(2, 'factoryDestroyError', expect.any(Function));
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });
  });

  describe('launch', () => {
    it('should create pool and resources', async () => {
      const mocks = createMocks();
      const actual = new PagePool();
      await actual.launch();
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(2);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is created');
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).toHaveBeenCalledTimes(2);
      expect(mocks.pool.on).toHaveBeenNthCalledWith(1, 'factoryCreateError', expect.any(Function));
      expect(mocks.pool.on).toHaveBeenNthCalledWith(2, 'factoryDestroyError', expect.any(Function));
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });

    it('should log error on failed to create pool', async () => {
      const mocks = createMocks({ createPoolAction: 'error' });
      const actual = new PagePool();
      await actual.launch();
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(2);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is not created');
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).not.toHaveBeenCalled();
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });

    it('should log error on failed factory', async () => {
      const mocks = createMocks({ poolOnAction: 'error' });
      const actual = new PagePool();
      await actual.launch();
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(4);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(3, 'pool.factoryCreate error: %s',
        expect.any(Error));
      expect(mocks.debug).toHaveBeenNthCalledWith(4, 'pool.factoryDestroy error: %s',
        expect.any(Error));
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).toHaveBeenCalledTimes(2);
      expect(mocks.pool.on).toHaveBeenNthCalledWith(1, 'factoryCreateError', expect.any(Function));
      expect(mocks.pool.on).toHaveBeenNthCalledWith(2, 'factoryDestroyError', expect.any(Function));
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });
  });

  describe('process', () => {
    it('should execute handler with given args', async () => {
      const mocks = createMocks();
      mocks.handler = jest.fn(() => {});
      const actual = new PagePool();
      await actual.launch();
      await actual.process(mocks.handler, { key: 'value' }, { key2: 'value2' });
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(2);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is created');
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).toHaveBeenCalledTimes(2);
      expect(mocks.pool.on).toHaveBeenNthCalledWith(1, 'factoryCreateError', expect.any(Function));
      expect(mocks.pool.on).toHaveBeenNthCalledWith(2, 'factoryDestroyError', expect.any(Function));
      expect(mocks.pool.use).toHaveBeenCalledTimes(1);
      expect(mocks.pool.use).toHaveBeenNthCalledWith(1, expect.any(Function));
      expect(mocks.handler).toHaveBeenCalledTimes(1);
      expect(mocks.handler).toHaveBeenNthCalledWith(1, mocks.page,
        { key: 'value' }, { key2: 'value2' }, mocks.pool);
    });

    it('should log error on failed to process', async () => {
      const mocks = createMocks({ poolUseAction: 'error' });
      mocks.handler = jest.fn(() => {});
      const actual = new PagePool();
      await actual.launch();
      await actual.process(mocks.handler, { key: 'value' }, { key2: 'value2' });
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(3);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(3, 'process error: %s', expect.any(Error));
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).toHaveBeenCalledTimes(2);
      expect(mocks.pool.on).toHaveBeenNthCalledWith(1, 'factoryCreateError', expect.any(Function));
      expect(mocks.pool.on).toHaveBeenNthCalledWith(2, 'factoryDestroyError', expect.any(Function));
      expect(mocks.pool.use).toHaveBeenCalledTimes(1);
      expect(mocks.pool.use).toHaveBeenNthCalledWith(1, expect.any(Function));
      expect(mocks.handler).toHaveBeenCalledTimes(1);
      expect(mocks.handler).toHaveBeenNthCalledWith(1, mocks.page,
        { key: 'value' }, { key2: 'value2' }, mocks.pool);
    });

    it('should log error without calling launch() method', async () => {
      const mocks = createMocks();
      const actual = new PagePool();
      await actual.process(() => {});
      expect(mocks.createPool).not.toHaveBeenCalled();
      expect(mocks.debug).toHaveBeenCalledTimes(1);
      expect(mocks.debug).toHaveBeenNthCalledWith(1,
        'pool is not found. Did you forgot to call launch() method?');
      expect(mocks.defaultPuppeteer.launch).not.toHaveBeenCalled();
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).not.toHaveBeenCalled();
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });

    it('should log error without passing handler', async () => {
      const mocks = createMocks();
      const actual = new PagePool();
      await actual.launch();
      await actual.process();
      expect(mocks.createPool).toHaveBeenCalledTimes(1);
      expect(mocks.createPool).toHaveBeenNthCalledWith(1, expect.objectContaining({
        create: expect.any(Function),
        destroy: expect.any(Function),
        validate: expect.any(Function),
      }), {});
      expect(mocks.debug).toHaveBeenCalledTimes(3);
      expect(mocks.debug).toHaveBeenNthCalledWith(1, 'browser is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(2, 'pool is created');
      expect(mocks.debug).toHaveBeenNthCalledWith(3, 'handler is not a function');
      expect(mocks.defaultPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mocks.defaultPuppeteer.launch).toHaveBeenNthCalledWith(1, expect.objectContaining({
        args: expect.any(Array),
      }));
      expect(mocks.browser.close).not.toHaveBeenCalled();
      expect(mocks.browser.newPage).not.toHaveBeenCalled();
      expect(mocks.page.isClosed).not.toHaveBeenCalled();
      expect(mocks.page.close).not.toHaveBeenCalled();
      expect(mocks.pool.clear).not.toHaveBeenCalled();
      expect(mocks.pool.drain).not.toHaveBeenCalled();
      expect(mocks.pool.on).toHaveBeenCalledTimes(2);
      expect(mocks.pool.on).toHaveBeenNthCalledWith(1, 'factoryCreateError', expect.any(Function));
      expect(mocks.pool.on).toHaveBeenNthCalledWith(2, 'factoryDestroyError', expect.any(Function));
      expect(mocks.pool.use).not.toHaveBeenCalled();
    });
  });
});
