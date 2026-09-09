package io.setka.app;
import android.app.AlertDialog;
import android.widget.LinearLayout;
import android.widget.NumberPicker;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="SetkaTime")
public class SetkaTimePlugin extends Plugin {
  @PluginMethod public void pick(PluginCall call){
    getActivity().runOnUiThread(()->{
      String value=call.getString("value","09:00");if(!value.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]"))value="09:00";
      NumberPicker hours=new NumberPicker(getContext()),minutes=new NumberPicker(getContext());
      hours.setMinValue(0);hours.setMaxValue(23);hours.setValue(Integer.parseInt(value.substring(0,2)));hours.setContentDescription("Часы");
      minutes.setMinValue(0);minutes.setMaxValue(59);minutes.setValue(Integer.parseInt(value.substring(3)));minutes.setContentDescription("Минуты");
      hours.setFormatter(n->String.format(java.util.Locale.ROOT,"%02d",n));minutes.setFormatter(n->String.format(java.util.Locale.ROOT,"%02d",n));
      LinearLayout row=new LinearLayout(getContext());row.setGravity(android.view.Gravity.CENTER);row.addView(hours);row.addView(minutes);
      new AlertDialog.Builder(getActivity()).setTitle("Время · 24 часа").setView(row).setPositiveButton("Выбрать",(d,w)->{hours.clearFocus();minutes.clearFocus();JSObject result=new JSObject();result.put("value",String.format(java.util.Locale.ROOT,"%02d:%02d",hours.getValue(),minutes.getValue()));call.resolve(result);}).setNegativeButton("Отмена",(d,w)->call.resolve(new JSObject())).setOnCancelListener(d->call.resolve(new JSObject())).show();
    });
  }
}
