#!/usr/bin/env swift
//
//  flatten-png.swift
//  SWARM Wallet — iOS art pipeline
//
//  Redraws each PNG given on the command line into an OPAQUE bitmap and
//  writes it back in place. iOS app icons must not carry an alpha channel:
//  App Store Connect rejects an icon that does, and the asset-catalog
//  compiler warns about one. A renderer that draws an opaque background
//  still emits RGBA, so the channel is removed here rather than trusted to
//  the renderer.
//
//  Only Foundation, CoreGraphics and ImageIO — all in the OS. Nothing is
//  downloaded and no image content is changed: the pixels are composited
//  onto the colour they already show.
//
//  Usage: swift flatten-png.swift <file.png> [<file.png> ...]
//

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("flatten-png: \(message)\n".utf8))
    exit(1)
}

let paths = Array(CommandLine.arguments.dropFirst())
if paths.isEmpty { fail("no files given") }

for path in paths {
    let url = URL(fileURLWithPath: path)

    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fail("cannot read \(path)")
    }

    let width = image.width
    let height = image.height

    guard let space = CGColorSpace(name: CGColorSpace.sRGB),
          let context = CGContext(
              data: nil,
              width: width,
              height: height,
              bitsPerComponent: 8,
              bytesPerRow: 0,
              space: space,
              // noneSkipLast: 32 bits per pixel, the last one ignored.
              // The written PNG therefore has no alpha channel.
              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
          ) else {
        fail("cannot create an opaque context for \(path)")
    }

    // Everything the source did not cover becomes SWARM warm black
    // (#0A0908), which is the icon's own background, so nothing shifts.
    context.setFillColor(red: 10.0 / 255.0, green: 9.0 / 255.0, blue: 8.0 / 255.0, alpha: 1.0)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

    guard let flattened = context.makeImage() else { fail("cannot rasterise \(path)") }

    guard let destination = CGImageDestinationCreateWithURL(
        url as CFURL, UTType.png.identifier as CFString, 1, nil
    ) else {
        fail("cannot open \(path) for writing")
    }
    CGImageDestinationAddImage(destination, flattened, nil)
    if !CGImageDestinationFinalize(destination) { fail("cannot write \(path)") }

    print("flattened \(width)x\(height)  \(path)")
}
