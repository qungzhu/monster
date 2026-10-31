package com.furrypal.app.wallpaper;

import android.content.SharedPreferences;
import android.opengl.Matrix;
import android.os.SystemClock;
import android.service.wallpaper.WallpaperService;
import android.util.Log;
import android.view.Choreographer;
import android.view.MotionEvent;
import android.view.SurfaceHolder;

import com.google.android.filament.Camera;
import com.google.android.filament.Engine;
import com.google.android.filament.EntityManager;
import com.google.android.filament.Filament;
import com.google.android.filament.IndirectLight;
import com.google.android.filament.LightManager;
import com.google.android.filament.Renderer;
import com.google.android.filament.Scene;
import com.google.android.filament.Skybox;
import com.google.android.filament.SwapChain;
import com.google.android.filament.TransformManager;
import com.google.android.filament.View;
import com.google.android.filament.Viewport;
import com.google.android.filament.gltfio.AssetLoader;
import com.google.android.filament.gltfio.FilamentAsset;
import com.google.android.filament.gltfio.Gltfio;
import com.google.android.filament.gltfio.MaterialProvider;
import com.google.android.filament.gltfio.ResourceLoader;
import com.google.android.filament.gltfio.UbershaderProvider;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Live wallpaper: the adopted pet, in 3D, on the lock screen and home screen.
 *
 * Renders the breed's wallpaper model (assets/wallpaper/<id>.glb, built by
 * scripts/build-wallpaper-models.mjs) with Filament. The pet breathes, sways
 * and slowly looks around; a tap makes it hop. Home-screen paging turns it a
 * little (parallax). Draws at 30 fps and only while visible, to save battery.
 */
public class PetWallpaperService extends WallpaperService {
    static {
        Filament.init();
        Gltfio.init();
    }

    @Override
    public Engine onCreateEngine() {
        return new PetEngine();
    }

    private class PetEngine extends WallpaperService.Engine
            implements Choreographer.FrameCallback, SharedPreferences.OnSharedPreferenceChangeListener {
        private static final String TAG = "PetWallpaper";
        private static final long FRAME_NANOS = 1_000_000_000L / 30;
        // Night sky of the app's snow scene.
        private static final float[] BACKGROUND = {0.043f, 0.082f, 0.188f, 1f};

        private com.google.android.filament.Engine engine;
        private Renderer renderer;
        private Scene scene;
        private Skybox skybox;
        private View view;
        private Camera camera;
        private int cameraEntity;
        private int sun;
        private IndirectLight indirectLight;
        private SwapChain swapChain;
        private MaterialProvider materials;
        private AssetLoader assetLoader;
        private ResourceLoader resourceLoader;
        private FilamentAsset asset;

        private final float[] fitCenter = new float[3];
        private float fitScale = 1f;
        private float baseYaw = 0f;
        private float parallaxYaw = 0f;
        private long lastFrame = 0;
        private long hopStart = -1;
        private float hopTurn = 0f;
        private boolean visible = false;
        private String loadedId = null;

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            setTouchEventsEnabled(true);
            engine = com.google.android.filament.Engine.create();
            renderer = engine.createRenderer();
            scene = engine.createScene();
            skybox = new Skybox.Builder().color(BACKGROUND[0], BACKGROUND[1], BACKGROUND[2], BACKGROUND[3]).build(engine);
            scene.setSkybox(skybox);
            view = engine.createView();
            cameraEntity = EntityManager.get().create();
            camera = engine.createCamera(cameraEntity);
            view.setScene(scene);
            view.setCamera(camera);

            // Soft studio light: a warm key light plus a cool, even fill so the
            // plush reads soft from every side.
            sun = EntityManager.get().create();
            new LightManager.Builder(LightManager.Type.DIRECTIONAL)
                    .color(1f, 0.95f, 0.88f)
                    .intensity(90_000f)
                    .direction(0.35f, -1f, -0.65f)
                    .castShadows(false)
                    .build(engine, sun);
            scene.addEntity(sun);
            indirectLight = new IndirectLight.Builder()
                    .irradiance(1, new float[]{0.75f, 0.8f, 0.95f})
                    .intensity(38_000f)
                    .build(engine);
            scene.setIndirectLight(indirectLight);

            materials = new UbershaderProvider(engine);
            assetLoader = new AssetLoader(engine, materials, EntityManager.get());
            resourceLoader = new ResourceLoader(engine);

            PetChoice.prefs(getApplicationContext()).registerOnSharedPreferenceChangeListener(this);
            loadPet();
        }

