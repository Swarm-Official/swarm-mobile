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
storage checks and the iOS simulator build. The release workflow exercises
Welcome, creation, Home, Send, Receive and switching between two wallets.

The privacy policy records the data flows implemented by this beta. The default
server's operator and log-retention period still require the owner's answer
before App Store submission.
