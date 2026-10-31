import Capacitor
import UIKit

/// The app's web view controller (Main.storyboard). Registers the plugins
/// that live in this app rather than in an npm package.
class FurryPalViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PetLockScreenPlugin())
    }
}
