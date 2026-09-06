import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:4175/Setka/';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-09-06T08:00:00Z'));
  await page.goto(base);await page.locator('[data-action=add-task]').first().click();
  await page.locator('[name=title]').fill('Личная задача для всех источников');await page.getByRole('button',{name:'Добавить задачу',exact:true}).click();
  const sources=await page.evaluate(async()=> (await(await fetch('./data/catalog.json')).json()).sources);
  assert.equal(sources.length,8);
  const apply=async()=>{await page.locator('#dialog').getByRole('button',{name:'Просмотреть изменения',exact:true}).click();await page.locator('#apply-import').click();};
  const open=async id=>{await page.locator('.sidebar [data-nav=more]').click();await page.locator('[data-action=catalog]').click();await page.locator(`[data-source="${id}"]`).click();await page.waitForSelector('#import-form');};
  for(const source of sources){
    await open(source.id);await apply();
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')));
    assert.equal(state.schedule.importMeta.source.id,source.id);assert.ok(state.schedule.series.length>0);
    assert.ok(state.tasks.some(t=>t.title==='Личная задача для всех источников'));
    await page.locator('.sidebar [data-nav=week]').click();await page.waitForSelector('.week-grid');
    if(source.school==='ФАКТ')assert.match(await page.locator('.grid-slot').nth(1).innerText(),/10:45/);
    console.log(`Imported ${source.label}: ${state.schedule.series.length} selected records, ${state.schedule.importMeta.unresolved.length} review notes.`);
  }
  // Actual local XLS picker, followed by source association and a same-URL content update.
  await page.locator('.sidebar [data-nav=more]').click();
  await page.locator('#xlsx-file').setInputFiles('fixtures/mipt/xls/mipt-70716429b751b00e.xls');await apply();
  await open('mipt-70716429b751b00e');await apply();
  const changed=await page.evaluate(async()=>{
    const catalog=await(await fetch('./data/catalog.json')).json(),s=catalog.sources.find(s=>s.id==='mipt-70716429b751b00e');
    const bytes=new Uint8Array(await(await fetch('./'+s.path)).arrayBuffer());
    const text='Радиотехнические цепи и сигналы',needle=Array.from(text).flatMap(c=>[c.charCodeAt(0)&255,c.charCodeAt(0)>>8]);
    let at=-1;for(let i=0;i<bytes.length-needle.length;i++){if(needle.every((b,j)=>bytes[i+j]===b)){at=i;break;}}
    if(at<0)throw Error('Expected real XLS regression text missing');bytes[at]=0x40; // Р → р, same BIFF string length.
    s.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');s.path='data/workbooks/test-legacy-update.xls';
    return {catalog,bytes:Array.from(bytes),hash:s.sha256};
  });
  await page.route('**/data/catalog.json',r=>r.fulfill({json:changed.catalog}));
  await page.route('**/data/workbooks/test-legacy-update.xls',r=>r.fulfill({body:Buffer.from(changed.bytes),contentType:'application/vnd.ms-excel'}));
  await page.locator('.sidebar [data-nav=more]').click();await page.locator('[data-action=check-source]').click();
  await page.locator('[data-action=review-update]').click();await apply();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')));
  assert.equal(after.schedule.importMeta.hash,changed.hash);assert.ok(after.tasks.some(t=>t.title==='Личная задача для всех источников'));
  assert.deepEqual(errors,[]);console.log('All eight sources, local XLS import, source update/review and personal-data preservation passed.');
}finally{await browser.close();}
