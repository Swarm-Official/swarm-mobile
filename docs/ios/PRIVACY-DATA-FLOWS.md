# iOS wallet data flows for App Privacy review

Prepared 2026-09-24. This is a code and fresh-install traffic inventory. It is
not an App Store Connect privacy answer.

| Flow | Trigger | Evidence | Open question |
| --- | --- | --- | --- |
| Wallet server | Wallet launch and sync | `app/uris/serverUris.ts`; [signed simulator run](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36020885180) connected to `lwd.swarm.green:443` | Does the indexer retain IP addresses, request metadata, or wallet queries? For how long? |
| Recovery phrase and wallet file | Wallet creation and restore | `app/LoadingApp/LoadingApp.tsx`; the simulator created `wallet.dat.txt` in its app container | Confirm backup and diagnostic paths never upload the phrase or wallet file. |
| ZNS alias lookup | User enters a `.zcash` or `.zec` recipient | `app/uris/resolveZnsName.ts` calls `zcashname-sdk`, which points testnet to `https://light.zcash.me/zns-testnet` | Does that service retain the alias and IP address? A Zcash Testnet name may resolve to an address that SwarmTestnet rejects. Verify before release. |
| Internet reachability | Network state changes | `app/services/netInfoPolicy.ts` disables the NetInfo HTTP check | Recheck after dependency updates. |
| Price lookup | Main chain with the mixnet ready | `ui/widgets/PriceFetcher.tsx` gates the native price call | The current SwarmTestnet build does not meet this gate. Recheck before a mainnet release. |
| Analytics and crash reporting | None found in direct dependencies | `package.json` and source search | Verify transitive native SDKs and any server-side telemetry. |

The bundled `ios/PrivacyInfo.xcprivacy` declares an empty collected-data array.
Confirm the indexer and ZNS retention rules before submitting that declaration
as the App Privacy answer. The live `https://swarm.green/privacy` page describes
the website; the wallet-specific policy URLs in `app/legal/legalLinks.ts` return
HTTP 404 as of 2026-09-24.
