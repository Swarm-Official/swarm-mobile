# SWARM Wallet iOS: TestFlight handoff

Prepared 2026-09-24 for `bjoern`. Source: `Swarm-Official/swarm-mobile`, branch
`codex/ios-device-release`. The branch starts at handoff commit `dc8890bf` and
keeps the wallet SDK pin at `ef08aa252ec55f411dc937045548cd4f3f3dc664`.

The App Store Connect record has ID `6815274408`, bundle ID
`green.swarm.swarmwallet`, and belongs to the S4FE AG organisation (Apple team
`SAZ99S3T4C`). Its current App Store version is `1.0`. The workflow builds a
`0.1.0` TestFlight candidate. [Apple associates uploads by bundle ID and
version](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds),
so a store submission against the `1.0` record needs a `1.0` build
or an edited store version. Keep SwarmTestnet and existing wallet storage.

## Build status

The [hosted simulator run](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36020885180)
passed on Xcode 26.5 with ad hoc simulator entitlements. Maestro accepted the
risk notice, reached Receive, tapped Send and returned to Receive. The runner
found `wallet.dat.txt`, confirmed the default SwarmTestnet server, and passed
the Store asset and visible-string checks. The signed archive job was skipped.
The [first signed run](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36025841188)
passed the simulator and string checks, then stopped before device compilation.
Xcode rejected an explicit distribution identity with automatic archive
signing. Commit `233037798` removed that override. The
[first retry](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36030326489)
built and launched, then failed the Store copy check on the open-source
attribution. Commit `ffad77054` corrected the text. The
[current signed run](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36037294585)
passed the Store file check before compilation. It waits for the simulator
build and string sweep, checks the
archive identity and rendered assets, exports an IPA, then uploads to
TestFlight. The `apple-distribution` GitHub environment accepts only
`codex/ios-device-release`. Bjoern approved temporary use of the S4FE AG
Admin API key for this upload. Four signing values are present as environment
secrets during the run and must be deleted after the upload attempt. Apple had
no TestFlight builds before this run.
The `SWARM Internal` TestFlight group has bjoern as its first tester. Automatic
distribution is off; assign a processed build to the group after verification.
The beta description, feedback email, and wallet marketing URL are saved in
TestFlight. Apple requires a review phone and email before it will save review
notes. Draft notes:

> No account is required. On first launch, accept the risk notice and create a
> wallet. The app connects to `https://lwd.swarm.green:443` on SwarmTestnet.
> Receive shows a shielded address and QR code. To test Send, fund that address
> with disposable SwarmTestnet SWM from another wallet, wait for the funds to
> become spendable, then use Send.

For the first internal build, enter this What to Test text when assigning it to
the group:

> Create or restore a wallet. Check the Receive QR and copied address. Fund it
> with disposable SwarmTestnet SWM, then send a small amount to another test
> wallet. Check the balance and transaction history after confirmation. Report
> crashes, failed sync, and stuck wallet creation through TestFlight feedback.
> Test coins have no monetary value and the test network may reset.

