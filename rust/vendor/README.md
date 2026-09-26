# SWARM address encoding and network-identity sources

Four crates are vendored here, and every one of them is a crate that matches
`zcash_protocol`'s `NetworkType` or `BranchId` **exhaustively**. Cargo ignores a
dependency's own `[patch]` table, so this workspace carries the SDK's patches
itself, in `rust/Cargo.toml`'s `[patch.crates-io]`.

| crate | version | archive SHA-256 | provenance |
| --- | --- | --- | --- |
| `zcash_address` | 0.13.0 | `5a854b28c07dba372f4410ea8ad62b4bf7d5c2bf8be32fc4b31bc0db6521a975` | vendored for the SWARM testnet prefix; SWARM production arms added 2026-09-26 |
| `zcash_protocol` | 0.10.5 | `314329b91ec4bbb517441840e47d0b2029bf0b946f086980c96c889c2d92dc5d` | same |
| `zcash_primitives` | 0.30.1 | `403d5be1e96339534be098e3377fb8a78d68ca7585b1780133d884b810277418` | newly vendored 2026-09-26, `https://static.crates.io/crates/zcash_primitives/zcash_primitives-0.30.1.crate` |
| `zcash_transparent` | 0.10.0 | `547c012778bae17f58007731af074d638aa146ab0ecfc120adebf23d049aff6c` | newly vendored 2026-09-26, `https://static.crates.io/crates/zcash_transparent/zcash_transparent-0.10.0.crate` |

## Where these bytes came from

All four were taken **verbatim** from the desktop wallet
(`Swarm-Official/privacy-wallet`, branch `codex/mainnet-wallet-mainnet-20260925`,
commit `d08e17e2`, directory `native/vendor/`), which built and tested them
against SDK revision `d9f1a5b888067724b61b2fae46307ed56b4b1e0a` on four
platforms. The two wallets talk to the same indexers and sign with the same
rules, so vendoring the same bytes rather than re-deriving them is the point:
a difference between the two copies would be a difference in what a SWARM
address means.

The version numbers match this workspace's existing `rust/Cargo.lock` exactly
, `zcash_protocol` 0.10.5, `zcash_address` 0.13.0, `zcash_transparent` 0.10.0,
`zcash_primitives` 0.30.1. So no version moved to take the patches. The
desktop copies of `zcash_protocol` and `zcash_address` were verified to be
strict supersets of the ones this repository already carried: the SWARM
**testnet** work (the `swarm1…` unified HRP and the typed `utest1…` legacy
aliases) is present in them unchanged, with the SWARM **production** arms added
on top.

What each patch does:

- `zcash_protocol` gains `NetworkType::SwarmMain`, `constants/swarm_mainnet.rs`
  and `BranchId::SwarmMain` = `0x53574d31`, which selects the NU6.3 rule
  revision. `NetworkType::has_upstream_consensus_schedule()` answers `false` for
  `SwarmMain`, so the SWARM production schedule can never fall back to
  upstream Zcash values.
- `zcash_address` decodes and encodes the SWARM production HRPs and version
  bytes. The production HRP is tested **first** and has no aliases, so it can
  never be swallowed by the historical testnet alias arm.
- `zcash_transparent` carries the SDK's `zip48.rs`: `pub_prefix` returns
  `Option<Prefix>` and answers `None` for `SwarmMain` rather than reusing
  Zcash's `xpub` or `tpub`.
- `zcash_primitives` carries the consensus-branch-domain change. This is the
  desktop's semantic port to 0.30.1 (the SDK vendored 0.30.0, and the two
  upstream releases differ in the files the change touches); the port was
  diffed against the SDK's own delta and the two are character-for-character
  identical.

## The rule this directory exists to enforce

If a `cargo update` pulls a version of a crate that matches `NetworkType` or
`BranchId` exhaustively and is **not** vendored here, it will fail to compile
against the patched `zcash_protocol`. That is the intended failure mode: it is
how a crate that could quietly fold SWARM production into Zcash Mainnet
announces itself. Vendor it the same way rather than reaching for a wildcard
arm.

`.github/workflows/swarm-rust-lockfile.yml` checks, on every change to
`rust/Cargo.toml` or to this directory, that all four still resolve from
`vendor/` and not from crates.io.

## Standalone tests

Each of the three crates that depends on another vendored one carries a
`.cargo/config.toml` reproducing this workspace's patch resolution, so
`cargo test --manifest-path vendor/<crate>/Cargo.toml --config
vendor/<crate>/.cargo/config.toml` tests against the SWARM constants rather
than against crates.io's.