        private void loadPet() {
            PetChoice.Entry pet = PetChoice.current(getApplicationContext());
            if (pet == null || pet.id.equals(loadedId)) return;
            ByteBuffer glb;
            try (InputStream in = getAssets().open("wallpaper/" + pet.file)) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] chunk = new byte[64 * 1024];
                for (int n; (n = in.read(chunk)) > 0; ) bytes.write(chunk, 0, n);
                byte[] data = bytes.toByteArray();
                glb = ByteBuffer.allocateDirect(data.length).order(ByteOrder.nativeOrder());
                glb.put(data).flip();
            } catch (Exception e) {
                Log.e(TAG, "cannot read model for " + pet.id, e);
                return;
            }
            FilamentAsset next = assetLoader.createAsset(glb);
            if (next == null) {
                Log.e(TAG, "cannot parse model for " + pet.id);
                return;
            }
            resourceLoader.loadResources(next);
            next.releaseSourceData();
            // Rigged models: put the skin in its bind pose.
            if (next.getInstance().getAnimator() != null) next.getInstance().getAnimator().updateBoneMatrices();
            unloadPet();
            asset = next;
            scene.addEntities(asset.getEntities());
            loadedId = pet.id;

            // Fit: feet on the ground at the origin, about one unit tall, and
            // narrow enough to stay inside a portrait screen while it turns.
            float[] center = asset.getBoundingBox().getCenter();
            float[] half = asset.getBoundingBox().getHalfExtent();
            fitCenter[0] = center[0];
            fitCenter[1] = center[1] - half[1];
            fitCenter[2] = center[2];
            fitScale = Math.min(0.95f / (2f * half[1]), 0.95f / (2f * Math.max(half[0], half[2])));
            baseYaw = (float) Math.toDegrees(pet.rotationY) + 25f;
        }

        private void unloadPet() {
            if (asset == null) return;
            scene.removeEntities(asset.getEntities());
            assetLoader.destroyAsset(asset);
            asset = null;
            loadedId = null;
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences prefs, String key) {
            loadPet();
        }

        @Override
        public void onSurfaceCreated(SurfaceHolder holder) {
            super.onSurfaceCreated(holder);
            swapChain = engine.createSwapChain(holder.getSurface());
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            view.setViewport(new Viewport(0, 0, width, height));
            // The pet sits in the lower half, under the lock-screen clock.
            camera.setProjection(40.0, (double) width / height, 0.1, 30.0, Camera.Fov.VERTICAL);
            camera.lookAt(0.0, 0.8, 3.4, 0.0, 0.95, 0.0, 0.0, 1.0, 0.0);
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            Choreographer.getInstance().removeFrameCallback(this);
            if (swapChain != null) {
                engine.destroySwapChain(swapChain);
                engine.flushAndWait();
                swapChain = null;
            }
            super.onSurfaceDestroyed(holder);
        }

        @Override
        public void onVisibilityChanged(boolean isVisible) {
            visible = isVisible;
            Choreographer.getInstance().removeFrameCallback(this);
            if (visible) {
                loadPet();
                Choreographer.getInstance().postFrameCallback(this);
            }
        }

        @Override
        public void onOffsetsChanged(float xOffset, float yOffset, float xStep, float yStep, int xPixels, int yPixels) {
            parallaxYaw = (xOffset - 0.5f) * 30f;
        }

        @Override
        public void onTouchEvent(MotionEvent event) {
            if (event.getAction() == MotionEvent.ACTION_UP && asset != null) {
                hopStart = SystemClock.elapsedRealtime();
                // Turn toward the side that was tapped.
                hopTurn = (event.getX() / Math.max(1, getSurfaceHolder().getSurfaceFrame().width()) - 0.5f) * 50f;
            }
        }

        @Override
        public void doFrame(long frameTimeNanos) {
            if (!visible) return;
            Choreographer.getInstance().postFrameCallback(this);
            if (frameTimeNanos - lastFrame < FRAME_NANOS || swapChain == null) return;
            lastFrame = frameTimeNanos;
            if (asset != null) animate();
            if (renderer.beginFrame(swapChain, frameTimeNanos)) {
                renderer.render(view);
                renderer.endFrame();
            }
        }

        /** Idle life: breathing, a slow look around, and the tap hop. */
        private void animate() {
            double t = SystemClock.elapsedRealtime() / 1000.0;
            float breath = 1f + 0.018f * (float) Math.sin(t * 2 * Math.PI / 3.6);
            float yaw = baseYaw + parallaxYaw + 14f * (float) Math.sin(t * 2 * Math.PI / 11.0);
            float lift = 0f;
            if (hopStart >= 0) {
                float p = (SystemClock.elapsedRealtime() - hopStart) / 650f;
                if (p >= 1f) {
                    hopStart = -1;
                } else {
                    lift = 0.16f * (float) Math.sin(Math.PI * p);
                    yaw += hopTurn * (float) Math.sin(Math.PI * p);
                }
            }
            float[] m = new float[16];
            Matrix.setIdentityM(m, 0);
            Matrix.translateM(m, 0, 0f, lift, 0f);
            Matrix.rotateM(m, 0, yaw, 0f, 1f, 0f);
            Matrix.scaleM(m, 0, fitScale / (float) Math.sqrt(breath), fitScale * breath, fitScale / (float) Math.sqrt(breath));
            Matrix.translateM(m, 0, -fitCenter[0], -fitCenter[1], -fitCenter[2]);
            TransformManager tm = engine.getTransformManager();
            tm.setTransform(tm.getInstance(asset.getRoot()), m);
        }

        @Override
        public void onDestroy() {
            Choreographer.getInstance().removeFrameCallback(this);
            PetChoice.prefs(getApplicationContext()).unregisterOnSharedPreferenceChangeListener(this);
            unloadPet();
            resourceLoader.destroy();
            assetLoader.destroy();
            materials.destroyMaterials();
            materials.destroy();
            engine.destroyIndirectLight(indirectLight);
            engine.destroySkybox(skybox);
            engine.destroyEntity(sun);
            engine.destroyCameraComponent(cameraEntity);
            EntityManager.get().destroy(cameraEntity);
            engine.destroyView(view);
            engine.destroyScene(scene);
            engine.destroyRenderer(renderer);
            if (swapChain != null) engine.destroySwapChain(swapChain);
            engine.destroy();
            super.onDestroy();
        }
    }
}
