# SWARM Wallet for Android

A wallet for **SwarmTestnet**, a private Zcash-derived proof-of-work **test**
network. It is a fork of [zingo-mobile](https://github.com/zingolabs/zingo-mobile)
(MIT) built on the project's fork of the Zingo SDK,
[privacy-zingolib](https://github.com/brs-holding/privacy-zingolib).

**SwarmTestnet coins have no value.** This is an engineering testnet. Nothing
here is a mainnet launch, an audit, or a reason to move real money.

Phones do not mine. Both app stores forbid on-device mining, so this is a
wallet only — mining happens on a PC with the SWARM Node app.

---

## What this app is

| | |
| --- | --- |
| Network | SwarmTestnet (`SwarmTestnet`), light-wallet chain label `swarm-testnet` |
| Ticker | **SWM** |
| Addresses | Standard Zcash **testnet** encodings: `utest…`, `ztestsapling…`, `tm…` |
| Wallet birthday | Height 1 |
| Upgrades | Everything through NU6.3 active from height 1 |
| Indexer | `https://lwd.swarm.green:443` (a lightwalletd-compatible Zaino), or your own |
| Explorer | `https://explore.swarm.green/` |
| Android package | `green.swarm.wallet` |

The app speaks **only** SwarmTestnet. There is no mainnet, no ZEC, no fiat
price, no currency picker, no donation toggle, no exchange or swap, and no
public server registry: the app never asks a third party which server to
trust.

---

## Installing the APK on a phone

The APK is **debug-signed**. That is deliberate — it is built for a private
test, no signing key exists in this repository or in CI, and nothing produced
here could be mistaken for a published build. Android will treat it as an app
from an unknown source, which is correct.

You need an Android **8.0 (API 26) or newer** phone with an `arm64-v8a` or
`armeabi-v7a` processor — that is every phone sold in the last decade.

1. **Get the APK.** Open the repository's
   [Actions tab](https://github.com/brs-holding/swarm-mobile/actions), pick the
   most recent successful **SWARM Android** run, and download the
   `swarm-wallet-android-<version>` artifact. It is a zip containing the APK,
   `SHA256SUMS` and `release-manifest.json`.

2. **Check the download.** Unzip it, then verify the APK is the file CI built:

   ```sh
   sha256sum -c SHA256SUMS
   ```

   Open `release-manifest.json` and confirm `network.genesis` is
   `045993f5c91ea160c7ebda573dd97b0016816bca68d395bfff202779b88e2a28` and
   `network.genesis_is_placeholder` is `false`. If it is `true`, that build
   cannot verify which chain a server is on — see "The genesis gate" below.

3. **Move the APK to the phone** — USB cable, or upload it somewhere you
   control and download it on the device. Do not pass it through a chat app
   that re-compresses attachments.

4. **Allow this one installer.** Android blocks sideloading per-app, not
   globally. Open the APK from your file manager or browser; Android will say
   the app is not allowed to install unknown apps and offer a Settings
   shortcut. Enable **Install unknown apps** for *that* app (Files, Chrome,
   whichever you opened it from), then go back and tap Install.

   The manual route is **Settings → Apps → Special app access → Install unknown
   apps**, then pick the app you are installing from. Wording varies by
   manufacturer.

5. **Turn it back off** when you are done. It is a per-app permission; leaving
   it on for a browser is a standing risk for no benefit.

6. **Open "SWARM Wallet".** It installs alongside Zingo without touching it:
   the package name is different, so Android gives it its own private storage.
   A Zingo wallet on the same phone is not read, not migrated and not at risk.

To remove it: uninstall like any app. **Uninstalling deletes the wallet.** Back
up your seed phrase first — it is the only way back in.

---

## What works, and what is not proven

Be precise about this, because a testnet wallet that overstates itself is worse
than no wallet.

### Proven

- The app builds end to end in CI: JS lint, typecheck and unit tests; the Rust
  wallet library cross-compiled for `arm64-v8a`, `armeabi-v7a` and `x86_64`;
  Kotlin UniFFI bindings; a debug-signed APK.
- The APK installs on an Android emulator, launches, loads the native wallet
  library, runs its JS bundle and reaches its first screen without crashing.
  This is asserted by `scripts/swarm_smoke_test.sh` on every CI run.
- The app is pinned to the SWARM SDK, not upstream's. CI fails the build if the
  pin points back at `zingolabs/zingolib`.

### Not proven

- **Nothing on a real chain.** At the time of writing the indexer at
  `lwd.swarm.green` is not live, so no sync, no balance, no send and no receive
  has ever been exercised against SwarmTestnet from this app. The only network
  behaviour that has been exercised is the failure path.
- **Nothing on real hardware.** The emulator smoke test runs on x86_64. The
  `arm64-v8a` and `armeabi-v7a` libraries are built and packaged but have not
  been executed on a phone.
- **Seed backup, restore and biometric unlock** are upstream's, unmodified, and
  have not been re-verified against this build.
- **The Nym mixnet transport** is inherited from upstream and is off by
  default. It has not been exercised against SwarmTestnet.
- Screens inherited from upstream that have no meaning on this network yet
  (migration flows, address book chains) are present but untested here.

---

## The genesis gate

SwarmTestnet's genesis hash lives in exactly **one** constant in the SDK,
`SWARM_TESTNET_GENESIS` in `zingolib/src/config.rs`. It now holds the real
hash:

```
045993f5c91ea160c7ebda573dd97b0016816bca68d395bfff202779b88e2a28
```

which is the value in `network/swarm-testnet/manifest.json`. An earlier
candidate, `06b0b56c…`, was superseded because its header timestamp was in the
future, and is not used by any build here.

That constant is what lets the app **prove** a server is on SwarmTestnet: the
SDK asks the indexer for its chain label and its genesis block, and refuses a
server that answers with anything else. A wallet opened against the wrong
chain is how coins get lost, so this is a refusal, not a warning.

The gate that guarded the placeholder is still in place.
`SWARM_TESTNET_GENESIS_PLACEHOLDER` and
`swarm_testnet_genesis_is_placeholder()` remain in the SDK, and the app
reports their answer rather than assuming it — see `swarm_network_identity()`
in `rust/lib/src/lib.rs`, which is covered by tests. If a future build ever
ships with the stand-in again, it will say so.

Every build records what it was made with, in `release-manifest.json`:

```json
"network": {
  "genesis": "045993f5c91ea160c7ebda573dd97b0016816bca68d395bfff202779b88e2a28",
  "genesis_is_placeholder": false
}
```

read out of the SDK revision the APK was actually built against, so the
manifest cannot drift from the binary.

---

## When something goes wrong

The app fails with one plain sentence rather than a stack trace:

- **The server cannot be reached.** Expected right now — the indexer is not
  live. Check the server address in Settings; the default is
  `https://lwd.swarm.green:443`.
- **The server is on a different chain.** The app refuses it. A server that
  does not report `swarm-testnet` is not a SwarmTestnet server, and opening a
  wallet against the wrong chain is how coins get lost.
- **The explorer does not open.** `explore.swarm.green` is not live yet. The
  app checks before opening a link and reports it instead of throwing.

---

## Building it yourself

CI is the supported path — it is reproducible and needs nothing installed. The
workflow is `.github/workflows/swarm-android.yaml`; push to the `swarm-mobile`
branch or run it from the Actions tab.

To build locally you need Linux or macOS with Docker, Node 22.18.0, Yarn and
JDK 17. A Windows host can run the JS checks but not the native build.

```sh
git clone https://github.com/brs-holding/swarm-mobile
cd swarm-mobile
git checkout swarm-mobile
yarn install --frozen-lockfile

# JS checks
yarn lint:check && yarn typecheck && yarn test

# Native wallet library for all ABIs, via Docker (upstream's script)
yarn rust:android

# Debug-signed APK
cd android && ./gradlew assembleProdRelease
```

The APK lands in `android/app/build/outputs/apk/prod/release/`.

`yarn rust:android` builds all four of upstream's ABIs. CI builds three — it
drops 32-bit x86, which no current phone or emulator image needs.

### Where the SDK comes from

`rust/Cargo.toml` pins three crates to
`brs-holding/privacy-zingolib`. That fork carries the SwarmTestnet identity and
nothing else — chain type, chain label, birthday, the indexer identity check,
and a distinct wallet-file chain tag so a wallet from another chain cannot be
opened against the wrong genesis. Key derivation, signing, proving, note
scanning, address encoding and transaction building are upstream's, untouched.

To move the pin, change the `rev` in `rust/Cargo.toml` and the eight matching
`source =` lines in `rust/Cargo.lock`.

---

## Licence and attribution

Upstream zingo-mobile is MIT, and this fork keeps that licence and its
copyright notices — see `LICENSE`. The bundled fonts (Sora, Manrope, JetBrains
Mono) are SIL Open Font Licence 1.1; their licence files ship with them.

Official SWARM channels: <https://swarm.green>,
<https://github.com/brs-holding>, [@swarm_coin](https://x.com/swarm_coin),
`swarmofficial@atomicmail.io`. The app links to these and to nothing else.
