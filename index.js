/*!
 *  index.js - A Page resource pool for Puppeteer.
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

const { createPool } = require('generic-pool');
const Debug = require('debug');
const defaultPuppeteer = require('puppeteer');

const Helpers = {
  createPool,
  debug: Debug('ppp:index'),
  defaultPuppeteer,
  defaultPuppeteerArgs: [
    '--disable-breakpad',
    '--disable-crash-reporter',
    '--disable-dev-profile',
    '--disable-dev-shm-usage',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-offer-upload-credit-cards',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--enable-async-dns',
    '--enable-simple-cache-backend',
    '--enable-tcp-fast-open',
    '--media-cache-size=33554432',
    '--no-default-browser-check',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--prerender-from-omnibox=disabled',
  ],
  poolFactory: {
    async create () {
      const { onPageCreated = null } = this.options;
      const page = await this.browser.newPage().catch(ex => Helpers.debug('create page error: %s', ex));
      if (page) {
        Helpers.debug('page is created');
        if (typeof (onPageCreated) === 'function') {
          try {
            await onPageCreated.call(this, page);
          } catch (ex) {
            Helpers.debug('onPageCreated error: %s', ex);
          }
        }
      }
      return page;
    },
    async destroy (page) {
      const { onBeforePageDestroy = null } = this.options;
      if (page) {
        if (typeof (onBeforePageDestroy) === 'function') {
          try {
            await onBeforePageDestroy.call(this, page);
          } catch (ex) {
            Helpers.debug('onBeforePageDestroy error: %s', ex);
          }
        }
        if (!page.isClosed()) {
          await page.close();
        }
        Helpers.debug('page is destroyed');
      }
    },
    async validate (page) {
      const { onValidate = null } = this.options;
      let response = false;
      if (page) {
        if (typeof (onValidate) === 'function') {
          try {
            response = await onValidate.call(this, page);
          } catch (ex) {
            Helpers.debug('onValidate error: %s', ex);
          }
        } else {
          response = true;
        }
      }
      return Promise.resolve(response);
    },
  },
};

/**
 * Provide Puppeteer Page resource pool.
 *
 * @module puppeteer-page-pool
 *
 * @see {@link https://bit.ly/2GXZbUR|Pool Options}
 * @see {@link https://bit.ly/2M6kVCd|Puppeteer Options}
 *
 * @example
 * // use PagePool directly.
 * const PagePool = require('puppeteer-page-pool');
 *
 * // Instantiate PagePool with default options.
 * const pagePool = new PagePool();
 * // Launch the browser and proceed with pool creation.
 * await pagePool.launch();
 * // Acquire and release the page seamlessly.
 * await pagePool.process(async (page) => {
 *   // Any page actions...
 *   await page.goto('https://angular.io');
 * });
 * // All done.
 * await pagePool.destroy();
 *
 * @example
 * // create subclass as a child of PagePool.
 * class MyPagePool extends PagePool {
 *   constructor (options) {
 *     super(options);
 *     this.mine = true;
 *   }
 *
 *   async takeOff () {
 *     // Launch the browser and proceed with pool creation.
 *     await this.launch();
 *     // Acquire and release the page seamlessly.
 *     await this.process(async (page) => {
 *       // Any page actions...
 *       await page.goto('https://angular.io');
 *     });
 *     // All done.
 *     await this.destroy();
 *   }
 * }
 *
 * // Instantiate MyPagePool with default options.
 * const myPagePool = new MyPagePool();
 * // Custom action.
 * await myPagePool.takeOff();
 *
 * @example
 * // use different puppeter library.
 * const puppeteer = require('puppeteer-extra');
 * // See https://bit.ly/32X27uf
 * puppeteer.use(require('puppeteer-extra-plugin-angular')());
 * const customPagePool = new MyPagePool({
 *   puppeteer,
 * });
 * // Custom action.
 * await customPagePool.takeOff();
 *
 * @example
 * // instantiate with customized options.
 * const optionsPagePool = new MyPagePool({
 *   // See factory section of https://github.com/coopernurse/node-pool#createPool
 *   async onPageCreated (page) {
 *     // Bound function that will be called after page is created.
 *   },
 *   async onBeforePageDestroy (page) {
 *     // Bound function that will be called right before page is destroyed.
 *   },
 *   async onValidate (page) {
 *     // Bound function that will be called to validate the validity of the page.
 *   },
 *   // See opts section of https://bit.ly/2GXZbUR
 *   poolOptions: {
 *     log: true,
 *   },
 *   puppeteer,
 *   // See https://bit.ly/2M6kVCd
 *   puppeteerOptions: {
 *     // I want to see all the actions :)
 *     headless: false,
 *   },
 * });
 * // Custom action.
 * await optionsPagePool.takeOff();
 */

/**
 * @alias module:puppeteer-page-pool
 */
