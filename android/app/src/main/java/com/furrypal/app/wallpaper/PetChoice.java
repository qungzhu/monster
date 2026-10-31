package com.furrypal.app.wallpaper;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Which pet the wallpaper shows. The app (PetWallpaperPlugin) stores the
 * adopted breed id; the models and names come from
 * assets/wallpaper/manifest.json.
 */
final class PetChoice {
    static final String PREFS = "pet_wallpaper";
    static final String KEY_BREED = "breedId";
    private static final String DEFAULT_BREED = "plush-himalayan";

    static final class Entry {
        final String id;
        final String file;
        final String petName;
        final double rotationY;

        Entry(JSONObject o) {
            id = o.optString("id");
            file = o.optString("file");
            petName = o.optString("petName");
            rotationY = o.optDouble("rotationY", 0);
        }
    }

    private PetChoice() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** True when there is a wallpaper model for this breed. */
    static boolean has(Context context, String breedId) {
        return find(context, breedId) != null;
    }

    /** The chosen pet, or the default one when the choice has no model. */
    static Entry current(Context context) {
        Entry e = find(context, prefs(context).getString(KEY_BREED, DEFAULT_BREED));
        return e != null ? e : find(context, DEFAULT_BREED);
    }

    private static Entry find(Context context, String breedId) {
        if (breedId == null) return null;
        try (InputStream in = context.getAssets().open("wallpaper/manifest.json")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            for (int n; (n = in.read(chunk)) > 0; ) bytes.write(chunk, 0, n);
            JSONArray list = new JSONArray(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
            for (int i = 0; i < list.length(); i++) {
                JSONObject o = list.getJSONObject(i);
                if (breedId.equals(o.optString("id"))) return new Entry(o);
            }
        } catch (Exception e) {
            Log.e("PetWallpaper", "cannot read wallpaper manifest", e);
        }
        return null;
    }
}
