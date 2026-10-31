import Capacitor
import Foundation
import UIKit
import WidgetKit

/// Bridge from the web app (src/native/petLockScreen.ts): makes the pet's
/// Live Photo for the lock screen, and feeds the widgets.
@objc(PetLockScreenPlugin)
public class PetLockScreenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PetLockScreenPlugin"
    public let jsName = "PetLockScreen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "beginLivePhoto", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addFrames", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishLivePhoto", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelLivePhoto", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidgetPet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openPhotos", returnType: CAPPluginReturnPromise),
    ]

    /// Calls arrive one at a time on this plugin's queue; the writer is
    /// only touched from there.
    private var writer: LivePhotoWriter?

    @objc func beginLivePhoto(_ call: CAPPluginCall) {
        writer?.cancel()
        writer = nil
        do {
            writer = try LivePhotoWriter(
                width: call.getInt("width") ?? 1080,
                height: call.getInt("height") ?? 1920,
                fps: call.getInt("fps") ?? 30,
                stillIndex: call.getInt("stillIndex") ?? 0)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func addFrames(_ call: CAPPluginCall) {
        guard let writer else { call.reject("还没有开始生成"); return }
        let frames = call.getArray("frames", String.self) ?? []
        do {
            for frame in frames {
                guard let data = Data(base64Encoded: frame) else { throw LivePhotoError.message("画面数据损坏") }
                try writer.append(jpeg: data)
            }
            call.resolve()
        } catch {
            writer.cancel()
            self.writer = nil
            call.reject(error.localizedDescription)
        }
    }

    @objc func finishLivePhoto(_ call: CAPPluginCall) {
        guard let writer else { call.reject("还没有开始生成"); return }
        self.writer = nil
        guard let still = call.getString("still").flatMap({ Data(base64Encoded: $0) }) else {
            writer.cancel()
            call.reject("缺少关键帧")
            return
        }
        writer.finish(still: still) { result in
            switch result {
            case .success: call.resolve(["saved": true])
            case .failure(let error): call.reject(error.localizedDescription)
            }
        }
    }

    @objc func cancelLivePhoto(_ call: CAPPluginCall) {
        writer?.cancel()
        writer = nil
        call.resolve()
    }

    @objc func setWidgetPet(_ call: CAPPluginCall) {
        PetWidgetStore.save(petName: call.getString("petName") ?? PetWidgetStore.petName,
                            intimacy: call.getInt("intimacy") ?? PetWidgetStore.intimacy)
        if let image = call.getString("image") {
            guard let data = Data(base64Encoded: image) else { call.reject("图片数据损坏"); return }
            do { try PetWidgetStore.save(image: data) } catch {
                call.reject("小组件图片保存失败：\(error.localizedDescription)")
                return
            }
        }
        WidgetCenter.shared.reloadTimelines(ofKind: PetWidgetStore.widgetKind)
        call.resolve()
    }

    @objc func openPhotos(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: "photos-redirect://") {
                UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }
}
