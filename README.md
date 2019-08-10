[![Version](https://img.shields.io/npm/v/puppeteer-page-pool.svg)](https://bit.ly/2KHg9rB)
[![Downloads](https://img.shields.io/npm/dt/puppeteer-page-pool.svg)](https://bit.ly/2KHg9rB)
[![Dependency Status](https://img.shields.io/david/rickypc/puppeteer-page-pool.svg)](https://bit.ly/2Tjx5YT)
[![Dev Dependency Status](https://img.shields.io/david/dev/rickypc/puppeteer-page-pool.svg)](https://bit.ly/2YBkjev)
[![Code Style](https://img.shields.io/badge/code%20style-Airbnb-red.svg)](https://bit.ly/2JYN1gk)
[![Build](https://img.shields.io/travis/rickypc/puppeteer-page-pool.svg)](https://bit.ly/2YSR7il)
[![Coverage](https://img.shields.io/codecov/c/github/rickypc/puppeteer-page-pool.svg)](https://bit.ly/2TmdMhN)
[![License](https://img.shields.io/npm/l/puppeteer-page-pool.svg)](https://bit.ly/2yi7gyO)

Puppeteer Page Pool
===================

A [Page](https://bit.ly/2Z2NKFK) resource [pool](https://bit.ly/2ZNrNav) for [Puppeteer](https://bit.ly/2KqtMwd). It can be used to reuse or throttle usage of the Puppeteer Page resource.

Installation
-

```bash
$ npm install --save puppeteer-page-pool
```

API Reference
-
Provide Puppeteer Page resource pool.

**See**

- [Pool Options](https://bit.ly/2GXZbUR)
- [Puppeteer Options](https://bit.ly/2M6kVCd)

**Example**  
```js
// use PagePool directly.
const PagePool = require('puppeteer-page-pool');

// Instantiate PagePool with default options.
const pagePool = new PagePool();
// Launch the browser and proceed with pool creation.
await pagePool.launch();
// Acquire and release the page seamlessly.
await pagePool.process(async (page) => {
  // Any page actions...
  await page.goto('https://angular.io');
});
// All done.
await pagePool.destroy();
```
**Example**  
```js
// create subclass as a child of PagePool.
class MyPagePool extends PagePool {
  constructor (options) {
    super(options);
    this.mine = true;
  }

  async takeOff () {
    // Launch the browser and proceed with pool creation.
    await this.launch();
    // Acquire and release the page seamlessly.
    await this.process(async (page) => {
      // Any page actions...
      await page.goto('https://angular.io');
    });
    // All done.
    await this.destroy();
  }
}

// Instantiate MyPagePool with default options.
const myPagePool = new MyPagePool();
// Custom action.
await myPagePool.takeOff();
```
**Example**  
```js
// use different puppeter library.
const puppeteer = require('puppeteer-extra');
// See https://bit.ly/32X27uf
puppeteer.use(require('puppeteer-extra-plugin-angular')());
const customPagePool = new MyPagePool({
  puppeteer,
});
// Custom action.
await customPagePool.takeOff();
```
**Example**  
```js
// instantiate with customized options.
const optionsPagePool = new MyPagePool({
  // See factory section of https://github.com/coopernurse/node-pool#createPool
  async onPageCreated (page) {
    // Bound function that will be called after page is created.
  },
  async onBeforePageDestroy (page) {
    // Bound function that will be called right before page is destroyed.
  },
  async onValidate (page) {
    // Bound function that will be called to validate the validity of the page.
  },
  // See opts section of https://bit.ly/2GXZbUR
  poolOptions: {
    log: true,
  },
  puppeteer,
  // See https://bit.ly/2M6kVCd
  puppeteerOptions: {
    // I want to see all the actions :)
    headless: false,
  },
});
// Custom action.
await optionsPagePool.takeOff();
```

* [puppeteer-page-pool](#module_puppeteer-page-pool)
    * [PagePool](#exp_module_puppeteer-page-pool--PagePool) ⏏
        * [new PagePool(options)](#new_module_puppeteer-page-pool--PagePool_new)
        * _instance_
            * [.destroy()](#module_puppeteer-page-pool--PagePool+destroy) ⇒ <code>null</code>
            * [.launch()](#module_puppeteer-page-pool--PagePool+launch)
            * [.process(handler, ...args)](#module_puppeteer-page-pool--PagePool+process)
        * _inner_
            * [~PoolEventHandler](#module_puppeteer-page-pool--PagePool..PoolEventHandler) : <code>function</code>
            * [~Options](#module_puppeteer-page-pool--PagePool..Options) : <code>Object</code>
            * [~ActionHandler](#module_puppeteer-page-pool--PagePool..ActionHandler) : <code>function</code>

<a name="exp_module_puppeteer-page-pool--PagePool"></a>

### PagePool ⏏
**Kind**: Exported class  
**See**

- [Pool Options](https://bit.ly/2GXZbUR)
- [Puppeteer Options](https://bit.ly/2M6kVCd)

<a name="new_module_puppeteer-page-pool--PagePool_new"></a>

#### new PagePool(options)
Instantiate PagePool class instance.


| Param | Type | Description |
| --- | --- | --- |
| options | <code>Options</code> | PagePool options. |

**Example**  
```js
const PagePool = require('puppeteer-page-pool');
const pagePool = new PagePool({});
```
<a name="module_puppeteer-page-pool--PagePool+destroy"></a>

#### pagePool.destroy() ⇒ <code>null</code>
Close and release all page resources, as well as clean up after itself.

**Kind**: instance method of [<code>PagePool</code>](#exp_module_puppeteer-page-pool--PagePool)  
**Returns**: <code>null</code> - Null value.  
**Example**  
```js
let pagePool = new PagePool();
pagePool = await pagePool.destroy();
```
<a name="module_puppeteer-page-pool--PagePool+launch"></a>

#### pagePool.launch()
Launch the browser and create all page resources.

**Kind**: instance method of [<code>PagePool</code>](#exp_module_puppeteer-page-pool--PagePool)  
**Example**  
```js
const pagePool = new PagePool();
await pagePool.launch();
```
<a name="module_puppeteer-page-pool--PagePool+process"></a>

#### pagePool.process(handler, ...args)
Process given args using provided handler.

**Kind**: instance method of [<code>PagePool</code>](#exp_module_puppeteer-page-pool--PagePool)  

| Param | Type | Description |
| --- | --- | --- |
| handler | <code>ActionHandler</code> | Action handler. |
| ...args | <code>\*</code> | Action handler arguments. |

**Example**  
```js
const args = { key: 'value' };
const pagePool = new PagePool();
await pagePool.process((page, data) => {}, args);
```
<a name="module_puppeteer-page-pool--PagePool..PoolEventHandler"></a>

#### PagePool~PoolEventHandler : <code>function</code>
Pool factory event handler.

**Kind**: inner typedef of [<code>PagePool</code>](#exp_module_puppeteer-page-pool--PagePool)  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>Object</code> | The page resource. |

**Example**  
```js
const poolEventHandler = (page) => {
  // Do something...
};
```
<a name="module_puppeteer-page-pool--PagePool..Options"></a>

#### PagePool~Options : <code>Object</code>
PagePool instantiation options.

**Kind**: inner typedef of [<code>PagePool</code>](#exp_module_puppeteer-page-pool--PagePool)  
**See**

- [Pool Options](https://bit.ly/2GXZbUR)
- [Puppeteer Options](https://bit.ly/2M6kVCd)


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [onBeforePageDestroy] | <code>PoolEventHandler</code> | <code></code> | The function that would be called   before page is destroyed. |
| [onPageCreated] | <code>PoolEventHandler</code> | <code></code> | The function that would be called   after page created. |
| [onValidate] | <code>PoolEventHandler</code> | <code></code> | The function that would be called   to validate page resource validity. |
| [poolOptions] | <code>Object</code> | <code>{}</code> | The pool instantiation options. See https://bit.ly/2GXZbUR |
| [puppeteer] | <code>Object</code> | <code>require(&#x27;puppeteer&#x27;)</code> | Puppeteer library to be use. |
| [puppeteerOptions] | <code>Object</code> | <code>{}</code> | Puppeteer launch options. See https://bit.ly/2M6kVCd |

**Example**  
```js
const options = {
  async onBeforePageDestroy (page) {},
  async onPageCreated(page) {},
  async onValidate(page) {},
  poolOptions: {},
  puppeteer,
  puppeteerOptions: {},
};
```
<a name="module_puppeteer-page-pool--PagePool..ActionHandler"></a>

#### PagePool~ActionHandler : <code>function</code>
Action handler function that is executed with page resource from the pool.

**Kind**: inner typedef of [<code>PagePool</code>](#exp_module_puppeteer-page-pool--PagePool)  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>Object</code> | The page resource. |
| ...args | <code>\*</code> | Action handler arguments. |

**Example**  
```js
const actionHandler = (page, ...args) => {
  // Do something...
};
```

Development Dependencies
-
You will need to install [Node.js](https://bit.ly/2SMCGXK) as a local development dependency. The `npm` package manager comes bundled with all recent releases of `Node.js`.

`npm install` will attempt to resolve any `npm` module dependencies that have been declared in the project’s `package.json` file, installing them into the `node_modules` folder.

```bash
$ npm install
```

Run Linter
-
To make sure we followed code style best practice, run:

```bash
$ npm run lint
```

Run Unit Tests
-
To make sure we did not break anything, let's run:

```bash
$ npm test
```

Contributing
-
If you would like to contribute code to Puppeteer Page Pool project you can do so through GitHub by forking the repository and sending a pull request.

When submitting code, please make every effort to follow existing conventions and style in order to keep the code as readable as possible. Please also include appropriate test cases.

Before your code can be accepted into the project you must also sign the [Puppeteer Page Pool CLA](https://bit.ly/2YOMKov) (Individual Contributor License Agreement).

That's it! Thank you for your contribution!

License
-
Copyright (c) 2018 - 2019 Richard Huang.

This module is free software, licensed under: [GNU Affero General Public License (AGPL-3.0)](https://bit.ly/2yi7gyO).

Documentation and other similar content are provided under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://bit.ly/2SMCRlS).
