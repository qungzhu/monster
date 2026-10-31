import AVFoundation
import Foundation
import ImageIO
import Photos
import UniformTypeIdentifiers

enum LivePhotoError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let m): return m }
    }
}

/// Builds a Live Photo from rendered frames: a QuickTime movie and a JPEG
/// still that share a content identifier, the pairing Photos looks for.
/// Frames arrive in batches from the web view (PetLockScreenPlugin), so the
/// movie is written as they come and never held in memory.
final class LivePhotoWriter {
    let identifier = UUID().uuidString
    private let directory: URL
    private let videoURL: URL
    private let stillURL: URL
    private let width: Int
    private let height: Int
    private let fps: Int32
    private let stillIndex: Int

    private let writer: AVAssetWriter
    private let videoInput: AVAssetWriterInput
    private let pixels: AVAssetWriterInputPixelBufferAdaptor
    private let metadataInput: AVAssetWriterInput
    private let metadata: AVAssetWriterInputMetadataAdaptor
    private var frameCount = 0
    private var stillMarked = false

    init(width: Int, height: Int, fps: Int, stillIndex: Int) throws {
        guard width > 0, height > 0, width % 2 == 0, height % 2 == 0, fps > 0 else {
            throw LivePhotoError.message("尺寸不对")
        }
        self.width = width
        self.height = height
        self.fps = Int32(fps)
        self.stillIndex = max(0, stillIndex)

        directory = FileManager.default.temporaryDirectory.appendingPathComponent("livephoto-\(identifier)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        videoURL = directory.appendingPathComponent("pet.mov")
        stillURL = directory.appendingPathComponent("pet.jpg")

        writer = try AVAssetWriter(outputURL: videoURL, fileType: .mov)

        // HEVC where the phone can encode it (tall 1080p frames are beyond
        // the common H.264 level); H.264 otherwise.
        var settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.hevc,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
        ]
        if !writer.canApply(outputSettings: settings, forMediaType: .video) {
            settings[AVVideoCodecKey] = AVVideoCodecType.h264
        }
        guard writer.canApply(outputSettings: settings, forMediaType: .video) else {
            throw LivePhotoError.message("这台设备无法编码这个尺寸的视频")
        }
        videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        videoInput.expectsMediaDataInRealTime = false
        pixels = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: videoInput, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
        ])
        writer.add(videoInput)

        // Timed metadata track marking which moment is the key photo.
        let spec: [String: Any] = [
            kCMMetadataFormatDescriptionMetadataSpecificationKey_Identifier as String: "mdta/com.apple.quicktime.still-image-time",
            kCMMetadataFormatDescriptionMetadataSpecificationKey_DataType as String: "com.apple.metadata.datatype.int8",
        ]
        var format: CMFormatDescription?
        CMMetadataFormatDescriptionCreateWithMetadataSpecifications(
            allocator: kCFAllocatorDefault,
            metadataType: kCMMetadataFormatType_Boxed,
            metadataSpecifications: [spec] as CFArray,
            formatDescriptionOut: &format)
        metadataInput = AVAssetWriterInput(mediaType: .metadata, outputSettings: nil, sourceFormatHint: format)
        metadataInput.expectsMediaDataInRealTime = false
        metadata = AVAssetWriterInputMetadataAdaptor(assetWriterInput: metadataInput)
        writer.add(metadataInput)

        writer.metadata = [
            Self.item("com.apple.quicktime.content.identifier", identifier as NSString, "com.apple.metadata.datatype.UTF-8"),
            // What the camera writes for Live Photos; the lock screen uses
            // these to decide whether a Live Photo may move as a wallpaper.
            Self.item("com.apple.quicktime.live-photo.auto", NSNumber(value: 1), "com.apple.metadata.datatype.int8"),
            Self.item("com.apple.quicktime.live-photo.vitality-score", NSNumber(value: Float(1)), "com.apple.metadata.datatype.float32"),
            Self.item("com.apple.quicktime.live-photo.vitality-scoring-version", NSNumber(value: Int64(4)), "com.apple.metadata.datatype.int64"),
        ]

        guard writer.startWriting() else {
            throw LivePhotoError.message(writer.error?.localizedDescription ?? "无法开始写视频")
        }
        writer.startSession(atSourceTime: .zero)
    }

    private static func item(_ key: String, _ value: NSCopying & NSObjectProtocol, _ type: String) -> AVMetadataItem {
        let item = AVMutableMetadataItem()
        item.keySpace = AVMetadataKeySpace(rawValue: "mdta")
        item.key = key as NSString
        item.value = value
        item.dataType = type
        return item
    }

    private func time(_ frame: Int) -> CMTime { CMTime(value: CMTimeValue(frame), timescale: fps) }

    private func wait(for input: AVAssetWriterInput) throws {
        let deadline = Date().addingTimeInterval(10)
        while !input.isReadyForMoreMediaData {
            if writer.status == .failed {
                throw LivePhotoError.message(writer.error?.localizedDescription ?? "写视频失败")
            }
            if Date() > deadline { throw LivePhotoError.message("写视频超时") }
            Thread.sleep(forTimeInterval: 0.005)
        }
    }

    /// The still-image-time marker, written once the video reaches it so
    /// the two tracks stay interleaved.
    private func markStill() throws {
        guard !stillMarked else { return }
        stillMarked = true
        let item = AVMutableMetadataItem()
        item.keySpace = AVMetadataKeySpace(rawValue: "mdta")
        item.key = "com.apple.quicktime.still-image-time" as NSString
        item.value = NSNumber(value: Int8(0))
        item.dataType = "com.apple.metadata.datatype.int8"
        let at = time(min(stillIndex, max(0, frameCount - 1)))
        try wait(for: metadataInput)
        guard metadata.append(AVTimedMetadataGroup(items: [item], timeRange: CMTimeRange(start: at, duration: time(1)))) else {
            throw LivePhotoError.message(writer.error?.localizedDescription ?? "写入关键帧标记失败")
        }
        metadataInput.markAsFinished()
    }

    func append(jpeg: Data) throws {
        guard let source = CGImageSourceCreateWithData(jpeg as CFData, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            throw LivePhotoError.message("画面数据损坏")
        }
        try wait(for: videoInput)
        guard let pool = pixels.pixelBufferPool else { throw LivePhotoError.message("视频缓冲不可用") }
        var buffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
        guard let buffer else { throw LivePhotoError.message("内存不足") }

        CVPixelBufferLockBaseAddress(buffer, [])
        let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpace(name: CGColorSpace.sRGB)!,
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
        context?.interpolationQuality = .high
        context?.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        CVPixelBufferUnlockBaseAddress(buffer, [])
        guard context != nil else { throw LivePhotoError.message("无法绘制画面") }

        guard pixels.append(buffer, withPresentationTime: time(frameCount)) else {
            throw LivePhotoError.message(writer.error?.localizedDescription ?? "写视频帧失败")
        }
        frameCount += 1
        if frameCount > stillIndex { try markStill() }
    }

    /// Closes the movie, writes the still and adds the pair to Photos.
    func finish(still: Data, completion: @escaping (Result<Void, Error>) -> Void) {
        do {
            guard frameCount > 0 else { throw LivePhotoError.message("没有画面") }
            try markStill()
            try writeStill(still)
        } catch {
            cancel()
            completion(.failure(error))
            return
        }
        videoInput.markAsFinished()
        writer.endSession(atSourceTime: time(frameCount))
        writer.finishWriting { [self] in
            guard writer.status == .completed else {
                let error = writer.error ?? LivePhotoError.message("视频没有写完")
                cleanUp()
                completion(.failure(error))
                return
            }
            saveToPhotos(completion: completion)
        }
    }

    func cancel() {
        if writer.status == .writing { writer.cancelWriting() }
        cleanUp()
    }

    private func cleanUp() {
        try? FileManager.default.removeItem(at: directory)
    }

    /// JPEG with the content identifier in the Apple maker note (key 17).
    private func writeStill(_ jpeg: Data) throws {
        guard let source = CGImageSourceCreateWithData(jpeg as CFData, nil),
              let destination = CGImageDestinationCreateWithURL(stillURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw LivePhotoError.message("关键帧数据损坏")
        }
        var properties = (CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]) ?? [:]
        properties[kCGImagePropertyMakerAppleDictionary] = ["17": identifier]
        CGImageDestinationAddImageFromSource(destination, source, 0, properties as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw LivePhotoError.message("无法保存关键帧") }
    }

    private func saveToPhotos(completion: @escaping (Result<Void, Error>) -> Void) {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { [self] status in
            guard status == .authorized || status == .limited else {
                cleanUp()
                completion(.failure(LivePhotoError.message("没有相册权限：请到「设置 → 毛茸伙伴 → 照片」里允许添加照片")))
                return
            }
            PHPhotoLibrary.shared().performChanges({ [self] in
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, fileURL: stillURL, options: nil)
                let options = PHAssetResourceCreationOptions()
                options.shouldMoveFile = true
                request.addResource(with: .pairedVideo, fileURL: videoURL, options: options)
            }) { [self] ok, error in
                cleanUp()
                if ok { completion(.success(())) } else { completion(.failure(error ?? LivePhotoError.message("保存到相册失败"))) }
            }
        }
    }
}
