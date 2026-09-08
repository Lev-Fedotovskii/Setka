import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEST_URL||'http://localhost:4175/Setka/';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext();
try{
  const stable=await context.newPage(),unstable=await context.newPage();
  async function ready(page,url){
    await page.goto(url);await page.locator('.now-panel').waitFor();
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    if(await page.locator('#dialog[open]').count())await page.locator('#dialog [data-action=close]').click();
  }
  async function task(page,title){
    await page.locator('[data-action=add-task]').click();
    await page.locator('#task-form [name=title]').fill(title);
    await page.locator('#task-form .sticky-button').click();
    await page.locator('#dialog').waitFor({state:'hidden'});
  }
  await ready(stable,base);await task(stable,'Stable channel sentinel');
  const before=await stable.evaluate(()=>localStorage.getItem('setka.v1'));
  await stable.evaluate(()=>localStorage.setItem('setka.notifications.delivered','["stable-sentinel"]'));
  await ready(unstable,base+'unstable/');
  // An ancestor worker may control the first request; require the child controller.
  await unstable.waitForFunction(()=>navigator.serviceWorker.controller.scriptURL.includes('/unstable/sw.js'));
  assert.equal(await unstable.title(),'Setka Unstable — тестовая версия');
  const initial=await unstable.evaluate(()=>JSON.parse(localStorage.getItem('setka.unstable.v1')||'{"tasks":[]}'));
  assert.equal(initial.tasks.length,0);
  await task(unstable,'Unstable channel sentinel');
  assert.equal(await stable.evaluate(()=>localStorage.getItem('setka.v1')),before);
  assert.equal(await unstable.evaluate(()=>localStorage.getItem('setka.notifications.delivered')),'["stable-sentinel"]');
  for(const [page,url,name] of [[stable,base,'stable'],[unstable,base+'unstable/','unstable']]){
    const meta=await page.evaluate(async()=>{
      const href=document.querySelector('link[rel=manifest]').href;
      return {href,manifest:await(await fetch(href)).json(),scope:(await navigator.serviceWorker.ready).scope,channel:await(await fetch('./channel.json')).json()};
    });
    assert.equal(meta.scope,url);assert.equal(meta.channel.channel,name);
    for(const key of ['id','scope','start_url'])assert.equal(new URL(meta.manifest[key],meta.href).href,url);
    if(name==='stable')assert.equal(meta.channel.version,'0.3.2');
    else assert.equal(meta.manifest.name,'Setka Unstable');
  }
  const keys=await stable.evaluate(()=>caches.keys());
  assert.ok(keys.some(k=>k.startsWith('setka-')));assert.ok(keys.some(k=>k.startsWith('setkaUnstable-')));
  // Exact historical cleanup predicate: upgrades of old Stable cannot erase Unstable.
  await stable.evaluate(async()=>{const keys=await caches.keys(),current=keys.find(k=>k.startsWith('setka-'));await Promise.all(keys.filter(k=>k.startsWith('setka-')&&k!==current).map(k=>caches.delete(k)));});
  assert.deepEqual(await stable.evaluate(()=>caches.keys()),keys);
  await context.setOffline(true);
  await stable.reload();await stable.locator('.now-panel').waitFor();
  await unstable.reload();await unstable.locator('.now-panel').waitFor();
  assert.equal(await unstable.title(),'Setka Unstable — тестовая версия');
  assert.equal(await stable.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')).tasks[0].title),'Stable channel sentinel');
  assert.equal(await unstable.evaluate(()=>JSON.parse(localStorage.getItem('setka.unstable.v1')).tasks[0].title),'Unstable channel sentinel');
  await context.setOffline(false);
  console.log('Same-origin Stable/Unstable: distinct manifests, workers, caches, personal data, notification ledger, offline reload; Stable remains 0.3.2.');
}finally{await context.close();await browser.close();}
