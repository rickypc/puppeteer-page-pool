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
    '--disable-crash-reporter',
    '--disable-dev-profile',
    '--disable-gpu',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-offer-upload-credit-cards',
    '--disable-password-generation',
    '--disable-setuid-sandbox',
    '--disable-speech-api',
    '--disable-suggestions-ui',
    '--disable-web-security',
    '--enable-async-dns',
    '--enable-tcp-fast-open',
    // Hide scrollbars from screenshots.
    '--hide-scrollbars',
    '--no-default-browser-check',
    '--no-experiments',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--prerender-from-omnibox=disabled',
  ],
  poolFactory: {
    async create () {
      const { onPageCreated = null } = this.options;
      const page = await this.browser.newPage()
        .catch((ex) => Helpers.debug('create page error: %s', ex));
      if (page) {
        Helpers.debug('page is created');
        if (typeof (onPageCreated) === 'function') {
          try {
            await onPageCreated.call(this, page);
            Helpers.debug('onPageCreated done');
          } catch (ex) {
            Helpers.debug('onPageCreated error: %s', ex);
          }
        }
      }
      return page;
    },
    async destroy (page) {
      const { onPageDestroy = null } = this.options;
      if (page) {
        if (typeof (onPageDestroy) === 'function') {
          try {
            await onPageDestroy.call(this, page);
            Helpers.debug('onPageDestroy done');
          } catch (ex) {
            Helpers.debug('onPageDestroy error: %s', ex);
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
            Helpers.debug('onValidate done: %s', response);
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
 *   async onPageDestroy (page) {
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
 *
 * @example
 * // parallel processes.
 * const parallelPagePool = new PagePool({
 *   // See opts section of https://bit.ly/2GXZbUR
 *   poolOptions: {
 *     max: 3,
 *   },
 *   puppeteer,
 *   // See https://bit.ly/2M6kVCd
 *   puppeteerOptions: {
 *     headless: false,
 *   },
 * });
 * // Launch the browser and proceed with pool creation.
 * await parallelPagePool.launch();
 *
 * const promises = [
 *   'https://angular.io',
 *   'https://www.chromium.org',
 *   'https://santatracker.google.com',
 * ].map((url) => {
 *   // Acquire and release the page seamlessly.
 *   return parallelPagePool.process(async (page, data) => {
 *     // Navigate to given Url and wait until Angular is ready
 *     // if it's an angular page.
 *     await page.navigateUntilReady(data.url);
 *     await page.screenshot({
 *       fullPage: true,
 *       path: `${data.url.replace(/https?:|\//g, '')}-screenshot.png`,
 *     });
 *   }, { url });
 * });
 *
 * // Wait until it's all done.
 * await Promise.all(promises);
 *
 * // All done.
 * await parallelPagePool.destroy();
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
   * @param {PoolEventHandler} [onPageDestroy=null] - The function that would be called
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
   *   async onPageDestroy (page) {},
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
    this.browser = await puppeteer.launch(puppeteerOptions)
      .catch((ex) => Helpers.debug('browser create error: %s', ex));

    if (this.browser) {
      Helpers.debug('browser is created with: %j', puppeteerOptions);
      this.pool = Helpers.createPool({
        create: Helpers.poolFactory.create.bind(this),
        destroy: Helpers.poolFactory.destroy.bind(this),
        validate: Helpers.poolFactory.validate.bind(this),
      }, poolOptions);
    }

    if (this.pool) {
      Helpers.debug('pool is created with: %j', poolOptions);
      this.pool.on('factoryCreateError',
        (ex) => Helpers.debug('pool.factoryCreate error: %s', ex));
      this.pool.on('factoryDestroyError',
        (ex) => Helpers.debug('pool.factoryDestroy error: %s', ex));
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
      await this.pool.use((page) => handler(page, ...args, this.pool))
        .catch((ex) => Helpers.debug('process error: %s', ex));
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
