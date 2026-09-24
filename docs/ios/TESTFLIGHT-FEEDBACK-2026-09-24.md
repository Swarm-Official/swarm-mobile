# TestFlight feedback fixes

The 11 screenshot comments on build 1023 requested these changes:

| Feedback | Change |
| --- | --- |
| Home needs branding and an explanation | SWARM mark, wallet introduction, Receive action and testnet notice |
| Add a welcome page | Explicit Create and Restore choices before wallet creation |
| Put wallet addresses in the home header | My addresses shortcut on Home, Send and Receive |
| Add another wallet from home | Wallets shortcut, saved-wallet list, creation and switching |
| Add the logo to Receive | Centered header mark and a square QR logo with high error correction |
| Replace the Send currency symbol | SWARM mark in the amount field |
| Replace Zcash labels in address forms | SWARM chain label and mark in the address book and address tag sheet |
| Fix the GitHub link | Link to Swarm-Official/swarm-mobile |
| Add privacy and terms | Offline privacy policy, terms, risk notice and licence text in About and Welcome |

Saved wallets use atomic writes, a recovery journal, iOS file protection and
device-backup exclusion. Creating or restoring another wallet preserves the
current wallet. The native checks cover three wallets, updated wallet bytes,
interrupted selection, retrying creation and missing archives.

Local verification passed for TypeScript, targeted ESLint, the Swift wallet
storage checks and the iOS simulator build. The simulator created two wallets,
switched back to Wallet 1 and retained both wallets after restart. The Receive
QR code decoded with the SWARM logo. The header opened the unified-address
list. All four legal documents opened inside About. The modal's title and
Close button respect the iPhone safe area. The release workflow exercises
Welcome, creation, Home, Send, Receive and switching between two wallets.

Build 1027 stopped before signing when the simulator missed the first Create
tap. Local testing of that compiled app found a second issue: switching after
sync stopped failed with `SyncNotRunning`. The backend now accepts an idle
sync state when pausing. The offline regression test and the existing test for
an uninitialized client both pass. The UI flow waits for screen transitions
and retries a tap when the screen remains unchanged. The workflow pins
Maestro 2.10.0 and retains its test result and named screenshots.

The local Release app rebuilt with the fixed engine. Its complete Maestro flow
passed without manual input: two wallets were created, Send and Receive opened,
Wallet 1 reopened, and Wallet 2 remained available. The disposable simulator's
authentication settings were restored after the test.

Build 1028 passed the hosted SWARM address and idle-sync tests. Its native
frameworks include the iPhone and both simulator architectures. This Mac's
generated frameworks now match those artifacts. Their library hashes were
checked after copying, and the generated Swift interfaces match the source.

The hosted iOS 26.5 simulator flow passed with zero failures. It created both
wallets, opened Send and Receive, and returned to Wallet 1. The fresh-install
server check, bundle check and visible-string sweep passed. The Home, Receive
and saved-wallet screenshots were inspected. Apple Vision decoded the Receive
QR into 110 characters with the centered SWARM logo present.

The four wallet legal URLs return HTTP 200. The App Store draft points to the
wallet privacy policy. The website changes merged in Swarm-Official/swarm.green
pull request 1.

The App Store draft contains the four approved preview layouts with their revised
top captions. All four assets finished processing and match the local PNG hashes
in the intended order. The description, subtitle, promotional text and keywords
now describe SWARM Wallet for iPhone. The design kit includes this listing copy.
The TestFlight app description matches the App Store description.

Bjoern reported detailed app testing and approved the release on 24 September
2026.

Build `0.1.0 (1028)` uploaded successfully in
[run 36063684334](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36063684334).
All five jobs passed. Apple marked the build `VALID`, and `SWARM Internal`
received it with state `IN_BETA_TESTING`. The updated test notes are saved.
The four temporary GitHub environment secrets were removed after upload.

The privacy policy records the data flows implemented by this beta. The default
server's operator and log-retention period still require the owner's answer
before App Store submission.
