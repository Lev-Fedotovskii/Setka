package io.setka.app;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="SetkaStatus")
public class SetkaStatusPlugin extends Plugin {
  @PluginMethod public void sync(PluginCall call){
    try{
      android.content.SharedPreferences prefs=SetkaStatusReceiver.prefs(getContext());
      boolean requested=call.getBoolean("enabled",false),explicit=call.getBoolean("explicit",false);
      android.content.SharedPreferences.Editor edit=prefs.edit();
      if(explicit)edit.putBoolean("stopped",false);
      boolean stopped=prefs.getBoolean("stopped",false)&&!explicit;
      edit.putBoolean("enabled",requested&&!stopped);
      edit.putString("entries",call.getArray("entries",new JSArray()).toString());
      edit.putLong("expiresAt",call.getLong("expiresAt",0L));edit.commit();
      SetkaStatusReceiver.refresh(getContext());
      JSObject result=new JSObject();result.put("enabled",requested&&!stopped);result.put("stopped",stopped);call.resolve(result);
    }catch(Exception e){call.reject("Не удалось обновить статус",e);}
  }
  @PluginMethod public void status(PluginCall call){
    JSObject result=new JSObject();result.put("enabled",SetkaStatusReceiver.prefs(getContext()).getBoolean("enabled",false));result.put("stopped",SetkaStatusReceiver.prefs(getContext()).getBoolean("stopped",false));call.resolve(result);
  }
}
