const PagePool = require('puppeteer-page-pool');
const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-angular')());

(async () => {
  const pagePool = new PagePool({
    // See opts section of https://bit.ly/2GXZbUR
    poolOptions: {
      log: true,
    },
    puppeteer,
    // See https://bit.ly/2M6kVCd
    puppeteerOptions: {
      // I want to see all the actions :)
      headless: true,
    },
  });
  // Launch the browser and proceed with pool creation.
  await pagePool.launch();
  // Acquire and release the page seamlessly.
  await pagePool.process(async (page, data) => {
    // Navigate to given Url and wait until Angular is ready.
    await page.navigateUntilReady(data.url);
    // Selector will find a button on the top of the page that say "Get Started".
    await page.clickIfExists('a.button.hero-cta', 'Top Get Started Button');
    // Should navigate to the new Url.
    console.log(page.target().url()); // https://angular.io/start
    // Selector won't find any element on this page.
    await page.clickIfExists('a.button.hero-cta', 'Top Get Started Button');
    // Url should be the same
    console.log(page.target().url()); // https://angular.io/start
  }, { url: 'https://angular.io' });
  // All done.
  await pagePool.destroy();
})();
