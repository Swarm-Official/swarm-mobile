# iOS wallet data flows for App Privacy review

Prepared 2026-09-24. This is a code and fresh-install traffic inventory. It is
not an App Store Connect privacy answer.

| Flow | Trigger | Evidence | Open question |
| --- | --- | --- | --- |
| Wallet server | Wallet launch and sync | `app/uris/serverUris.ts`; [signed simulator run](https://github.com/Swarm-Official/swarm-mobile/actions/runs/36020885180) connected to `lwd.swarm.green:443` | Does the indexer retain IP addresses, request metadata, or wallet queries? For how long? |
| Recovery phrase and wallet file | Wallet creation and restore | `app/LoadingApp/LoadingApp.tsx`; the simulator created `wallet.dat.txt` in its app container | Confirm backup and diagnostic paths never upload the phrase or wallet file. |
| ZNS alias lookup | User enters a `.zcash` or `.zec` recipient | `screens/Send/Send.tsx` passes the server chain to `app/uris/resolveZnsName.ts`; its `clientFor` returns before the SDK call on `swarm-testnet` | Keep this route closed for SwarmTestnet. Recheck third-party requests if mainnet or Zcash testnet support returns. |
| Internet reachability | Network state changes | `app/services/netInfoPolicy.ts` disables the NetInfo HTTP check | Recheck after dependency updates. |
| Price lookup | Main chain with the mixnet ready | `ui/widgets/PriceFetcher.tsx` gates the native price call | The current SwarmTestnet build does not meet this gate. Recheck before a mainnet release. |
| Analytics and crash reporting | None found in direct dependencies | `package.json` and source search | Verify transitive native SDKs and any server-side telemetry. |

The bundled `ios/PrivacyInfo.xcprivacy` declares an empty collected-data array.
Confirm the indexer retention rules before submitting that declaration as the
App Privacy answer. The live `https://swarm.green/privacy` page describes
the website; the wallet-specific policy URLs in `app/legal/legalLinks.ts` return
HTTP 404 as of 2026-09-24.
