import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:4175/Setka/';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.clock.setFixedTime(new Date('2026-09-06T08:00:00Z'));
try{
  await page.goto(base);await page.locator('[data-action="catalog"]').click();
  await page.locator('[data-source]').filter({hasText:'1 курс БВО'}).click();
  await page.locator('#dialog').getByRole('button',{name:'Просмотреть изменения'}).click();await page.locator('#apply-import').click();await page.waitForTimeout(100);if(await page.locator('#setup-form').count())await page.locator('#setup-form .primary').click();
  await page.locator('[data-action="add-task"]').first().click();await page.locator('[name="title"]').fill('Личная задача при обновлении');await page.getByRole('button',{name:'Добавить задачу',exact:true}).click();
  const updated=await page.evaluate(async()=>{
    const catalog=await(await fetch('./data/catalog.json')).json(),source=catalog.sources.find(s=>s.program==='БВО'&&s.course===1);
    const bytes=await(await fetch('./'+source.path)).arrayBuffer(),zip=await JSZip.loadAsync(bytes);
    const xml=new DOMParser().parseFromString(await zip.file('xl/sharedStrings.xml').async('string'),'application/xml');
    const sheet=new DOMParser().parseFromString(await zip.file('xl/worksheets/sheet1.xml').async('string'),'application/xml');
    for(const ref of ['C10','C12','C14']){const c=Array.from(sheet.getElementsByTagNameNS('*','c')).find(c=>c.getAttribute('r')===ref);const index=Number(c.getElementsByTagNameNS('*','v')[0].textContent);const si=xml.getElementsByTagNameNS('*','si')[index];const ts=si.getElementsByTagNameNS('*','t');ts[ts.length-1].textContent+=' (новая аудитория)';}
    zip.file('xl/sharedStrings.xml',new XMLSerializer().serializeToString(xml));const buffer=await zip.generateAsync({type:'uint8array'});
    source.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');source.path='data/workbooks/test-update.xlsx';source.checkedAt=new Date().toISOString();
    return {catalog,bytes:Array.from(buffer)};
  });
  await page.route('**/data/catalog.json',route=>route.fulfill({json:updated.catalog}));
  await page.route('**/data/workbooks/test-update.xlsx',route=>route.fulfill({body:Buffer.from(updated.bytes),contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  await page.locator('.sidebar [data-nav="more"]').click();await page.locator('[data-action="check-source"]').click();
  await page.locator('[data-action="review-update"]').waitFor();assert.match(await page.locator('.source-status').innerText(),/3 изменений/);
  const oldHash=await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')).schedule.importMeta.hash);
  assert.notEqual(oldHash,updated.catalog.sources.find(s=>s.program==='БВО').sha256,'Detection must not auto-apply');
  await page.locator('[data-action="review-update"]').click();await page.locator('#dialog').getByRole('button',{name:'Просмотреть изменения'}).click();
  assert.equal(await page.locator('.diff-tag').count(),3);await page.locator('#apply-import').click();await page.waitForTimeout(100);if(await page.locator('#setup-form').count())await page.locator('#setup-form .primary').click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.v1')));assert.equal(state.tasks.filter(t=>t.title==='Личная задача при обновлении').length,1);
  assert.equal(state.schedule.importMeta.hash,updated.catalog.sources.find(s=>s.program==='БВО').sha256);
  assert.deepEqual(errors,[]);console.log('PASS: actual XLSX modified in three cells → 3 changes → explicit review/apply → personal task survives.');
}finally{await browser.close();}
