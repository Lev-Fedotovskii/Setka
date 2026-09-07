import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEST_URL||'http://localhost:4175/Setka/';
const context=await chromium.launchPersistentContext('artifacts/installability-profile',{headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
  const page=await context.newPage();
  await page.goto(base);await page.locator('#dialog[open]').waitFor();await page.locator('#dialog [data-action=close]').click();await page.waitForSelector('.now-panel');
  const details=await page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.ready;
    const manifestUrl=document.querySelector('link[rel=manifest]').href;
    const manifest=await(await fetch(manifestUrl)).json();
    return {scope:reg.scope,manifestUrl,manifest};
  });
  assert.equal(details.scope,base);
  for(const key of ['id','scope','start_url'])assert.equal(new URL(details.manifest[key],details.manifestUrl).href,base);
  const cdp=await context.newCDPSession(page);await cdp.send('Page.enable');
  const {installabilityErrors}=await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installabilityErrors,[]);
  await page.goto(base+'?view=tasks');await page.waitForSelector('[data-filter]');
  await page.reload();assert.ok(page.url().startsWith(base));
  console.log('PWA manifest, subpath/service-worker scope and Chromium installability checks passed.');
}finally{await context.close();}
