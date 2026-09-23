# Phone screenshots

`1.png` and `2.png` are **real captures of the SWARM app**, taken in the
Android emulator by the `SWARM Android` workflow (run 35755128943), not mock-ups
and not upstream's:

| File | Screen | Where it came from |
| --- | --- | --- |
| `1.png` | Receive — shielded address and its QR code, `SWM 0`, the hive bee avatar | `swarm-smoke-evidence` artifact, `home-screen.png` |
| `2.png` | Settings — server `https://lwd.swarm.green:443` (Automatic), High Privacy, NYM Mixnet | same artifact, `network-screen-advanced.png` |

They were composed to 1440×2560 with the SWARM frame and captions by:

```sh
python scripts/store/build_store_art.py --preset play_hd \
  --manifest scripts/store/screens-android.json --raw <captures> --out <dir>
```

Play wants between two and eight phone screenshots per locale; the emulator can
also reach the wallet server (the runner's own check wrote `200`), so a fuller
set — Home, Send, History, About — is one `scripts/swarm_store_screens.sh` run
in that same emulator away. See `scripts/store/README.md`.
