# SWARM Wallet on iOS

Status of this document: written by the iOS build agent on 2026-09-21,
extended on 2026-09-22 with the upload-readiness work (section 9).
Everything under "Proven" was executed in GitHub Actions and has a run URL.
Everything else is described, not done.

> **The iOS deliverable today is a SIMULATOR build.**
> There is no Apple Developer Program account for this project, so no build
> can be signed, no build can be installed on a physical iPhone, and no
> build can go to TestFlight or the App Store. The workflow proves the app
> compiles and runs; it stops exactly there, on purpose.

---

## 1. What exists

| Thing | Where |
| --- | --- |
| Workflow | `.github/workflows/swarm-ios.yml`, branch `swarm-ios` |
| Rust library for iOS | upstream `rust/ios/build_ios.mjs`, run unmodified |
| App project | `ios/Zingo.xcworkspace`, scheme `Zingo` |
| Brand artwork (vector) | `ios/branding/swarm-mark.svg`, `ios/branding/swarm-appicon.svg` |
| Art renderer | `ios/scripts/generate-ios-art.sh`, `ios/scripts/flatten-png.swift` |
| Launch screen | `ios/Zingo/LaunchScreen.storyboard` |
| Owner instructions | this file |

The Xcode **target, scheme and product name stay `Zingo`**. They are build
identifiers, never shown to a person. Renaming them would touch the
workspace, the Podfile target, the test bridging header and the
`$(PRODUCT_MODULE_NAME).SceneDelegate` reference in `Info.plist` for no
user-visible gain. What a person sees is `CFBundleDisplayName`, and that
says **SWARM Wallet**.

### iOS identity

| Setting | Upstream | SWARM |
| --- | --- | --- |
| Display name | `Zingo` | **SWARM Wallet** (`SWARM Wallet Beta` for the beta configurations) |
| Bundle identifier | `org.ZingoLabs.Zingo` | **`green.swarm.wallet`** (`green.swarm.wallet.beta`) |
| `DEVELOPMENT_TEAM` | `788KRST4S8` (Zingo Labs) | empty — this project has no team |
| `zcash:` URL scheme | claimed | **removed** |
| `LSApplicationQueriesSchemes` | `zcash` | removed |
| App icon | Zingo artwork (PNGs in the repo) | SWARM hive bee, rendered in CI from SVG |
| Launch screen | `Zingo` in white on black, and never shown (see below) | warm black `#0A0908` with the hive bee |
| Minimum iOS | 16.0 | 16.0, unchanged |
| Entitlements | `aps-environment: development` | **empty** — the app registers for no remote notifications, so the entitlement is removed (see 9.2) |
| Background modes | `fetch`, `processing`, `remote-notification` | `fetch`, `processing` — sync only |
| Device family | iPhone + iPad (`1,2`) | **iPhone only (`1`)** |
| Build number | `CURRENT_PROJECT_VERSION = 1`, static | derived in CI from `github.run_number` (see 9.1) |
| Face ID / Touch ID / keychain | `ios/DeviceAuth.swift` | unchanged, byte for byte |
| Analytics | none | none |

Two upstream details worth naming:

* **The launch screen never appeared.** `UILaunchStoryboardName` read
  `LaunchScreen.storyboar` — a typo, so iOS found no storyboard. Corrected
  to `LaunchScreen`, which is why the SWARM launch screen is the first
  thing this build shows.
* **The `zcash:` claim is removed, not renamed.** SWARM is a separate test
  network; a SWARM wallet must not intercept Zcash payment links on
  anyone's phone. Nothing depends on the claim: the `zcash:` handling in
  the shared JavaScript parses strings that are pasted or scanned, not
  links routed by iOS. (The Android manifest still claims the scheme —
  that file belongs to the other agent.)

### The app icon is generated, not stored

`ios/branding/swarm-appicon.svg` is the only copy of the mark. CI installs
`librsvg` and runs `ios/scripts/generate-ios-art.sh`, which renders all 19
icon sizes into both app-icon sets plus the launch mark at 1x/2x/3x, then
strips the alpha channel that iOS icons must not carry. **No icon website
or third-party icon service is used, and no PNG of the mark is committed.**

