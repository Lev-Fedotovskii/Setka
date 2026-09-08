import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'}),page=await context.newPage();
 await page.goto(process.env.TEST_URL||'http://localhost:4175/Setka/');await page.locator('#dialog [data-action=close]').click();
 await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{};screen.orientation.lock=async()=>{};});
 await page.locator('.mobile-nav [data-nav=more]').click();await page.locator('main #xlsx-file').setInputFiles('fixtures/mipt/File.xlsx');await page.locator('#import-form .sticky-button').click();await page.locator('#apply-import').click();await page.locator('#setup-form .primary').click();
 await page.locator('.mobile-nav [data-nav=week]').click();assert.equal(await page.locator('#week-zoom').inputValue(),'0.65');
 for(let cycle=0;cycle<3;cycle++){
  await page.locator('[data-action=expand-week]').click();await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(()=>{const g=document.querySelector('.week-grid').getBoundingClientRect(),h=document.querySelector('.grid-scroll').getBoundingClientRect();return g.width<=h.width+1&&g.height<=h.height+1;});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(cycle===0){
   const before=Number(await page.locator('#expanded-week-zoom').inputValue());const box=await page.locator('.grid-scroll').boundingBox();
   const cdp=await context.newCDPSession(page),y=box.y+Math.min(130,box.height/2);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y,id:1},{x:200,y,id:2}]});
   for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120-i*8,y,id:1},{x:200+i*8,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.ok(Number(await page.locator('#expanded-week-zoom').inputValue())>before*1.5);assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  }
  await page.locator('#expanded-week-zoom').fill('1.5');await page.locator('#expanded-week-zoom').dispatchEvent('input');
  assert.equal(await page.locator('.week-grid').evaluate(e=>e.style.zoom),'1.5');
  await page.locator('[data-action=expand-week]').click();await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#week-zoom').inputValue(),'0.65');assert.equal(await page.locator('.week-grid').evaluate(e=>e.style.zoom),'0.65');
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await page.screenshot({path:'artifacts/032-collapsed.png'});await page.locator('[data-action=expand-week]').click();await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/032-fit.png'});
 await context.addInitScript(()=>{window.print=()=>{parent.__printedGrid=document.querySelectorAll('.grid-lesson').length;parent.__printBodyClass=document.body.className;dispatchEvent(new Event('afterprint'));};});
 await page.evaluate(()=>{window.__orientationRestored=0;screen.orientation.lock=async()=>{window.__orientationRestored++;};});
 await page.locator('[data-action=print-week]').click();await page.waitForFunction(()=>window.__orientationRestored>0);
 assert.ok(await page.evaluate(()=>window.__printedGrid>0));assert.equal(await page.evaluate(()=>window.__printBodyClass),'');
 console.log('PASS: repeated expansion/collapse restores 65%, initial grid fits both axes, real two-touch pinch changes only timetable zoom, continuous slider, no page zoom.');
}finally{await browser.close();}
