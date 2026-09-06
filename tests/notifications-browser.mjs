import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEST_URL||'http://localhost:4175/Setka/';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try {
  const context=await browser.newContext();const page=await context.newPage();
  page.on('pageerror',e=>console.error('Page error:',e.message));
  await page.clock.install({time:new Date('2026-09-06T08:04:59Z')});
  await page.clock.pauseAt(new Date('2026-09-06T08:04:59Z'));
  await page.goto(base);await page.waitForSelector('.now-panel');
  assert.equal(await page.evaluate(()=>Notification.permission),'default');
  const cdp=await context.newCDPSession(page);
  await cdp.send('Browser.setPermission',{permission:{name:'notifications'},setting:'denied',origin:new URL(base).origin});
  await page.click('[data-nav=more]');await page.click('[data-action=notification-permission]');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')).notifications.enabled),false);
  await context.grantPermissions(['notifications']);
  await page.click('[data-action=notification-permission]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('setka.v1')).notifications.enabled);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')).notifications.enabled),true);
  await page.evaluate(async()=>{
    const {newState}=await import('./src/storage.js');const s=newState('2026-09-06');s.notifications.enabled=true;
    s.tasks=[{id:'notification-test',title:'Notification verification',estimatedMinutes:30,remainingMinutes:30,splittable:true,status:'todo',priority:3}];
    s.sessions=[{id:'test-session',taskId:'notification-test',date:'2026-09-06',start:670,end:700,status:'planned'}];
    localStorage.setItem('setka.v1',JSON.stringify(s));await navigator.serviceWorker.ready;
  });
  await page.reload();await page.waitForSelector('.now-panel');
  await page.waitForTimeout(300);await page.clock.runFor(2500);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('setka.notifications.delivered')||'[]').includes('session:test-session'));
  assert.equal(await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;const ns=await reg.getNotifications();const count=ns.filter(n=>n.tag==='session:test-session').length;ns.forEach(n=>n.close());return count;}),1);
  await page.reload();await page.waitForSelector('.now-panel');await page.clock.runFor(2000);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.notifications.delivered')).filter(k=>k==='session:test-session').length),1);
  console.log('Browser notification permission denial/grant, real service-worker display, and deduplication passed.');
} finally {await browser.close();}
