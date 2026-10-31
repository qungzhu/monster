package com.furrypal.app.wallpaper;

import android.app.WallpaperInfo;
import android.app.WallpaperManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge from the web app: tell the live wallpaper which pet to show, and
 * open the system screen that sets it as the wallpaper.
 */
@CapacitorPlugin(name = "PetWallpaper")
public class PetWallpaperPlugin extends Plugin {

    /** { breedId } -> remembers the pet; { supported, active } back. */
    @PluginMethod
    public void setPet(PluginCall call) {
        Context ctx = getContext();
        String breedId = call.getString("breedId");
        boolean supported = breedId != null && PetChoice.has(ctx, breedId);
        if (supported) PetChoice.prefs(ctx).edit().putString(PetChoice.KEY_BREED, breedId).apply();
        JSObject ret = new JSObject();
        ret.put("supported", supported);
        ret.put("active", isActive(ctx));
        call.resolve(ret);
    }

    /** { active }: whether our wallpaper is the current one. */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("active", isActive(getContext()));
        call.resolve(ret);
    }

    /** Opens the system preview with our wallpaper, ready to apply. */
    @PluginMethod
    public void open(PluginCall call) {
        Context ctx = getContext();
        Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
                .putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                        new ComponentName(ctx, PetWallpaperService.class))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            // Some launchers only offer the generic picker.
            try {
                ctx.startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (ActivityNotFoundException e2) {
                call.reject("此设备不支持动态壁纸");
                return;
            }
        }
        call.resolve();
    }

    private static boolean isActive(Context ctx) {
        WallpaperInfo info = WallpaperManager.getInstance(ctx).getWallpaperInfo();
        return info != null && info.getServiceName().equals(PetWallpaperService.class.getName());
    }
}
