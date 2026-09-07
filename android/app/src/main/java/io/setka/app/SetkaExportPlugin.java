package io.setka.app;

import android.app.Activity;
import android.content.Intent;
import android.content.Context;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name="SetkaExport")
public class SetkaExportPlugin extends Plugin {
  @PluginMethod public void printWeek(PluginCall call) {
    getActivity().runOnUiThread(()->{
      android.print.PrintManager manager=(android.print.PrintManager)getContext().getSystemService(Context.PRINT_SERVICE);
      manager.print("Сетка — неделя",getBridge().getWebView().createPrintDocumentAdapter("Сетка — неделя"),
        new android.print.PrintAttributes.Builder().setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4.asLandscape()).build());
      call.resolve();
    });
  }
  @PluginMethod public void save(PluginCall call) {
    if(call.getString("text")==null){call.reject("Нет данных для экспорта");return;}
    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
    intent.putExtra(Intent.EXTRA_TITLE,call.getString("name","setka-backup.json"));
    startActivityForResult(call,intent,"saved");
  }
  @ActivityCallback private void saved(PluginCall call,ActivityResult result) {
    if(call==null)return;
    if(result.getResultCode()!=Activity.RESULT_OK){call.resolve();return;}
    if(result.getData()==null||result.getData().getData()==null){call.reject("Файл не выбран");return;}
    try(OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData())){
      if(out==null)throw new java.io.IOException("Не удалось открыть файл");
      out.write(call.getString("text","").getBytes(StandardCharsets.UTF_8));
      call.resolve(new JSObject().put("uri",result.getData().getData().toString()));
    }catch(Exception e){call.reject("Не удалось сохранить файл",e);}
  }
}
