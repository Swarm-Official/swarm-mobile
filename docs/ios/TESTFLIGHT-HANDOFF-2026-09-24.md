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
The signed job waits for the
simulator build and string sweep, checks the archive identity and rendered
assets, exports an IPA, then uploads to TestFlight. Run the workflow with
`signed_release=false` first. The `apple-distribution` GitHub environment is
restricted to `codex/ios-device-release` and currently has no secrets.
App Store Connect currently has no TestFlight builds. The S4FE AG account has
an Admin Team API key and a managed distribution certificate, but this
repository has no access to either. The signing key still needs a decision
from the account owner before upload.
The `SWARM Internal` TestFlight group has bjoern as its first tester. Automatic
distribution is off; assign a processed build to the group after verification.
The beta description is saved in TestFlight. Apple requires review contact
details before it will save review notes. Draft notes:

> No account is required. On first launch, accept the risk notice and create a
> wallet. The app connects to `https://lwd.swarm.green:443` on SwarmTestnet.
> Receive shows a shielded address and QR code. To test Send, fund that address
> with disposable SwarmTestnet SWM from another wallet, wait for the funds to
> become spendable, then use Send.

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
2. Select a signing path. Automatic signing uses an App Store Connect **Team
   API key with Admin access**. The key can manage all apps on the team and
   create distribution signing assets. Manual signing uses an existing Apple
   Distribution certificate, its private key, an App Store provisioning
   profile, and an API key that can upload builds. This Mac currently shows
   Apple Development identities and no Apple Distribution identity.
3. Put the selected material in the GitHub `apple-distribution` environment.
   For automatic signing, use `APPLE_TEAM_ID`,
   `APPLE_APP_STORE_CONNECT_KEY_ID`, `APPLE_APP_STORE_CONNECT_ISSUER_ID`, and
   `APPLE_APP_STORE_CONNECT_KEY_P8`. The last value is the base64 encoding of
   the `.p8` file. For manual signing, also set
   `APPLE_DISTRIBUTION_CERT_P12`, `APPLE_DISTRIBUTION_CERT_PASSWORD`, and
   `APPLE_PROVISIONING_PROFILE`. The P12 and profile values are base64 encoded.
   Set `APPLE_TEAM_ID=SAZ99S3T4C`. Enter all values in GitHub Secrets. Keep
   private keys, passwords, and two-factor codes out of chat and source
   control.
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
store listing. App Store Connect currently has no Privacy Policy URL or App
Privacy answers. The store page has no screenshots, description, age rating,
or App Review contact information. The primary category is Finance, the support
URL is `https://swarm.green/support`, and the release mode is manual. The Store
review form no longer requires a sign-in. Complete the remaining fields from
the reviewed release materials. Review `lwd.swarm.green` request retention
and third-party SDK behavior before answering Apple's data-collection questions.
TestFlight's feedback email and review contact fields are also empty.
Capture current wallet screens at an accepted iPhone screenshot size after a
successful physical device session. Review the draft text in
`fastlane/metadata` and supply a support contact and App Review instructions.
The testnet requires a working indexer and disposable test coins for review.

The first signed upload is an internal TestFlight candidate. App Store
submission follows physical device acceptance, legal pages, privacy answers,
screenshots, and App Review material.
