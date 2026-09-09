import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
try{
  await page.clock.setFixedTime(new Date('2026-09-08T07:00:00Z'));
  await page.goto(process.env.TEST_URL||'http://localhost:4184/Setka/');
  await page.locator('#dialog[open]').waitFor();await page.locator('#dialog [data-action=close]').click();
  await page.getByRole('button',{name:'Выбрать расписание МФТИ'}).click();
  await page.locator('[data-source]').filter({hasText:'1 курс БВО'}).click();
  await page.locator('#import-form .sticky-button').click();await page.locator('#apply-import').click();
  await page.locator('#setup-form .primary').click();await page.locator('.timeline .event-card').first().waitFor();
  await page.locator('#toast.visible').waitFor({state:'hidden'});
  for(const width of [390,360,320]){
    await page.setViewportSize({width,height:width===320?640:844});await page.evaluate(()=>scrollTo(0,0));
    const heading=await page.locator('.today-heading h1').boundingBox(),start=await page.locator('.today-heading [data-study=start]').boundingBox();
    assert.ok(Math.abs(heading.y+heading.height/2-start.y-start.height/2)<12,'Study action belongs beside Today');
    const first=await page.locator('.timeline .event-card').first().boundingBox();
    await page.screenshot({path:`artifacts/mobile-today-${width}.png`});
    assert.ok(first.y+Math.min(first.height,80)<page.viewportSize().height-65,`First timetable entry visible without scrolling at ${width}: ${JSON.stringify(first)}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    await page.screenshot({path:`artifacts/mobile-today-${width}.png`});
  }
  await page.locator('.today-heading [data-study=start]').click();await page.locator('#study-start .primary').click();
  assert.equal(await page.locator('.today-heading [data-study-clock]').isVisible(),true);
  assert.equal(await page.locator('.today-heading [data-study=pause]').isVisible(),true);
  await page.screenshot({path:'artifacts/mobile-today-active.png'});
  const first=await page.locator('.timeline .event-card').first().boundingBox();assert.ok(first.y<575,`Active timer leaves timetable in the first screen: ${first.y}`);
  await page.setViewportSize({width:844,height:390});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('Mobile Today: integrated study action, compact now/next, first timetable entry visible at 320/360/390px, active timer controls and landscape overflow passed.');
}finally{await context.close();await browser.close();}