The earlier unsigned simulator run
[`35909981590`](https://github.com/Swarm-Official/swarm-mobile/actions/runs/35909981590)
built and launched. It showed the iOS passcode sheet. After the attempted
simulator unlock, it remained on “Creating a new wallet” for six minutes. The
app lacked keychain entitlements and received `errSecMissingEntitlement`
(`-34018`). The runner reached `lwd.swarm.green:443`. An ad hoc signed local
simulator build with the same entitlements created `wallet.dat.txt`
and displayed the shielded receive address. The hosted run confirmed the same
path. A physical iPhone must complete the
risk notice, wallet creation, sync, receive, and a disposable test transfer
before external testing or App Store submission.

The iOS code has Send and Receive screens and a transaction sender. An empty
basic-mode wallet previously concealed Send. The branch now exposes History,
Send, and Receive as soon as the wallet address loads. The send confirmation
still requires a spendable balance, a valid destination, and a fee. The
recovery phrase action is available from the options panel for an empty
wallet.

## Wallet function check

| Desktop function | iOS location | Verified here |
| --- | --- | --- |
| Send | Send tab, with address, amount, memo, and confirmation | The tab appears with zero balance. A funded transfer needs an iPhone. |
| Receive | Receive tab, with shielded and transparent addresses | A local simulator displayed the shielded QR. |
| Balance and history | History tab | The tab appears with zero balance. |
| Messages | Header message button | The route exists; message exchange remains untested. |
| Address Book | Options panel | The route exists; editing remains untested. |
| Recovery phrase and wallet restore | Options panel | The recovery action appears for an empty wallet. Device recovery remains untested. |
| Settings | Header settings button | The route exists. |

Desktop Swap appears only on its mainnet wallet. The current iOS release uses
SwarmTestnet, where the desktop wallet also conceals Swap.

The Mac has macOS 14.6 and Xcode 16.2. The hosted Xcode 26.5 workflow is the
device archive path. [Apple requires Xcode 26 or later](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
for iOS uploads after 2026-04-28.

## Apple and GitHub setup

1. Open [SWARM Wallet in App Store Connect](https://appstoreconnect.apple.com/apps/6815274408/testflight/ios).
   The S4FE AG Account Holder/Admin account can manage the app. The Apple
   Developer Program agreement was accepted on 2026-09-23.
2. The signed workflow uses automatic signing with the approved Admin API key
   on a hosted Xcode 26.5 runner. Four temporary environment secrets are
   present: `APPLE_TEAM_ID`, `APPLE_APP_STORE_CONNECT_KEY_ID`,
   `APPLE_APP_STORE_CONNECT_ISSUER_ID`, and `APPLE_APP_STORE_CONNECT_KEY_P8`.
   The key bytes remain in GitHub Secrets and the runner's temporary storage.
   Delete all four secrets after this upload attempt and verify the deletion.
3. Have the account owner answer Apple's encryption export questions. The
   unverified `ITSAppUsesNonExemptEncryption=false` declaration was removed
   from `Info.plist`, allowing App Store Connect to request the answer.
   `docs/ios/ENCRYPTION-REVIEW.md` records the dependency inventory.
4. Confirm that the completed run reports an IPA hash and an App Store Connect
   delivery result. Wait for Apple to process the build, then assign it to
   `SWARM Internal` and save the What to Test text above.

The workflow runs only after a signed dispatch, and its first step checks the
required secret names. A successful upload establishes delivery to Apple.
TestFlight availability follows Apple's processing and account checks.

## Store preparation

The privacy, terms, risks, and notices URLs under `https://swarm.green/wallet/`
returned HTTP 404 on 2026-09-24. Publish and review those pages before the
store listing. App Store Connect currently has no Privacy Policy URL or App
Privacy answers. The Store page has a draft description, promotional text,
keywords, subtitle, and wallet marketing URL from `fastlane/metadata/en-US`.
The four final angled Store screenshots finished processing in the
English (U.S.) draft. It still
needs the age rating and the App Review phone and email. The primary
category is Finance, the support URL is `https://swarm.green/support`, and the
release mode is manual. The Store review form no longer requires a sign-in.
Complete the remaining fields from the reviewed release materials. Review
`lwd.swarm.green` request retention before answering Apple's data-collection
questions. The ZNS resolver returns before a network call on SwarmTestnet.
The live `https://swarm.green/privacy` page covers the website and does not
describe wallet-server traffic.
The TestFlight review phone and email fields are also empty.
The four 1320 × 2868 layouts in `fastlane/screenshots/en-US` show Receive,
Send, History, and Settings. They use real captures from the local disposable
simulator wallet. `design/app-store/README.md` records their provenance.
Apple's screenshot set is `6234c941-ef28-4b29-a3d4-1d8863a0a7b4`.
[Apple accepts that screenshot size](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).
Review the draft text in `fastlane/metadata` and supply an App Review phone
number and instructions.
The testnet requires a working indexer and disposable test coins for review.

The first signed upload is an internal TestFlight candidate. App Store
submission follows physical device acceptance, legal pages, privacy answers,
screenshots, and App Review material.
