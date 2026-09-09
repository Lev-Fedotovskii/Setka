import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'}),context=await browser.newContext({viewport:{width:1200,height:1000}}),page=await context.newPage();
try{
 const base=process.env.TEST_URL||'http://localhost:4184/Setka/';await page.goto(base);await page.locator('#dialog[open]').waitFor();await page.locator('#dialog [data-action=close]').click();await page.locator('[data-nav=more]').first().click();
 await page.locator('[data-individual=search]').click();await page.locator('#individual-search').waitFor({timeout:90000});await page.locator('#individual-search [name=query]').fill('анализ');await page.locator('#individual-search [name=kind]').selectOption('lecture');await page.locator('#individual-search .primary').click();
 await page.locator('[data-result]:not([disabled])').first().click();await page.locator('#individual-choice .primary').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.unstable.v1')));assert.equal(saved.personalSelections.length,1);assert.equal(saved.schedule,null);assert.equal(Object.values(saved.academicSources)[0].schedule.series.length,1);
 await page.locator('[data-individual=manage]').first().click();await page.locator('[data-edit-selection]').first().click();await page.locator('#individual-choice [name=subject]').fill('Мой математический анализ');await page.locator('#individual-choice .primary').click();await page.reload();await page.locator('#dialog [data-action=close]').click();await page.locator('[data-nav=more]').first().click();
 await page.locator('[data-individual=manage]').first().click();await page.locator('[data-toggle-selection]').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('setka.unstable.v1')));assert.equal(saved.personalSelections[0].subject,'Мой математический анализ');assert.equal(saved.personalSelections[0].disabled,true);assert.equal(saved.tasks.length,0);
 console.log('Cross-source subject/type/series search, explicit selection, subject correction, persistence and reversible cancellation passed.');
}finally{await context.close();await browser.close();}
