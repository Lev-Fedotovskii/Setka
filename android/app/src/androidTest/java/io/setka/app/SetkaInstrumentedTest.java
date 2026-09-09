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
  @Test public void studyRecoveryAndStatusLifecycle() throws Exception {
    Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    shell("pm grant "+context.getPackageName()+" android.permission.POST_NOTIFICATIONS");
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      js(scenario,"document.querySelector('#dialog').close();document.querySelector('[data-nav=today]').click();document.querySelector('[data-study=start]').click()");
      until(scenario,"document.querySelector('#study-start')");
      js(scenario,"document.querySelector('#study-start [name=subject]').value='Native study';document.querySelector('#study-start').requestSubmit()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).activeStudy");
      shell("input keyevent KEYCODE_HOME");Thread.sleep(1500);
      js(scenario,"window.testReloadPending=true;location.reload()");until(scenario,"!window.testReloadPending&&document.querySelector('[data-study-clock]')");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).activeStudy.subject==='Native study'"));
      js(scenario,"document.querySelector('[data-study=finish]').click()");until(scenario,"document.querySelector('#study-finish')");
      js(scenario,"document.querySelector('#study-finish [name=minutes]').value='0.5';document.querySelector('#study-finish').requestSubmit()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).measurements.some(m=>m.subject==='Native study'&&m.measuredMs===30000)");
    }
    long now=System.currentTimeMillis();
    String entries="[{\"at\":"+(now-1000)+",\"show\":true,\"title\":\"Status before boot\",\"body\":\"Local transition test\"},{\"at\":"+(now+1500)+",\"show\":true,\"title\":\"Status after transition\",\"body\":\"Local transition test\"}]";
    SetkaStatusReceiver.prefs(context).edit().putBoolean("enabled",true).putBoolean("stopped",false).putLong("expiresAt",now+600000).putString("entries",entries).commit();
    SetkaStatusReceiver.refresh(context);
    NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
    awaitStatus(manager,true,null);
    Thread.sleep(1800);SetkaStatusReceiver.refresh(context);
    awaitStatus(manager,true,"Status after transition");
    new SetkaStatusReceiver().onReceive(context,new android.content.Intent(SetkaStatusReceiver.STOP));
    assertFalse(SetkaStatusReceiver.prefs(context).getBoolean("enabled",true));assertTrue(SetkaStatusReceiver.prefs(context).getBoolean("stopped",false));
    SetkaStatusReceiver.refresh(context);awaitStatus(manager,false,null);
    // Leave a fresh enabled plan for the following real emulator reboot test.
    SetkaStatusReceiver.prefs(context).edit().putBoolean("enabled",true).putBoolean("stopped",false).commit();SetkaStatusReceiver.refresh(context);
  }
  private void awaitStatus(NotificationManager manager,boolean present,String title) throws Exception {
    long end=System.currentTimeMillis()+15000;String actual="";
    while(System.currentTimeMillis()<end){
      boolean found=false;actual="";
      for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==SetkaStatusReceiver.ID){found=true;actual=n.getNotification().extras.getCharSequence("android.title","").toString();}
      if(found==present&&(!present||title==null||title.equals(actual)))return;
      Thread.sleep(250);
    }
    fail("Status publication timed out: present="+present+", expected title="+title+", actual="+actual);
  }
  @Test public void statusSurvivesReboot() throws Exception {
    Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    assertTrue(SetkaStatusReceiver.prefs(context).getBoolean("enabled",false));
    NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
    long end=System.currentTimeMillis()+30000;boolean shown=false;
    while(System.currentTimeMillis()<end){shown=java.util.Arrays.stream(manager.getActiveNotifications()).anyMatch(n->n.getId()==SetkaStatusReceiver.ID);if(shown)break;Thread.sleep(500);}
    assertTrue("Boot receiver should restore persisted status without opening the activity",shown);
    new SetkaStatusReceiver().onReceive(context,new android.content.Intent(SetkaStatusReceiver.STOP));
  }
  @Test public void unstableStartsIsolated() throws Exception {
    Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    assertEquals("io.setka.app.unstable",context.getPackageName());
    assertEquals("Setka Unstable",context.getApplicationInfo().loadLabel(context.getPackageManager()).toString());
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"!localStorage.getItem('setka.'+'v1')"));
      assertEquals("true",js(scenario,"!JSON.parse(localStorage.getItem('setka.v1')||'{\"tasks\":[]}').tasks.some(t=>t.title==='Stable upgrade sentinel')"));
    }
  }
  @Test public void seedPreviousStable() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      js(scenario,"document.querySelector('#dialog').close();document.querySelector('[data-action=add-task]').click();document.querySelector('#task-form [name=title]').value='Stable upgrade sentinel';document.querySelector('#task-form').requestSubmit()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).tasks.some(t=>t.title==='Stable upgrade sentinel')");
    }
  }
  @Test public void previousStableDataSurvives() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).tasks.some(t=>t.title==='Stable upgrade sentinel')"));
    }
  }
  private void screenshot(String name) throws Exception {
    java.io.File folder=new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"qa");folder.mkdirs();
    android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
    assertNotNull(bitmap);try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(folder,name+".png"))){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
  }
  @Test public void systemBarsAndMobileLayouts() throws Exception {
    try {
      for(String mode:new String[]{"gestural","threebutton"}){
        shell("cmd overlay enable-exclusive --category com.android.internal.systemui.navbar."+mode);
        shell("settings put system font_scale 1.3");
        shell("wm density "+(mode.equals("gestural")?"420":"320"));
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
          until(scenario,"document.querySelector('.now-panel')");
          scenario.onActivity(activity->{
            assertFalse(activity.getWindow().isNavigationBarContrastEnforced());
            android.view.View web=activity.getBridge().getWebView();int[] p=new int[2];web.getLocationInWindow(p);
            androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(web);assertNotNull(insets);
            assertTrue(p[1]>=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()).top);
            android.view.View root=(android.view.View)web.getParent();assertTrue(root.getPaddingBottom()>=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.navigationBars()).bottom);
          });
          screenshot(mode+"-welcome");js(scenario,"document.querySelector('#dialog').close();document.querySelector('[data-action=add-task]').click()");
          until(scenario,"document.querySelector('#task-form')");screenshot(mode+"-task");
          js(scenario,"document.querySelector('#task-form [name=title]').focus()");
          scenario.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.requestFocus();((android.view.inputmethod.InputMethodManager)a.getSystemService(Context.INPUT_METHOD_SERVICE)).showSoftInput(web,android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);});
          Thread.sleep(900);screenshot(mode+"-keyboard");
          scenario.onActivity(a->{android.view.View web=a.getBridge().getWebView();android.view.View root=(android.view.View)web.getParent();androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(web);assertTrue(root.getPaddingBottom()>=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom);});
          shell("input keyevent KEYCODE_BACK");
          assertEquals("true",js(scenario,"document.documentElement.scrollWidth<=innerWidth"));
          js(scenario,"document.querySelector('#dialog').close()");
          scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
          Thread.sleep(1200);until(scenario,"document.querySelector('.now-panel')");screenshot(mode+"-landscape");
          scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
        }
      }
      shell("input keyevent KEYCODE_HOME");Thread.sleep(700);shell("input swipe 300 1000 300 200 400");Thread.sleep(700);screenshot("launcher");
    } finally {shell("wm density reset");shell("settings put system font_scale 1.0");shell("cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.threebutton");}
  }
  private boolean clickSave(android.view.accessibility.AccessibilityNodeInfo node){
    if(node==null)return false;
    String text=node.getText()==null?"":node.getText().toString().trim();
    String description=node.getContentDescription()==null?"":node.getContentDescription().toString().trim();
    if(text.equalsIgnoreCase("Save")||text.equalsIgnoreCase("Сохранить")||description.equalsIgnoreCase("Save")){
      android.view.accessibility.AccessibilityNodeInfo target=node;
      for(int i=0;i<3&&target!=null;i++,target=target.getParent())if(target.isEnabled()&&target.isClickable())return target.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK);
    }
    for(int i=0;i<node.getChildCount();i++)if(clickSave(node.getChild(i)))return true;
    return false;
  }
  private String accessibilityTree(android.view.accessibility.AccessibilityNodeInfo node){
    if(node==null)return "<no accessibility root>";
    StringBuilder result=new StringBuilder("["+node.getPackageName()+":"+node.getViewIdResourceName()+" "+node.getText()+"]");
    for(int i=0;i<node.getChildCount();i++)result.append(accessibilityTree(node.getChild(i)));
    return result.toString();
  }
  private String js(ActivityScenario<MainActivity> scenario, String script) throws Exception {
    final String channelScript=InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName().contains(".unstable")?script.replace("setka.v1","setka.unstable.v1"):script;
    CountDownLatch latch=new CountDownLatch(1); AtomicReference<String> result=new AtomicReference<>();
    scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(channelScript,value->{result.set(value);latch.countDown();}));
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
  @Test public void retainedDataAfterReinstall() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).tasks.some(t=>t.title==='Android verification task')"));
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).sessions.length===1"));
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).settings.onboarded"));
    }
  }
  @Test public void localImportPlanningPersistenceAndBackgroundNotification() throws Exception {
    Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    String packageId=context.getPackageName();
    assertTrue(packageId.equals("io.setka.app")||packageId.equals("io.setka.app.release")||packageId.startsWith("io.setka.app.unstable"));
    shell("pm grant "+packageId+" android.permission.POST_NOTIFICATIONS");
    shell("appops set "+packageId+" SCHEDULE_EXACT_ALARM allow");
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      until(scenario,"document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"Capacitor.isNativePlatform()"));
      js(scenario,"document.querySelector('#dialog').close()");
      scenario.onActivity(activity->{
        android.view.View web=activity.getBridge().getWebView();
        androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(web);
        assertNotNull(insets);
        int[] position=new int[2];web.getLocationInWindow(position);
        assertTrue("WebView must start below status bar/cutout",position[1]>=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()|androidx.core.view.WindowInsetsCompat.Type.displayCutout()).top);
        android.view.View root=(android.view.View)web.getParent();
        androidx.core.view.ViewCompat.dispatchApplyWindowInsets(root,new androidx.core.view.WindowInsetsCompat.Builder().setInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()|androidx.core.view.WindowInsetsCompat.Type.displayCutout(),androidx.core.graphics.Insets.of(18,80,12,32)).build());
        assertEquals("Simulated cutout top",80,root.getPaddingTop());
        assertEquals("Landscape cutout left",18,root.getPaddingLeft());
        androidx.core.view.ViewCompat.requestApplyInsets(root);
      });
      js(scenario,"document.querySelector('[data-nav=more]').click()");
      // Exercise native WebView local workbook acquisition and the existing file-import UI.
      js(scenario,"(async()=>{try{const r=await fetch('./fixtures/mipt/File.xlsx');const dt=new DataTransfer();dt.items.add(new File([await r.blob()],'File.xlsx'));const input=document.querySelector('#xlsx-file');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){window.testError=String(e)}})()");
      until(scenario,"document.querySelector('#import-form')");
      js(scenario,"document.querySelector('#import-form button[type=submit],#import-form .sticky-button').click()");
      until(scenario,"document.querySelector('#apply-import')");js(scenario,"document.querySelector('#apply-import').click()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).schedule");
      until(scenario,"document.querySelector('#setup-form')");
      js(scenario,"document.querySelector('#setup-form').requestSubmit()");
      js(scenario,"document.querySelector('[data-nav=week]').click()");until(scenario,"document.querySelector('.week-grid')");
      String initialScale=js(scenario,"visualViewport.scale");
      for(int cycle=0;cycle<3;cycle++){
        js(scenario,"document.querySelector('[data-action=expand-week]').click()");until(scenario,"innerWidth>innerHeight&&document.querySelector('#expanded-week-zoom')");
        until(scenario,"(()=>{const g=document.querySelector('.week-grid').getBoundingClientRect(),h=document.querySelector('.grid-scroll').getBoundingClientRect();return g.width<=h.width+1&&g.height<=h.height+1})()");
        if(cycle==0)screenshot("expanded-week");
        js(scenario,"(()=>{const slider=document.querySelector('#expanded-week-zoom');slider.value='1.5';slider.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-action=expand-week]').click()})()");
        until(scenario,"!document.body.classList.contains('mobile-expanded')&&innerHeight>innerWidth");
        assertEquals("\"0.65\"",js(scenario,"document.querySelector('#week-zoom').value"));
        assertEquals(initialScale,js(scenario,"visualViewport.scale"));
      }
      js(scenario,"document.querySelector('[data-nav=tasks]').click();document.querySelector('[data-action=add-task]').click()");
      until(scenario,"document.querySelector('#task-form')");
      js(scenario,"document.querySelector('#task-form [name=title]').value='Android verification task';document.querySelector('#task-form').requestSubmit()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).tasks.some(t=>t.title==='Android verification task')");
      js(scenario,"document.querySelector('[data-action=manual-plan]').click()");until(scenario,"document.querySelector('#plan-form')");
      // Pick the next Sunday to get a deterministic available interval independent of test date.
      js(scenario,"(()=>{const d=new Date();d.setDate(d.getDate()+(7-d.getDay()||7));const f=document.querySelector('#plan-form');f.elements.date.value=d.toISOString().slice(0,10);f.elements.start.value='12:00';f.elements.duration.value='30';f.requestSubmit()})()");
      until(scenario,"JSON.parse(localStorage.getItem('setka.v1')).sessions.length===1");
      js(scenario,"window.testReloadPending=true;location.reload()");until(scenario,"!window.testReloadPending&&document.querySelector('.now-panel')");
      assertEquals("true",js(scenario,"JSON.parse(localStorage.getItem('setka.v1')).sessions.length===1"));
      // Use the real system document picker; never rely on WebView blob downloads.
      js(scenario,"Capacitor.Plugins.SetkaExport.save({name:'setka-native-verification.json',text:localStorage.getItem('setka.v1')}).then(result=>window.nativeExportSaved=result.uri).catch(e=>window.testError=String(e))");
      long saveDeadline=System.currentTimeMillis()+45000;boolean saved=false;
      while(System.currentTimeMillis()<saveDeadline){if("true".equals(js(scenario,"Boolean(window.nativeExportSaved)"))){saved=true;break;}clickSave(InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow());Thread.sleep(500);}
      assertTrue("Android save dialog must offer Save; JS error="+js(scenario,"window.testError")+"; UI="+accessibilityTree(InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow()),saved);
      until(scenario,"window.nativeExportSaved");
      String savedUri=(String)new org.json.JSONTokener(js(scenario,"window.nativeExportSaved")).nextValue();
      try(java.io.InputStream backup=context.getContentResolver().openInputStream(android.net.Uri.parse(savedUri))){
        assertNotNull(backup);
        org.json.JSONObject exported=new org.json.JSONObject(new String(backup.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));
        assertEquals(1,exported.getJSONArray("sessions").length());
        assertTrue(exported.getJSONArray("tasks").toString().contains("Android verification task"));
      }
      // Offline reload must use bundled Android assets, not any development server.
      shell("svc wifi disable");shell("svc data disable");
      js(scenario,"window.testReloadPending=true;location.reload()");until(scenario,"!window.testReloadPending&&document.querySelector('.now-panel')");
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