If you open the project in Xcode on a Mac, run the script once first or
the asset catalog will report missing images:

```sh
brew install librsvg
bash ios/scripts/generate-ios-art.sh
```

The mark follows the design system exactly: hexagonal body `#FF8A1F`, two
stripes in the background colour `#0A0908`, two honey `#FFB020` elliptical
wings, on warm black. **Never tilt it and never give it a face.**

---

## 2. What the workflow does

`swarm-ios.yml` runs on `macos-latest` and has five jobs.

1. **`preflight`** — records what the hosted runner actually is. Every
   version pinned in the file is pinned against this.
2. **`rust-xcframework`** — installs the three iOS Rust targets
   (`aarch64-apple-ios`, `aarch64-apple-ios-sim`, `x86_64-apple-ios`),
   `protoc` and `bindgen-cli`, then runs upstream's `rust/ios/build_ios.mjs`
   **unmodified**: uniffi Swift bindings, three `cargo build --release`
   runs, `lipo` of the two simulator slices, and two XCFrameworks. The
   finished XCFrameworks are cached on the Rust source hash — 0.35 GB
   that skips the whole hour whenever `rust/` is unchanged. The cargo
   cache keeps the registry and git checkouts but **not** the
   cross-compiled target directories: with them it was 5.59 GB of the
   repository's shared 10 GB, which starved the Android pipeline for a
   saving only the rarer `rust/`-changed build sees.
3. **`app-simulator`** — renders the icons, `yarn`, `pod install`, an
   **unsigned Release build for the iOS Simulator**
   (`CODE_SIGNING_ALLOWED=NO`), then creates and boots a simulator,
   installs the `.app`, launches it, screenshots it, checks it is still
   running, and uploads the zipped `.app` with `SHA256SUMS`.
   Release and not Debug so the JavaScript is bundled into the app: the
   artifact is standalone and the screenshot is real evidence rather than a
   Debug build's error screen about a missing Metro server.
4. **`string-sweep`** — reads the **built** app and fails while anything a
   person can see still says Zingo: the bundled JavaScript (Hermes
   bytecode keeps its string table, so `strings` finds it), the
   user-visible `Info.plist` keys, and the `.strings`/`.storyboard`/`.xib`
   resources. Licence and attribution lines are allow-listed — keeping the
   MIT notices is required, not a leak. Internal identifiers are
   deliberately out of scope and are **not** renamed: the React Native
   root module name, background-task identifiers, keychain service names,
   storage keys, the Xcode target and scheme, and SDK symbols such as
   `ZingolibError`.
   It is a separate job so that "does the app build" stays a readable
   answer independent of "is the rebrand finished". It complements
   `scripts/check_no_upstream_branding.mjs` on the shared side rather than
   duplicating it: that one reads the source, this one reads the artifact
   that would actually ship.
5. **`signed-release`** — **disabled**. Section 5.

### A note on the Actions cache, for whoever hits it next

A repository gets **10 GB of Actions cache in total**, shared by every
branch and both agents, and GitHub evicts least-recently-used without
warning. On 2026-09-21 the Android workflow saved three ~2.2 GB per-ABI
caches and evicted this pipeline's xcframework cache minutes after it was
written.

So the xcframework travels between the two iOS jobs as a **run-scoped
artifact**, not through the cache. The cache is kept purely as a
build-skip optimisation: when it survives, the hour-long Rust build is
skipped; when it does not, the build simply runs again. Nothing fails
because of an eviction. Do not reintroduce `fail-on-cache-miss` on the
consumer side.

Pinned versions and why:

| Pin | Value | Evidence |
| --- | --- | --- |
| Xcode | 26.5 | `macos-latest` ships Xcode 26.0 – 26.6 and defaults to 26.6, but has **no iOS 26.6 simulator runtime** — only 26.2, 26.4 and 26.5. Pinning 26.5 keeps the SDK and the runtime on the same version. |
| Simulator runtime | iOS 26.5, falling back to the newest present | same inventory |
| Simulator device | iPhone 17, falling back to the first iPhone present | same inventory |
| Node | 22.18.0 | repository `.nvmrc` |
| Deployment target | iOS 16.0 | upstream `ios/Podfile` and `IPHONEOS_DEPLOYMENT_TARGET` |

