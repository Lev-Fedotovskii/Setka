package io.setka.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Transition alarms, not a polling service. Stored plans remain in the app sandbox. */
public class SetkaStatusReceiver extends BroadcastReceiver {
  static final int ID=2000000001,ALARM=2000000002;
  static final String CHANNEL="setka-now-next",STOP="io.setka.status.STOP";
  static SharedPreferences prefs(Context context){return context.getSharedPreferences("setka-status",Context.MODE_PRIVATE);}
  static PendingIntent alarm(Context c){return PendingIntent.getBroadcast(c,ALARM,new Intent(c,SetkaStatusReceiver.class).setAction("io.setka.status.TRANSITION"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
  @Override public void onReceive(Context context,Intent intent){
    if(STOP.equals(intent.getAction())){prefs(context).edit().putBoolean("enabled",false).putBoolean("stopped",true).commit();}
    refresh(context);
  }
  static void refresh(Context context){
    AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
    NotificationManager notifications=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
    alarms.cancel(alarm(context));
    SharedPreferences p=prefs(context);long now=System.currentTimeMillis(),expires=p.getLong("expiresAt",0);
    if(!p.getBoolean("enabled",false)||expires<=now){notifications.cancel(ID);return;}
    try{
      JSONArray entries=new JSONArray(p.getString("entries","[]"));JSONObject current=null;long next=expires;
      for(int i=0;i<entries.length();i++){JSONObject entry=entries.getJSONObject(i);long at=entry.getLong("at");if(at<=now)current=entry;else {next=Math.min(next,at);break;}}
      if(current!=null&&current.optBoolean("show")&&NotificationManagerCompat.from(context).areNotificationsEnabled()){
        if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel(CHANNEL,"Сейчас и дальше",NotificationManager.IMPORTANCE_LOW);channel.setSound(null,null);channel.enableVibration(false);notifications.createNotificationChannel(channel);}
        PendingIntent stop=PendingIntent.getBroadcast(context,ID,new Intent(context,SetkaStatusReceiver.class).setAction(STOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent launch=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent open=PendingIntent.getActivity(context,ID,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new NotificationCompat.Builder(context,CHANNEL).setSmallIcon(io.setka.app.R.drawable.ic_stat_setka).setContentTitle(current.optString("title")).setContentText(current.optString("body")).setStyle(new NotificationCompat.BigTextStyle().bigText(current.optString("body"))).setOnlyAlertOnce(true).setSilent(true).setOngoing(true).setContentIntent(open).setDeleteIntent(stop).addAction(0,"Остановить",stop).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build();
        try{notifications.notify(ID,n);}catch(SecurityException ignored){notifications.cancel(ID);}
      }else notifications.cancel(ID);
      // Exact permission is optional; Android may delay transitions in its absence.
      if(Build.VERSION.SDK_INT<31||alarms.canScheduleExactAlarms())alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,alarm(context));
      else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,alarm(context));
    }catch(Exception error){notifications.cancel(ID);}
  }
}
