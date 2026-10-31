package com.furrypal.app;

import android.os.Bundle;

import com.furrypal.app.wallpaper.PetWallpaperPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PetWallpaperPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
