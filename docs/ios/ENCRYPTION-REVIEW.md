# iOS encryption review inputs

Prepared 2026-09-24 for S4FE AG, app `6815274408`, bundle
`green.swarm.swarmwallet`. The wallet SDK revision is
`ef08aa252ec55f411dc937045548cd4f3f3dc664`.

## Source inventory

| Area | Evidence |
| --- | --- |
| Shielded wallet and transaction proofs | `rust/Cargo.lock` includes `zcash_primitives 0.30.1`, `orchard 0.15.4`, `sapling-crypto 0.7.0`, `halo2_proofs 0.3.4`, and `pasta_curves 0.5.2`. |
| Encryption and transport dependencies | The same lockfile includes `aes 0.8.4`, `chacha20poly1305 0.10.1`, `ring 0.17.14`, and `rustls 0.21.12` / `0.23.42`. |
| Local storage | `app/utils/keychainOptions.ts` selects the iOS device-only Keychain setting. `ios/RPCModule.swift` applies iOS file protection to the wallet files. |
| Build declaration | `ios/Zingo/Info.plist` leaves the export-compliance answer for App Store Connect. |

The lockfile identifies dependencies for technical review. Runtime use and
export classification require review of the relevant implementation and
distribution scope. Record the owner's determination before setting
`ITSAppUsesNonExemptEncryption` or submitting an encryption declaration.

[Apple's export overview](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance)
requires a determination for apps that incorporate encryption, including OS
cryptography. Its [documentation workflow](https://developer.apple.com/help/app-store-connect/manage-app-information/determine-and-upload-app-encryption-documentation)
uses the encryption implementation and intended territories to determine the
required material. Save any resulting approval for the matching beta build.
