package io.setka.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState){
    registerPlugin(SetkaExportPlugin.class);
    super.onCreate(savedInstanceState);
    androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
    getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
    if(android.os.Build.VERSION.SDK_INT>=29)getWindow().setNavigationBarContrastEnforced(false);
    androidx.core.view.WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView()).setAppearanceLightNavigationBars(true);
    androidx.core.view.WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView()).setAppearanceLightStatusBars(true);
    android.view.View root=(android.view.View)getBridge().getWebView().getParent();
    // Paint the app surface behind transparent OS buttons; controls still respect insets.
    root.setBackgroundColor(android.graphics.Color.rgb(245,244,238));
    androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root,(view,insets)->{
      androidx.core.graphics.Insets bars=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()|androidx.core.view.WindowInsetsCompat.Type.displayCutout());
      androidx.core.graphics.Insets keyboard=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime());
      view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom));
      return androidx.core.view.WindowInsetsCompat.CONSUMED;
    });
    androidx.core.view.ViewCompat.requestApplyInsets(root);
  }
}
