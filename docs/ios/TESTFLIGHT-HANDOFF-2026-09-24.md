# SWARM Wallet iOS: TestFlight handoff

Prepared 2026-09-24 for `bjoern`. Source: `Swarm-Official/swarm-mobile`, branch
`codex/ios-device-release`. The branch starts at handoff commit `dc8890bf` and
keeps the wallet SDK pin at `ef08aa252ec55f411dc937045548cd4f3f3dc664`.

The existing App Store Connect record has ID `6815274408`. Its expected bundle
ID is `green.swarm.swarmwallet`, version `0.1.0`. Check those values in App
Store Connect after signing in. Keep SwarmTestnet and existing wallet storage.

## Build status

The simulator CI build runs on Xcode 26.5 with ad hoc simulator entitlements.
The signed job waits for the
simulator build and string sweep, checks the archive identity and rendered
assets, exports an IPA, then uploads to TestFlight. Run the workflow with
`signed_release=false` first. The `apple-distribution` GitHub environment is
restricted to `codex/ios-device-release` and currently has no secrets.

The earlier unsigned simulator run
[`35909981590`](https://github.com/Swarm-Official/swarm-mobile/actions/runs/35909981590)
built and launched. It showed the iOS passcode sheet. After the attempted
simulator unlock, it remained on “Creating a new wallet” for six minutes. The
app lacked keychain entitlements and received `errSecMissingEntitlement`
(`-34018`). The runner reached `lwd.swarm.green:443`. An ad hoc signed local
simulator build with the same proposed entitlements created `wallet.dat.txt`
and displayed the shielded receive address. The updated CI workflow must
confirm this result on the hosted runner. A physical iPhone must complete the
risk notice, wallet creation, sync, receive, and a disposable test transfer
before external testing or App Store submission.

The iOS code has Send and Receive screens and a transaction sender. An empty
basic-mode wallet previously concealed Send. The branch now exposes History,
Send, and Receive as soon as the wallet address loads. The send confirmation
still requires a spendable balance, a valid destination, and a fee. The
recovery phrase action is available from the options panel for an empty
wallet.

The Mac has macOS 14.6 and Xcode 16.2. The hosted Xcode 26.5 workflow is the
device archive path. [Apple requires Xcode 26 or later](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
for iOS uploads after 2026-04-28.

## Apple and GitHub setup

1. Sign in to [SWARM Wallet in App Store Connect](https://appstoreconnect.apple.com/apps/6815274408/testflight/ios).
   Confirm the organisation team, bundle ID, app record, and permission to
   manage builds. Confirm that the Apple Developer Program agreements are
   active.
2. Select a signing path. Automatic signing uses an App Store Connect **Team
   API key with Admin access**. The key can manage all apps on the team and
   create distribution signing assets. Manual signing uses an existing Apple
   Distribution certificate, its private key, an App Store provisioning
   profile, and an API key that can upload builds. This Mac currently shows
   one Apple Development identity and no Apple Distribution identity.
3. Put the selected material in the GitHub `apple-distribution` environment.
   For automatic signing, use `APPLE_TEAM_ID`,
   `APPLE_APP_STORE_CONNECT_KEY_ID`, `APPLE_APP_STORE_CONNECT_ISSUER_ID`, and
   `APPLE_APP_STORE_CONNECT_KEY_P8`. The last value is the base64 encoding of
   the `.p8` file. For manual signing, also set
   `APPLE_DISTRIBUTION_CERT_P12`, `APPLE_DISTRIBUTION_CERT_PASSWORD`, and
   `APPLE_PROVISIONING_PROFILE`. The P12 and profile values are base64 encoded.
   Enter all values in GitHub Secrets. Keep private keys, passwords, and
   two-factor codes out of chat and source control.
4. Have the account owner answer Apple's encryption export questions. The
   unverified `ITSAppUsesNonExemptEncryption=false` declaration was removed
   from `Info.plist`, allowing App Store Connect to request the answer.
5. Dispatch `SWARM iOS` on `codex/ios-device-release` with
   `signed_release=true`. Confirm that the completed run reports an IPA hash
   and an App Store Connect delivery result. Wait for Apple to process the
   build, then assign internal testers in TestFlight.

The workflow runs only after a signed dispatch, and its first step checks the
required secret names. A successful upload establishes delivery to Apple.
TestFlight availability follows Apple's processing and account checks.

## Store preparation

The privacy, terms, risks, and notices URLs under `https://swarm.green/wallet/`
returned HTTP 404 on 2026-09-24. Publish and review those pages before the
store listing. Complete the App Privacy answers from actual data handling.
Capture current wallet screens at an accepted iPhone screenshot size after a
successful physical device session. Review the draft text in
`fastlane/metadata` and supply a support contact and App Review instructions.
The testnet requires a working indexer and disposable test coins for review.

The first signed upload is an internal TestFlight candidate. App Store
submission follows physical device acceptance, legal pages, privacy answers,
screenshots, and App Review material.