---

## 3. Running it yourself, on a simulator

This needs **a Mac and Xcode, and nothing else** — no Apple Developer
account, no payment, no signing, no enrolment. It is the whole iOS
deliverable until the account in section 5 exists.

**What you need:** a Mac (Apple silicon or Intel) and Xcode from the Mac
App Store, which includes the iPhone Simulator. Xcode is free. First
launch asks to install "additional components" — let it.

**Step by step:**

1. Open the branch's Actions page, pick the most recent green
   **SWARM iOS** run, and download the artifact
   **`swarm-ios-simulator-app`**. It contains
   `SwarmWallet-simulator.app.zip` and `SHA256SUMS`.
2. Check what you downloaded is what CI built. In Terminal, in the
   download folder:
   ```sh
   unzip -o swarm-ios-simulator-app.zip        # GitHub wraps artifacts in a zip
   shasum -a 256 -c SHA256SUMS                 # must print: OK
   ```
   If that does not print `OK`, stop and say so — do not install it.
3. Unpack the app itself:
   ```sh
   ditto -x -k SwarmWallet-simulator.app.zip .
   ```
   You now have `Zingo.app`. That filename is the internal Xcode product
   name and is expected; the app calls itself SWARM Wallet everywhere a
   person can see.
4. Start a simulator. Open Xcode once, then:
   ```sh
   open -a Simulator
   xcrun simctl boot "iPhone 17"     # skip if one is already running
   ```
5. Install and launch:
   ```sh
   xcrun simctl install booted Zingo.app
   xcrun simctl launch booted green.swarm.wallet
   ```
6. The app opens on its privacy shutter and asks you to authenticate. On a
   simulator, enrol a face first — Simulator menu → **Features → Face ID →
   Enrolled** — then launch again and use **Features → Face ID → Matching
   Face**.

**What this does and does not tell you.** It shows the real app: the
SWARM name, icon, launch screen, typefaces and screens, running the real
Rust wallet library. It does **not** prove anything about syncing,
sending or receiving — that needs `lwd.swarm.green` reachable — and a
simulator is not a phone: no Secure Enclave, no real Face ID, no push
notifications, and different performance.

**You cannot put this build on an iPhone.** A simulator `.app` is a
different architecture and carries no signature; there is no side-load
path on iOS that avoids Apple-issued signing material. That is section 5.

## 4. What only the owner can do

None of this can be done by an agent. It needs a legal identity, a payment
method and Apple's agreement — three things no agent may supply.

### 4.1 Enrol in the Apple Developer Program **as an organisation**

This is not a preference. App Review guideline **3.1.5(b)(i)** allows
cryptocurrency **wallets** only from developers **enrolled as an
organisation**. An individual account cannot ship this app, however
complete it is.

Enrolling as an organisation requires, on Apple's side:

* a **D-U-N-S number** for the legal entity (free from Dun & Bradstreet,
  usually days, sometimes weeks);
* the entity in good legal standing, with a **public website on a domain
  the entity owns** — `swarm.green` serves;
* the person enrolling having **legal authority to bind the entity**, which
  Apple verifies, sometimes by phone;
* the annual fee (USD 99 at the time of writing), paid with the owner's own
  payment method.

Budget weeks, not hours. It is the long pole in the whole iOS path.

> **Related guideline, for the record:** **3.1.5(b)(ii)** forbids apps that
> mine cryptocurrency unless the processing happens off device. That is why
> the SWARM mobile wallet is a wallet only and contains no miner. Do not add
> one for iOS, ever.

### 4.2 Create the App ID and signing material

In the Apple Developer portal, once enrolled:

1. **Identifiers → App IDs → +** → App, explicit bundle ID
   **`green.swarm.wallet`**. It must match the project exactly. Enable only
   the capabilities the app actually uses; the app adds **no** entitlement
   beyond upstream's push-notification `aps-environment`.
