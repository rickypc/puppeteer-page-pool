const PagePool = require('puppeteer-page-pool');
const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-angular')());

(async () => {
  const pagePool = new PagePool({
    // See opts section of https://bit.ly/2GXZbUR
    poolOptions: {
      max: 3,
    },
    puppeteer,
    // See https://bit.ly/2M6kVCd
    puppeteerOptions: {
      headless: false,
    },
  });

  // Launch the browser and proceed with pool creation.
  await pagePool.launch();

  const promises = [
    'https://angular.io',
    'https://www.chromium.org',
    'https://santatracker.google.com',
  ].map((url) => pagePool.process(async (page, data) => {
    // PagePool will acquire and release the page seamlessly.
    // Navigate to given Url and wait until Angular is ready
    // if it's an angular page.
    await page.navigateUntilReady(data.url);
    await page.screenshot({
      fullPage: true,
      path: `${data.url.replace(/https?:|\//g, '')}-screenshot.png`,
    });
  }, { url }));

  // Wait until it's all done.
  await Promise.all(promises);

  // All done.
  await pagePool.destroy();
})();
