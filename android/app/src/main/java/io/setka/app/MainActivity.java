package io.setka.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState){
    registerPlugin(SetkaExportPlugin.class);
    super.onCreate(savedInstanceState);
    androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
    android.view.View root=(android.view.View)getBridge().getWebView().getParent();
    androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root,(view,insets)->{
      androidx.core.graphics.Insets bars=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()|androidx.core.view.WindowInsetsCompat.Type.displayCutout());
      androidx.core.graphics.Insets keyboard=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime());
      view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom));
      return androidx.core.view.WindowInsetsCompat.CONSUMED;
    });
    androidx.core.view.ViewCompat.requestApplyInsets(root);
  }
}