2. Either **(a)** an **App Store Connect API key** (Users and Access →
   Integrations → App Store Connect API, role *App Manager*): download the
   `.p8` **once** — Apple never shows it again — and note the Key ID and
   the Issuer ID; **or (b)** a distribution certificate (`.p12` with a
   password) plus an App Store provisioning profile for the App ID. The
   disabled job in the workflow expects **both**: the certificate and
   profile to sign, the API key to upload.
3. In **App Store Connect**, create the app record for
   `green.swarm.wallet`, name it *SWARM Wallet*, and set the primary
   category (Utilities is what the project declares).

### 4.3 Add the repository secrets

`Swarm-Official/swarm-mobile` → Settings → Secrets and variables → Actions.
(The organisation was renamed from `brs-holding` on 2026-09-22; old URLs
redirect.)
**Names only below. Never paste a value into a chat, an issue, a commit, a
log or a file in this repository.** The workflow reads them only inside the
`apple-distribution` environment, which the owner should also create with
required reviewers so a release cannot start unattended.

**Four secrets are enough.** The job now picks its signing path from what
exists, and the short path needs no certificate file at all.

| Secret name | Needed | What goes in it |
| --- | --- | --- |
| `APPLE_TEAM_ID` | always | the 10-character team ID |
| `APPLE_APP_STORE_CONNECT_KEY_ID` | always | the API key's Key ID |
| `APPLE_APP_STORE_CONNECT_ISSUER_ID` | always | the API key's Issuer ID |
| `APPLE_APP_STORE_CONNECT_KEY_P8` | always | the `.p8` file, base64-encoded |
| `APPLE_DISTRIBUTION_CERT_P12` | only for manual signing | the distribution `.p12`, base64-encoded |
| `APPLE_DISTRIBUTION_CERT_PASSWORD` | only for manual signing | that `.p12`'s password |
| `APPLE_PROVISIONING_PROFILE` | only for manual signing | the `.mobileprovision`, base64-encoded |

With the first four alone the job archives with automatic signing and
`-allowProvisioningUpdates`, and Xcode creates the distribution
certificate and the App Store profile itself — no certificate file and no
certificate password ever leave Apple. Supplying the last three switches
the job to manual signing; supplying *some* of them is refused, because a
half-configured certificate is a silent wrong signature waiting to happen.

Base64 on a Mac: `base64 -i AuthKey_XXXX.p8 | pbcopy`.

---

## 5. The signed / TestFlight job (written, disabled)

The `signed-release` job in `swarm-ios.yml` is complete and **cannot run
today**, by two independent locks:

1. it runs only on a manual `workflow_dispatch` with the input
   `signed_release` set to true, which defaults to **false**; and
2. its first step enumerates the seven secrets above and **fails the job**
   if any is empty, before any signing step is reached.

When the secrets exist, it would: import the `.p12` into a **throwaway
keychain created for that job alone**, install the provisioning profile,
`xcodebuild archive` for `generic/platform=iOS` with manual signing,
`-exportArchive` with `method: app-store-connect`, upload the `.ipa` with
`xcrun altool` and the API key, and then delete the keychain, the profile
and the private key in an `if: always()` step. Nothing is ever echoed.

**No signing material belongs in this repository, in these logs or in any
artifact.** If a certificate or key is ever pasted somewhere it should not
be, treat it as compromised and revoke it in the developer portal.

### What TestFlight review will ask about

TestFlight has two paths:

* **Internal testers** (up to 100 people who are users on the App Store
  Connect team): **no review**. This is the realistic first step — the
  owner can install SWARM Wallet on their own iPhone this way within a day
  of the account existing.
* **External testers** (up to 10 000, by email or public link): each build
  needs **Beta App Review**, a shorter review than the App Store but
  against the same guidelines. For a testnet crypto wallet, expect:
  * **3.1.5(b)(i)** — the organisation check. This is the one that fails
    outright on an individual account.
  * **2.1 / App completeness** — the reviewer will run it. The wallet must
    reach a usable state against a server that is up. `lwd.swarm.green`
    must be reachable from Apple's network, or the build is rejected as
    non-functional.
  * **Demo instructions** — supply a seed phrase for a funded testnet
    wallet and say plainly, in the "What to Test" notes and in the app,
    that **SWM are test coins on a private test network and have no value
    and cannot be bought or sold**. Ambiguity here reads as a financial
    product and invites a much harder review.
  * **Export compliance.** `Info.plist` inherits
    `ITSAppUsesNonExemptEncryption = false` from upstream. A shielded
    wallet performs cryptography well beyond authentication, so **the owner
    should confirm that declaration with their own legal advice before any
    upload.** No agent changed it and no agent can decide it.
  * **Guideline 2.2** — beta, demo and trial versions belong on TestFlight
    and are not accepted on the App Store. A testnet wallet is a
    TestFlight product; do not plan an App Store listing for it.

