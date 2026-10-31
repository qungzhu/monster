import SwiftUI
import UIKit
import WidgetKit

/// Lock-screen and home-screen widget: the adopted pet, its name and a line
/// that changes with the time of day. The picture and name come from the
/// app (PetWidgetStore, written by PetLockScreenPlugin).
struct PetEntry: TimelineEntry {
    let date: Date
    let petName: String
    let intimacy: Int
    let image: UIImage?

    var line: String { Self.line(at: date) }

    static func line(at date: Date) -> String {
        switch Calendar.current.component(.hour, from: date) {
        case 5..<9: return "早安，今天也一起加油"
        case 9..<12: return "记得喝水哦"
        case 12..<14: return "吃午饭了吗？"
        case 14..<18: return "有点困，陪我玩会儿"
        case 18..<22: return "今天辛苦啦"
        default: return "该睡觉啦，晚安"
        }
    }

    static func load(at date: Date = Date()) -> PetEntry {
        PetEntry(date: date,
                 petName: PetWidgetStore.petName,
                 intimacy: PetWidgetStore.intimacy,
                 image: PetWidgetStore.loadImage().flatMap(UIImage.init(data:)))
    }
}

struct PetProvider: TimelineProvider {
    func placeholder(in context: Context) -> PetEntry {
        PetEntry(date: Date(), petName: "毛茸伙伴", intimacy: 0, image: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PetEntry) -> Void) {
        completion(.load())
    }

    /// One entry per hour for the next 12 hours, so the line follows the
    /// day; the app reloads the timeline whenever the pet changes.
    func getTimeline(in context: Context, completion: @escaping (Timeline<PetEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar.current
        let hourStart = calendar.dateInterval(of: .hour, for: now)?.start ?? now
        let current = PetEntry.load(at: now)
        var entries = [current]
        for h in 1...12 {
            guard let date = calendar.date(byAdding: .hour, value: h, to: hourStart) else { continue }
            entries.append(PetEntry(date: date, petName: current.petName, intimacy: current.intimacy, image: current.image))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct PetPicture: View {
    let image: UIImage?

    var body: some View {
        if let image {
            Image(uiImage: image)
                .resizable()
                .interpolation(.high)
                .scaledToFit()
        } else {
            Image(systemName: "pawprint.fill")
                .resizable()
                .scaledToFit()
                .padding(6)
        }
    }
}

struct PetWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PetEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            PetPicture(image: entry.image)
                .padding(3)
                .widgetBackground { AccessoryWidgetBackground() }
        case .accessoryRectangular:
            HStack(spacing: 6) {
                PetPicture(image: entry.image)
                    .frame(width: 46, height: 46)
                VStack(alignment: .leading, spacing: 1) {
                    Text(entry.petName)
                        .font(.headline)
                        .widgetAccentable()
                        .lineLimit(1)
                    Text(entry.line)
                        .font(.caption)
                        .lineLimit(2)
                }
                Spacer(minLength: 0)
            }
            .widgetBackground { Color.clear }
        case .accessoryInline:
            Text("🐾 \(entry.petName)：\(entry.line)")
                .widgetBackground { Color.clear }
        default:
            VStack(spacing: 2) {
                PetPicture(image: entry.image)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                Text(entry.petName)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(entry.line)
                    .font(.system(size: 11, design: .rounded))
                    .foregroundColor(.white.opacity(0.75))
                    .lineLimit(1)
            }
            .widgetBackground {
                LinearGradient(colors: [Color(red: 0.11, green: 0.20, blue: 0.39), Color(red: 0.04, green: 0.08, blue: 0.19)],
                               startPoint: .top, endPoint: .bottom)
            }
        }
    }
}

extension View {
    /// iOS 17 wants widget backgrounds declared as container backgrounds.
    @ViewBuilder
    func widgetBackground<B: View>(@ViewBuilder _ background: () -> B) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget, content: background)
        } else {
            self.background(background())
        }
    }
}

struct PetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: PetWidgetStore.widgetKind, provider: PetProvider()) { entry in
            PetWidgetView(entry: entry)
        }
        .configurationDisplayName("毛茸伙伴")
        .description("让你的宠物待在锁屏和桌面上")
        .supportedFamilies([.accessoryRectangular, .accessoryCircular, .accessoryInline, .systemSmall])
    }
}

@main
struct PetWidgetBundle: WidgetBundle {
    var body: some Widget {
        PetWidget()
    }
}
