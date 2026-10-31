import Foundation

/// What the widgets show, shared between the app and the widget extension
/// through the App Group container. The app writes it (PetLockScreenPlugin);
/// the widget only reads it.
enum PetWidgetStore {
    static let appGroup = "group.com.furrypal.app"
    static let widgetKind = "PetWidget"

    private static let nameKey = "petName"
    private static let intimacyKey = "intimacy"
    private static let imageFile = "pet.png"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    }

    static var imageURL: URL? { containerURL?.appendingPathComponent(imageFile) }

    static var petName: String { defaults?.string(forKey: nameKey) ?? "毛茸伙伴" }
    static var intimacy: Int { defaults?.integer(forKey: intimacyKey) ?? 0 }

    static func save(petName: String, intimacy: Int) {
        defaults?.set(petName, forKey: nameKey)
        defaults?.set(intimacy, forKey: intimacyKey)
    }

    static func save(image: Data) throws {
        guard let url = imageURL else { throw CocoaError(.fileNoSuchFile) }
        try image.write(to: url, options: .atomic)
    }

    static func loadImage() -> Data? {
        guard let url = imageURL else { return nil }
        return try? Data(contentsOf: url)
    }
}