### What is impossible without the account

* **Installing on a physical iPhone.** A simulator `.app` cannot be
  installed on a phone — different architecture, different bundle, no
  signature. There is no side-load path on iOS that does not involve
  Apple-issued signing material.
* The one lesser route is a **free** Apple ID used from Xcode on a Mac,
  which issues a personal development profile that **expires after 7 days**
  and is limited to a handful of devices. It still needs: a Mac, a cable,
  the phone, and a human signed in to that Apple ID. This project has no
  Mac, so that route is unavailable here too, and it can never reach
  TestFlight.
* TestFlight, App Store, push notifications on device, and any test of Face
  ID against real hardware all wait on the same account.

---

## 6. Proven vs assumed

**Proven** (each has a workflow run behind it — see the branch's Actions):

* The Rust wallet library and the Nym proxy shim build for all three iOS
  targets on a hosted macOS runner and pack into XCFrameworks.
* The app compiles for the iOS Simulator with signing disabled.
* The built `.app` installs on a booted simulator, launches, and is still
  running afterwards; screenshots are uploaded as artifacts.
* The built bundle carries the SWARM bundle identifier, the SWARM display
  name and no URL-scheme claim.

**Assumed, not proven:**

* Anything on a physical iPhone. No device has ever run this build.
* Anything about App Review's actual response. The guidelines are quoted;
  reviewers decide.
* Wallet behaviour against a live SWARM network. The genesis hash is no
  longer a placeholder — the merged SDK pin carries SwarmTestnet's real
  genesis `045993f5c91ea160c7ebda573dd97b0016816bca68d395bfff202779b88e2a28`
  — but no iOS build has yet synced a block. The screenshots prove the app
  starts and reaches its authentication gate; they prove nothing about
  syncing, sending or receiving. That needs `lwd.swarm.green` reachable
  and a run that gets past the gate.

## 7. What is shared and what is iOS-only

Two agents work in this repository. Getting this boundary wrong means the
same job done twice, or differently on each platform.

**iOS-only — changed here, and nowhere else:**

| Area | File |
| --- | --- |
| Display name, bundle id, version, team | `ios/Zingo.xcodeproj/project.pbxproj` |
| Permission prompts, URL schemes, fonts, launch storyboard, copyright | `ios/Zingo/Info.plist` |
| Launch screen | `ios/Zingo/LaunchScreen.storyboard` |
| App icon + launch mark (vector and renderer) | `ios/branding/`, `ios/scripts/` |
| Bundling the shared typefaces into the app | `ios/Zingo.xcodeproj` folder reference + `UIAppFonts` |
| The pipeline | `.github/workflows/swarm-ios.yml` |

**Shared — owned by the `swarm-mobile` branch, consumed here:** the
network identity and SDK pin (`rust/`), every screen and string
(`app/`, `screens/`, `ui/`, `app/translations/*.json`), the palette and
type scale (`app/theme/`), the typeface files themselves
(`assets/fonts/`), and the removal of the fiat picker and donation
surfaces. The iOS build renders those; it does not define them.

Two specifically worth naming, because they look iOS-shaped and are not:

* **The typefaces.** The `.ttf` files and `app/theme/typography.ts` are
  shared. But `react-native.config.js` declares `project: { android: {} }`
  and the app does no runtime font loading, so linking them into the iOS
  bundle is iOS work, done here. Without it every `fontFamily: 'Sora-…'`
  falls back to the system face — silently, which is why the build now
  fails if a face named in `UIAppFonts` is missing from the app.
* **The authentication prompt.** The title on the iOS passcode sheet is
  `CFBundleDisplayName` (iOS-only, fixed here). The subtitle under it is
  the `localizedReason` passed in from shared JavaScript.

### Open items for the shared branch (found by the iOS sweep)

Both are shared JavaScript, so they are fixed on `swarm-mobile`, once, for
both platforms — not here.

1. **"Zenny Tips" still ships, in four languages.** `app/translations/`
   carries `zenny-tips-ab` = "Zenny Tips" (en), "Zenny Propinas" (es),
   "Zenny Gorjetas" (pt), "Zenny Tavsiyeleri" (tr), and
   "Поддержать Zenny" (ru). A *Zenny* is upstream's name for its 0.01 ZEC
   donation unit, so this is donation branding on a screen after the
   donation surfaces were removed. `scripts/check_no_upstream_branding.mjs`
   passes on it because `Zenny` is not in its `FORBIDDEN` list — adding it
   there is the fix, plus deleting the strings.
2. **`app/utils/ZingoAppData.ts:59` is now dead logic.** It reads
   `getApplicationName() === 'Zingo Beta' ? BETA_LOGO : PROD_LOGO`. The
   display name is now "SWARM Wallet" / "SWARM Wallet Beta", so that
   comparison can never be true and the beta build silently shows the
   production logo. This is a behavioural consequence of the rename, not
   cosmetics.

Also worth a decision on the shared side: `zennies` is still referenced in
ten files (`app/LoadedApp`, `app/walletBackend`, `screens/AddressBook`,
`screens/History`, …), and the iOS bridge still exposes
`getZenniesDonationAddress` / `getDonationAddress` in `ios/RPCModule.swift`
because they forward to the SDK. Those native methods were left in place
deliberately: removing them while the shared JavaScript still calls them at
startup would break iOS only, which is exactly the platform divergence to
avoid. They should go when the shared callers do.

## 8. What remains

**The genesis hash is in.** The SDK pin
`8507eac5caf1e0e7abe739dcbfb4bf2501f7ff0f` carries the real
`045993f5…` and keeps `swarm_testnet_genesis_is_placeholder()` as a
release gate, which this build reports rather than assumes.

**After the owner has an organisation account** — add the seven secrets,
create the `apple-distribution` environment with required reviewers, run
the workflow manually with `signed_release: true`, and take the first build
to **internal** TestFlight testers before considering external testing.

---

## 9. Upload readiness (2026-09-22)

Everything in this section is about the *first* TestFlight upload: the
things App Store Connect checks before a human ever sees the app, and the
things a reviewer looks at first. The full work list is
`docs/ios/06-BUILD-REQUIREMENTS.md` in the project vault.

### 9.1 The build number now increases by itself

`MARKETING_VERSION` stays `0.1.0` for the whole testnet series.
`CURRENT_PROJECT_VERSION` is computed in CI as
`github.run_number + BUILD_NUMBER_OFFSET` (offset `1000`, so the first one
is well clear of the `1` in the project file) and injected on the
`xcodebuild` command line for both the simulator build and the signed
archive. The job then reads `CFBundleVersion` back out of the built bundle
and fails if it is not the number it asked for, and prints version, build
and commit into the job summary.

The project file keeps `CURRENT_PROJECT_VERSION = 1`. That is deliberate:
it is what makes the project open and build in Xcode with no environment,
and CI overrides it. If the fallback path of D7 is ever used — a manual
Xcode archive on someone's Mac — **set the build number by hand in Xcode
first**, higher than any build CI has uploaded.

### 9.2 No push entitlement, no push background mode

The app registers for **no** remote notifications: there is no
`registerForRemoteNotifications`, no
`didRegisterForRemoteNotificationsWithDeviceToken`, no
`UNUserNotificationCenter` delegate and no push SDK in `ios/*.swift`,
`app/`, `screens/` or `ui/`. The only notification dependency is
`@notifee/react-native`, which schedules **local** reminders.

So `aps-environment` is gone from `Zingo.entitlements` (now an empty
`<dict/>`) and `remote-notification` is gone from `UIBackgroundModes`.
This matters beyond tidiness: a provisioning profile whose App ID does not
carry the Push Notifications capability **refuses** an entitlement that
asks for it, which would have failed the very first upload. `fetch` and
`processing` stay — they are what continues wallet synchronisation, and
that is the sentence for the App Review notes.

### 9.3 The bundled privacy manifest is the complete one

`ios/Zingo.xcodeproj` references the **root** `ios/PrivacyInfo.xcprivacy`,
not the near-identical copy in `ios/Zingo/`. Apple reads the manifest that
is actually bundled, and the root one was missing `NSPrivacyTracking` and
`NSPrivacyCollectedDataTypes`. Both keys are now in the root file
(tracking `false`, collected data an **empty array** — present and empty,
because a missing key is "unanswered" and an empty one is "nothing").

The simulator job now reads `PrivacyInfo.xcprivacy` out of the built
`.app`, prints its SHA-256 next to both source files so the summary says
which one shipped, prints the manifest, and fails if either key is absent
or if tracking is not `false`.

### 9.4 Permissions: only the ones that exist

* `NSLocationWhenInUseUsageDescription` — **deleted**. `ios/Podfile` now
  sets `$VCEnableLocation = false` before `use_react_native!`, so
  VisionCamera stops linking CoreLocation (it links it by default so a
  photo can carry a GPS tag; this app scans QR codes and takes no photo).
  CI runs `otool -L` on the built binary and **fails** if CoreLocation
  comes back.
* `NSPhotoLibraryUsageDescription` → `NSPhotoLibraryAddUsageDescription`.
  The read key asked for the whole library; nothing here reads photos.
  **Recorded honestly:** a sweep of `app/`, `screens/`, `ui/` and
  `ios/*.swift` finds no photo-library API *at all* — no CameraRoll
  dependency, no `PHPhotoLibrary`, no `UIImageWriteToSavedPhotosAlbum` —
  and the receive QR is rendered on screen by `react-native-qrcode-svg`
  and never saved. CI reports (advisory, not fatal) whether the binary can
  reach the photo library; if it cannot, this key should be deleted too.
* `NSCameraUsageDescription` and `NSFaceIDUsageDescription` — kept. Both
  features exist.

### 9.5 iPhone only, and no macOS key

`TARGETED_DEVICE_FAMILY` is `1` in all four app configurations. iPhone-only
apps still run on iPad in compatibility mode, and the change is one line to
reverse — but universal would oblige a 13-inch iPad screenshot set and an
iPad layout review for a first testnet build. `LSMinimumSystemVersion`, a
macOS key that had no business in an iOS-only plist, is removed. CI asserts
both from the built bundle.

### 9.6 The signed job takes either path

See the secrets table in 4.3. The job:

1. refuses to run unless the four API-key secrets exist;
2. refuses to run if *some* but not all of the certificate trio exists;
3. picks `automatic` (API key, `-allowProvisioningUpdates`) or `manual`
   (`.p12` + profile in a throwaway keychain) from what it found;
4. archives with the derived build number, reads the archive back and
   fails if the build number or the bundle id is not what it asked for;
5. exports with method `app-store-connect`;
6. uploads with `xcrun altool --upload-app --apiKey --apiIssuer`;
7. writes signing style, version, build, commit, the `.ipa`'s SHA-256 and
   the delivery UUID into the job summary; and
8. deletes the keychain, the profile and both copies of the API key in an
   `if: always()` step.

It has **never been run**, and cannot be until the secrets exist. The YAML
is validated with `actionlint`.

### 9.7 Still open, and not an agent's to close

* **Export compliance** (`ITSAppUsesNonExemptEncryption`, currently
  `false`, inherited from upstream) — owner and legal advice, see
  `docs/ios/03-APPLE-GUIDELINES-CHECK.md`. Do not upload before it is
  confirmed.
* **The Apple Developer Program organisation account itself**, the App ID,
  the App Store Connect app record and the API key. Section 4.
* **A funded App Review wallet** or a faucet, so a reviewer can exercise
  Send (`06-BUILD-REQUIREMENTS.md` item C5).
* **Store screenshots at 6.9-inch size** from a synced wallet with real
  SWM amounts (item B8).
