import Foundation

struct SavedWallet: Codable {
  let id: String
  let number: Int
}

struct WalletIndex: Codable {
  var active: String
  var wallets: [SavedWallet]
}

struct WalletSummary: Encodable {
  let id: String
  let number: Int
  let active: Bool
}

struct WalletSelection: Codable {
  let index: WalletIndex
  let create: Bool
}

final class WalletStore {
  let directory: URL
  let current: URL
  private let files = FileManager.default

  init(documents: URL) {
    directory = documents.appendingPathComponent("wallets", isDirectory: true)
    current = documents.appendingPathComponent("wallet.dat.txt")
  }

  private func write(_ bytes: Data, to destination: URL) throws {
    try bytes.write(to: destination, options: .atomic)
    var protected = destination
    var attributes = URLResourceValues()
    attributes.isExcludedFromBackup = true
    try protected.setResourceValues(attributes)
    #if os(iOS)
    try files.setAttributes(
      [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
      ofItemAtPath: destination.path
    )
    #endif
  }

  private func prepareDirectory() throws {
    try files.createDirectory(at: directory, withIntermediateDirectories: true)
    var protected = directory
    var attributes = URLResourceValues()
    attributes.isExcludedFromBackup = true
    try protected.setResourceValues(attributes)
  }

  private func archive(_ id: String) throws -> URL {
    guard UUID(uuidString: id) != nil else {
      throw CocoaError(.fileReadCorruptFile)
    }
    return directory.appendingPathComponent(id + ".wallet")
  }

  private func readIndex() throws -> WalletIndex {
    let path = directory.appendingPathComponent("index.json")
    if files.fileExists(atPath: path.path) {
      return try JSONDecoder().decode(WalletIndex.self, from: Data(contentsOf: path))
    }
    return WalletIndex(active: "", wallets: [])
  }

  private func saveIndex(_ index: WalletIndex) throws {
    try write(JSONEncoder().encode(index), to: directory.appendingPathComponent("index.json"))
  }

  func recover() throws {
    let journal = directory.appendingPathComponent("pending.json")
    guard files.fileExists(atPath: journal.path) else { return }
    let selection = try JSONDecoder().decode(WalletSelection.self, from: Data(contentsOf: journal))
    let index = selection.index
    let target = try archive(index.active)
    if !selection.create {
      try write(Data(contentsOf: target), to: current)
    } else if files.fileExists(atPath: current.path) {
      try files.removeItem(at: current)
    }
    try saveIndex(index)
    try files.removeItem(at: journal)
  }

  private func capture() throws -> WalletIndex {
    try prepareDirectory()
    try recover()
    var index = try readIndex()
    if files.fileExists(atPath: current.path) {
      if index.active.isEmpty {
        let wallet = SavedWallet(id: UUID().uuidString, number: (index.wallets.map(\.number).max() ?? 0) + 1)
        index.active = wallet.id
        index.wallets.append(wallet)
      }
      try write(Data(contentsOf: current), to: archive(index.active))
      try saveIndex(index)
    }
    return index
  }

  func list() throws -> [WalletSummary] {
    let index = try capture()
    return try index.wallets.compactMap { wallet in
      let exists = files.fileExists(atPath: try archive(wallet.id).path)
      guard exists else { return nil }
      return WalletSummary(id: wallet.id, number: wallet.number, active: wallet.id == index.active)
    }
  }

  func select(_ id: String) throws {
    var index = try capture()
    if id.isEmpty {
      let wallet = SavedWallet(id: UUID().uuidString, number: (index.wallets.map(\.number).max() ?? 0) + 1)
      index.active = wallet.id
      index.wallets.append(wallet)
    } else {
      guard index.wallets.contains(where: { $0.id == id }),
            files.fileExists(atPath: try archive(id).path) else {
        throw CocoaError(.fileNoSuchFile)
      }
      index.active = id
    }
    try write(JSONEncoder().encode(WalletSelection(index: index, create: id.isEmpty)), to: directory.appendingPathComponent("pending.json"))
    try recover()
  }

  func prepareNew() throws {
    try recover()
    if files.fileExists(atPath: current.path) {
      try select("")
    }
  }
}
