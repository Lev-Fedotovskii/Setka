package io.setka.app;

import static org.junit.Assert.*;
import android.app.NotificationManager;
import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs only in the isolated Android test application/device, never normal user storage. */
@RunWith(AndroidJUnit4.class)
public class SetkaInstrumentedTest {
  private String js(ActivityScenario<MainActivity> scenario, String script) throws Exception {
    CountDownLatch latch=new CountDownLatch(1); AtomicReference<String> result=new AtomicReference<>();
    scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(script,value->{result.set(value);latch.countDown();}));
    assertTrue("JavaScript evaluation timed out",latch.await(15,TimeUnit.SECONDS));return result.get();
  }
  private void until(ActivityScenario<MainActivity> scenario,String expression) throws Exception {
    long end=System.currentTimeMillis()+45000;
    while(System.currentTimeMillis()<end){if("true".equals(js(scenario,"Boolean("+expression+")")))return;Thread.sleep(250);}
    fail("Timed out: "+expression+"; error="+js(scenario,"window.testError")+"; page="+js(scenario,"document.body.innerText"));
  }
  private void shell(String command) throws Exception {
    try(java.io.InputStream stream=new android.os.ParcelFileDescriptor.AutoCloseInputStream(InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command))){stream.readAllBytes();}
  }
  @Test public void localImportPlanningPersistenceAndBackgroundNotification() throws Exception {
    Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    assertEquals("io.setka.app",context.getPackageName());
    shell("pm grant io.setka.app android.permission.POST_NOTIFICATIONS");
    shell("appops set io.setka.app SCHEDULE_EXACT_ALARM allow");
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"Capacitor.isNativePlatform()"));
      js(scenario,"document.querySelector('[data-nav=more]').click()");
      // Exercise native WebView local workbook acquisition and the existing file-import UI.
      js(scenario,"(async()=>{try{const r=await fetch('./fixtures/mipt/File.xlsx');const dt=new DataTransfer();dt.items.add(new File([await r.blob()],'File.xlsx'));const input=document.querySelector('#xlsx-file');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){window.testError=String(e)}})()");
      until(scenario,"document.querySelector('#import-form')");
      js(scenario,"document.querySelector('#import-form button[type=submit],#import-form .sticky-button').click()");
      until(scenario,"document.querySelector('#apply-import')");js(scenario,"document.querySelector('#apply-import').click()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).schedule");
      js(scenario,"document.querySelector('[data-nav=week]').click()");until(scenario,"document.querySelector('.week-grid')");
      js(scenario,"document.querySelector('[data-nav=tasks]').click();document.querySelector('[data-action=add-task]').click()");
      until(scenario,"document.querySelector('#task-form')");
      js(scenario,"document.querySelector('#task-form [name=title]').value='Android verification task';document.querySelector('#task-form').requestSubmit()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).tasks.some(t=>t.title==='Android verification task')");
      js(scenario,"document.querySelector('[data-action=manual-plan]').click()");until(scenario,"document.querySelector('#plan-form')");
      // Pick the next Sunday to get a deterministic available interval independent of test date.
      js(scenario,"(()=>{const d=new Date();d.setDate(d.getDate()+(7-d.getDay()||7));const f=document.querySelector('#plan-form');f.elements.date.value=d.toISOString().slice(0,10);f.elements.start.value='12:00';f.elements.duration.value='30';f.requestSubmit()})()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).sessions.length===1");
      js(scenario,"location.reload()");until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).sessions.length===1"));
      // Offline reload must use bundled Android assets, not any development server.
      shell("svc wifi disable");shell("svc data disable");
      js(scenario,"location.reload()");until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).tasks.some(t=>t.title==='Android verification task')"));
      shell("svc wifi enable");shell("svc data enable");
      js(scenario,"window.testNetworkPoll=setInterval(async()=>{try{const r=await fetch('https://lev-fedotovskii.github.io/Setka/data/catalog.json');window.testOnline=r.ok;if(r.ok)clearInterval(window.testNetworkPoll)}catch(e){window.testError=String(e)}},500)");
      until(scenario,"window.testOnline");
      js(scenario,"document.querySelector('[data-nav=more]').click();document.querySelector('[data-action=catalog]').click()");
      until(scenario,"document.querySelector('[data-source]')");
      js(scenario,"Array.from(document.querySelectorAll('[data-source]')).find(b=>b.innerText.includes('2 курс бакалавриата')).click()");
      until(scenario,"document.querySelector('#import-form')");
      js(scenario,"document.querySelector('#import-form').requestSubmit()");until(scenario,"document.querySelector('#apply-import')");
      js(scenario,"document.querySelector('#apply-import').click()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).schedule.importMeta.source");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).schedule.importMeta.workbook.endsWith('.xls')"));
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).sessions.length===1"));
      js(scenario,"document.querySelector('[data-nav=more]').click();document.querySelector('[data-action=check-source]').click()");
      until(scenario,"document.querySelector('.source-status').innerText.includes('Актуально')");
      js(scenario,"document.querySelector('[data-action=notification-permission]').click()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).notifications.enabled");
      js(scenario,"window.testPoll=setInterval(async()=>{window.testPending=(await Capacitor.Plugins.LocalNotifications.getPending()).notifications},200)");
      until(scenario,"window.testPending?.some(n=>n.extra?.signature?.includes('session:'))");
      js(scenario,"window.oldReminder=window.testPending.find(n=>n.extra?.signature?.includes('session:')).extra.signature;const f=document.querySelector('#notification-form');f.elements.sessionLead.value='9';f.requestSubmit()");
      until(scenario,"window.testPending?.some(n=>n.extra?.signature?.includes('session:')&&n.extra.signature!==window.oldReminder)");
      js(scenario,"clearInterval(window.testPoll)");
      js(scenario,"(async()=>{try{const n=Capacitor.Plugins.LocalNotifications;await n.createChannel({id:'setka-test',name:'Verification',importance:4});await n.schedule({notifications:[{id:999999,title:'Setka background verification',body:'Native AlarmManager delivery',channelId:'setka-test',schedule:{at:new Date(Date.now()+5000),allowWhileIdle:true,isExactNotification:true}}]});window.testScheduled=true;}catch(e){window.testError=String(e)}})()");
      until(scenario,"window.testScheduled");
      shell("input keyevent KEYCODE_HOME");
      NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
      long end=System.currentTimeMillis()+30000;boolean delivered=false;
      while(System.currentTimeMillis()<end){for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==999999)delivered=true;if(delivered)break;Thread.sleep(500);}
      assertTrue("Native notification must arrive while app is backgrounded",delivered);
      manager.cancel(999999);
    }
  }
}
