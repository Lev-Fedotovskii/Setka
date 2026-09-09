import {Capacitor,registerPlugin} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {App} from '@capacitor/app';
import {storageKey} from '../channel.js';
import {statusPlan} from '../domain/status-plan.js';
const Status=registerPlugin('SetkaStatus');
let statusMessage='Статус «Сейчас и дальше» выключен';
export const nowNextStatus=()=>statusMessage;
export async function configureNowNext(state,enabled){
  if(!native)return;
  if(enabled&&await permission(true)!=='granted')throw Error('Разрешите уведомления Android.');
  const result=await Status.sync({enabled,explicit:true,...statusPlan(state)});
  state.notifications.nowNext=enabled;
  statusMessage=result.enabled?'Статус включён. Переходы могут задерживаться без точных будильников.':'Статус выключен';
}
import {notificationIntents,notificationDiff,notificationId} from '../domain/notifications.js';
export const native=Capacitor.isNativePlatform();
let queue=Promise.resolve(),timers=[],status='Уведомления выключены';
const deliveredKey=storageKey('notifications.delivered');
export const notificationStatus=()=>status;
export async function permission(request=false){
  if(native){const p=await(request?LocalNotifications.requestPermissions():LocalNotifications.checkPermissions());return p.display;}
  if(!('Notification' in globalThis)||!('serviceWorker' in navigator))return 'unsupported';
  return request?Notification.requestPermission():Notification.permission;
}
export async function exactSettings(){if(native)await LocalNotifications.changeExactNotificationSetting();}
export function onNativeResume(callback){if(native)App.addListener('appStateChange',({isActive})=>{if(isActive)callback();});}
export async function onNotificationAction(callback){if(native)await LocalNotifications.addListener('localNotificationActionPerformed',e=>callback(e.notification.extra));else navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='notification-open')callback(e.data);});}
export function syncNotifications(state){
  const snapshot=structuredClone(state);
  queue=queue.catch(()=>{}).then(()=>sync(snapshot)).catch(e=>{status='Не удалось обновить уведомления: '+e.message;});
  return queue;
}
async function sync(state){
  timers.forEach(clearTimeout);timers=[];
  const granted=await permission(),intents=notificationIntents(state,Date.now()-(native?0:1000));
  if(native){
    const result=await Status.sync({enabled:!!state.notifications.nowNext&&granted==='granted',...statusPlan(state)});
    statusMessage=result.stopped?'Статус остановлен вами. Для возврата нажмите «Включить статус».':result.enabled?'Статус включён; план обновлён на 30 дней. Без точных будильников переходы могут задерживаться.':'Статус выключен';
    const pending=(await LocalNotifications.getPending()).notifications;
    if(!state.notifications?.enabled||granted!=='granted'){
      if(pending.length)await LocalNotifications.cancel({notifications:pending.map(p=>({id:p.id}))});
      status=granted==='denied'?'Уведомления запрещены в настройках Android':'Уведомления выключены';return;
    }
    await LocalNotifications.createChannel({id:'setka-study',name:'Учёба и задачи',importance:4,visibility:0,vibration:true});
    const exact=(await LocalNotifications.checkExactNotificationSetting()).exact_alarm==='granted';
    const diff=notificationDiff(pending,intents);
    if(diff.cancel.length)await LocalNotifications.cancel({notifications:diff.cancel});
    if(diff.schedule.length)await LocalNotifications.schedule({notifications:diff.schedule.map(i=>({id:notificationId(i.key),title:i.title,body:i.body,channelId:'setka-study',smallIcon:'ic_stat_setka',schedule:{at:new Date(i.at),allowWhileIdle:true,isExactNotification:exact},extra:{signature:JSON.stringify(i),date:i.date,view:i.view}}))});
    status=`Android: ${intents.length} напоминаний на 30 дней. ${exact?'Точное время разрешено.':'Время приблизительное; можно разрешить точные напоминания.'}`;return;
  }
  if(!state.notifications?.enabled){status='Уведомления выключены';return;}
  if(granted!=='granted'){status=granted==='unsupported'?'Этот браузер не поддерживает уведомления.':'Разрешите уведомления в настройках браузера.';return;}
  status='Браузер: напоминания работают, пока приложение открыто. Закрытая PWA не может надёжно запускать таймеры.';
  let ledger=[];try{ledger=JSON.parse(localStorage.getItem(deliveredKey)||'[]');}catch{}
  const soon=intents.filter(i=>i.at-Date.now()<24*60*60000&&!ledger.includes(i.key));
  for(const i of soon)timers.push(setTimeout(async()=>{
    if(Date.now()-i.at>5*60000)return; // No stale bursts after a suspended tab wakes.
    const latest=JSON.parse(localStorage.getItem(deliveredKey)||'[]');if(latest.includes(i.key))return;
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(i.title,{body:i.body,tag:i.key,icon:new URL('./assets/icon-192.png',document.baseURI).href,data:{date:i.date,view:i.view}});
    localStorage.setItem(deliveredKey,JSON.stringify([...latest,i.key].slice(-1000)));
  },Math.max(0,i.at-Date.now())));
}
