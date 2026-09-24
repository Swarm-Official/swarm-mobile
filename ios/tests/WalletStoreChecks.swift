import Foundation

@main
struct WalletStoreChecks {
  static func require(_ condition: Bool, _ message: String) throws {
    if !condition { throw NSError(domain: message, code: 1) }
  }

  static func main() throws {
    let files = FileManager.default
    let folder = files.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try files.createDirectory(at: folder, withIntermediateDirectories: true)
    defer { try? files.removeItem(at: folder) }
    let store = WalletStore(documents: folder)
    let first = Data("first wallet".utf8)
    let second = Data("second wallet".utf8)
    let third = Data("third wallet".utf8)
    try first.write(to: store.current)
    let original = try store.list()[0].id
    try store.select("")
    try require(!files.fileExists(atPath: store.current.path), "Tests that creation frees the active slot after preserving its wallet.")
    try second.write(to: store.current)
    let secondID = try store.list().first(where: { $0.active })!.id
    try store.select("")
    try third.write(to: store.current)
    try require(try store.list().count == 3, "Tests that a third wallet preserves both previous wallets.")
    try store.select(original)
    try require(try Data(contentsOf: store.current) == first, "Tests that switching restores the selected wallet.")
    let updated = Data("first wallet after sync".utf8)
    try updated.write(to: store.current)
    try store.select(secondID)
    try store.select(original)
    try require(try Data(contentsOf: store.current) == updated, "Tests that switching saves the latest wallet bytes.")

    var index = try JSONDecoder().decode(WalletIndex.self, from: Data(contentsOf: store.directory.appendingPathComponent("index.json")))
    index.active = secondID
    let pending = store.directory.appendingPathComponent("pending.json")
    try JSONEncoder().encode(WalletSelection(index: index, create: false)).write(to: pending)
    try WalletStore(documents: folder).recover()
    try require(try Data(contentsOf: store.current) == second, "Tests that startup completes an interrupted wallet selection.")
    try store.recover()
    try require(try Data(contentsOf: store.current) == second, "Tests that recovery preserves the wallet when repeated.")

    do {
      try store.select("../../wallet.dat.txt")
      throw NSError(domain: "Invalid selection accepted", code: 1)
    } catch let error as CocoaError {
      try require(error.code == .fileNoSuchFile, "Tests that selection rejects an unknown wallet.")
    }
    try require(try Data(contentsOf: store.current) == second, "Tests that an invalid selection preserves the current wallet.")

    try store.prepareNew()
    try store.prepareNew()
    try require(try store.list().count == 3, "Tests that retrying creation preserves all saved wallets.")
    try first.write(to: store.current)
    try require(try store.list().count == 4, "Tests that restoring into a new slot preserves the previous wallet.")
    try store.select(secondID)
    try require(try Data(contentsOf: store.current) == second, "Tests that a wallet remains available after restoration into another slot.")

    index.active = UUID().uuidString
    try JSONEncoder().encode(WalletSelection(index: index, create: false)).write(to: pending)
    do {
      try store.prepareNew()
      throw NSError(domain: "Missing archive accepted", code: 1)
    } catch is CocoaError {}
    try require(try Data(contentsOf: store.current) == second, "Tests that a missing archive preserves the current wallet during recovery.")
    print("Wallet storage checks passed")
  }
}