class PagePool {
  /**
   * Pool factory event handler.
   *
   * @callback module:puppeteer-page-pool~PoolEventHandler
   *
   * @param {Object} page - The page resource.
   *
   * @example
   * const poolEventHandler = (page) => {
   *   // Do something...
   * };
   */

  /**
   * PagePool instantiation options.
   *
   * @typedef {Object} module:puppeteer-page-pool~Options
   * @param {PoolEventHandler} [onBeforePageDestroy=null] - The function that would be called
   *   before page is destroyed.
   * @param {PoolEventHandler} [onPageCreated=null] - The function that would be called
   *   after page created.
   * @param {PoolEventHandler} [onValidate=null] - The function that would be called
   *   to validate page resource validity.
   * @param {Object} [poolOptions={}] - The pool instantiation options. See https://bit.ly/2GXZbUR
   * @param {Object} [puppeteer=require('puppeteer')] - Puppeteer library to be use.
   * @param {Object} [puppeteerOptions={}] - Puppeteer launch options. See https://bit.ly/2M6kVCd
   *
   * @see {@link https://bit.ly/2GXZbUR|Pool Options}
   * @see {@link https://bit.ly/2M6kVCd|Puppeteer Options}
   *
   * @example
   * const options = {
   *   async onBeforePageDestroy (page) {},
   *   async onPageCreated(page) {},
   *   async onValidate(page) {},
   *   poolOptions: {},
   *   puppeteer,
   *   puppeteerOptions: {},
   * };
   */

  /**
   * Instantiate PagePool class instance.
   *
   * @param {Options} options - PagePool options.
   * @see {@link https://bit.ly/2GXZbUR|Pool Options}
   * @see {@link https://bit.ly/2M6kVCd|Puppeteer Options}
   *
   * @example
   * const PagePool = require('puppeteer-page-pool');
   * const pagePool = new PagePool({});
   */
  constructor (options = {}) {
    this.browser = null;
    this.options = typeof (options) === 'object' && !!options && !Array.isArray(options)
      ? options : {};
    this.pool = null;
  }

  /**
   * Close and release all page resources, as well as clean up after itself.
   *
   * @return {null} Null value.
   *
   * @example
   * let pagePool = new PagePool();
   * pagePool = await pagePool.destroy();
   */
  async destroy () {
    if (this.pool) {
      await this.pool.drain();
      await this.pool.clear();
      Helpers.debug('pool is closed');
    }
    if (this.browser) {
      await this.browser.close();
      Helpers.debug('browser is closed');
    }
    this.browser = null;
    this.options = null;
    this.pool = null;
    return null;
  }

  /**
   * Launch the browser and create all page resources.
   *
   * @example
   * const pagePool = new PagePool();
   * await pagePool.launch();
   */
  async launch () {
    const {
      poolOptions = {},
      puppeteer = Helpers.defaultPuppeteer,
      puppeteerOptions = {},
    } = this.options;
    puppeteerOptions.args = puppeteerOptions.args || Helpers.defaultPuppeteerArgs;
    this.browser = await puppeteer.launch(puppeteerOptions);
    Helpers.debug('browser is created');

    this.pool = Helpers.createPool({
      create: Helpers.poolFactory.create.bind(this),
      destroy: Helpers.poolFactory.destroy.bind(this),
      validate: Helpers.poolFactory.validate.bind(this),
    }, poolOptions);

    if (this.pool) {
      Helpers.debug('pool is created');
      this.pool.on('factoryCreateError', ex => Helpers.debug('pool.factoryCreate error: %s', ex));
      this.pool.on('factoryDestroyError', ex => Helpers.debug('pool.factoryDestroy error: %s', ex));
    } else {
      Helpers.debug('pool is not created');
    }
  }

  /**
   * Action handler function that is executed with page resource from the pool.
   *
   * @callback module:puppeteer-page-pool~ActionHandler
   * @param {Object} page - The page resource.
   * @param {...*} args - Action handler arguments.
   *
   * @example
   * const actionHandler = (page, ...args) => {
   *   // Do something...
   * };
   */

  /**
   * Process given args using provided handler.
   *
   * @param {ActionHandler} handler - Action handler.
   * @param {...*} args - Action handler arguments.
   *
   * @example
   * const args = { key: 'value' };
   * const pagePool = new PagePool();
   * await pagePool.process((page, data) => {}, args);
   */
  async process (handler, ...args) {
    if (!this.pool) {
      Helpers.debug('pool is not found. Did you forgot to call launch() method?');
    } else if (typeof (handler) !== 'function') {
      Helpers.debug('handler is not a function');
    } else {
      await this.pool.use(page => handler(page, ...args, this.pool))
        .catch(ex => Helpers.debug('process error: %s', ex));
    }
  }
}

/* test-code */
/* istanbul ignore else */
if (global.jasmine) {
  PagePool.__test__ = Helpers;
}
/* end-test-code */

module.exports = PagePool;
