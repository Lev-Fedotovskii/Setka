import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
const base=process.env.TEST_URL||'http://localhost:4184/Setka/';
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('setka.unstable.v1')));
async function nav(name){await page.locator(`[data-nav=${name}]:visible`).first().click();}
async function restore(state){await nav('more');await page.locator('#backup-file').setInputFiles({name:'legacy-test-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await page.locator('#restore-confirm').click();await nav('today');}
try{
  await page.clock.setFixedTime(new Date('2026-09-10T06:00:00Z'));
  await page.goto(base);await page.locator('#dialog[open]').waitFor();await page.locator('#dialog [data-action=close]').click();
  const empty=await read();
  await page.getByRole('button',{name:'Выбрать расписание МФТИ'}).click();await page.locator('[data-source]').filter({hasText:'1 курс БВО'}).click();
  await page.locator('#import-group').selectOption('Б06-603');
  assert.match(await page.locator('.import-record').filter({hasText:'CK55:CK57'}).innerText(),/16:15–18:30/);
  await page.locator('#import-form .sticky-button').click();await page.locator('#apply-import').click();await page.locator('#setup-form .primary').click();
  await page.locator('[data-action=add-task]').click();await page.locator('#task-form [name=title]').fill('Сохранить личную задачу');await page.locator('#task-form .sticky-button').click();
  const current=await read(),lesson=current.schedule.series.find(s=>s.id==='lesson-c48fa7a8');
  assert.equal(lesson.time.startsAt,'16:15');assert.equal(lesson.time.endsAt,'18:30');assert.ok(lesson.source.timingClarification);
  // Restore an explicit old-version backup in this disposable browser profile.
  const legacy=structuredClone(current),old=legacy.schedule.series.find(s=>s.id===lesson.id);old.time.startsAt='15:30';delete old.source.timingClarification;delete legacy.schedule.importMeta.clarificationsApplied;
  await restore(legacy);await page.locator('[data-action=review-timing]').click();assert.equal(await page.locator('#correction-form [name=start]').inputValue(),'16:15');
  assert.match(await page.locator('.correction-source').innerText(),/Гавва А.С.-706 КПМ/);await page.locator('#correction-form .primary').click();
  assert.equal((await read()).schedule.series.find(s=>s.id===lesson.id).time.startsAt,'16:15');
  await page.locator('.event-card').filter({hasText:'Введение в программирование'}).click();await page.locator('[data-action=undo-correction]').click();
  assert.equal((await read()).schedule.series.find(s=>s.id===lesson.id).time.startsAt,'15:30');
  await nav('more');await page.locator('[data-action=check-source]').click();await page.locator('[data-action=review-update]').click();
  await page.locator('#import-form .sticky-button').click();await page.locator('#apply-import').click();if(await page.locator('#setup-form').count())await page.locator('#setup-form .primary').click();
  const updated=await read();assert.equal(updated.schedule.series.find(s=>s.id===lesson.id).time.startsAt,'16:15');assert.equal(updated.schedule.importMeta.hash,current.schedule.importMeta.hash);assert.ok(updated.tasks.some(t=>t.title==='Сохранить личную задачу'));
  await restore(empty);
  for(const [start,end]of [['09:00','09:50'],['10:00','10:40'],['11:00','11:30']]){await page.locator('[data-action=add-event]').click();await page.locator('#event-form [name=title]').fill('Занятие '+start);await page.locator('#event-form [name=start]').fill(start);await page.locator('#event-form [name=end]').fill(end);await page.locator('#event-form .primary').click();}
  async function minimum(value){await nav('more');await page.locator('#bounds-form [name=start]').fill('09:00');await page.locator('#bounds-form [name=end]').fill('12:00');await page.locator('#bounds-form [name=minimum]').fill(String(value));await page.locator('#bounds-form button[type=submit]').click();await nav('today');}
  for(const [min,count]of [[20,2],[30,1],[10,3]]){await minimum(min);assert.equal(await page.locator('.free-card').count(),count);assert.equal(await page.locator('.event-card.personal').count(),3);assert.doesNotMatch(await page.locator('main').innerText(),/Рекомендации здесь выключены/);}
  await page.locator('[data-action=exclude-window][data-start="640"]').click();await page.locator('#recommendation-exclusion [name=weekly]').check();await page.locator('#recommendation-exclusion .primary').click();assert.equal(await page.locator('.free-card').count(),2);
  await page.locator('[data-action=add-task]').click();await page.locator('#task-form [name=title]').fill('Короткий план');await page.locator('#task-form [name=minutes]').fill('10');await page.locator('#task-form .sticky-button').click();
  await nav('tasks');await page.locator('[data-action=manual-plan]').click();await page.locator('#plan-form [name=start]').fill('10:40');await page.locator('#plan-form .primary').click();await minimum(30);
  assert.equal(await page.locator('.event-card.work').count(),1,'Scheduled work remains visible inside an excluded gap');assert.equal((await read()).sessions.length,1);
  await page.screenshot({path:'artifacts/feedback-gaps-mobile.png',fullPage:true});
  console.log('Real B06-603 workbook 16:15 evidence, legacy review/undo/same-hash update, personal task preservation; 10/20/30 minute gaps, weekly exclusion and retained manual plan passed.');
}finally{await context.close();await browser.close();}
