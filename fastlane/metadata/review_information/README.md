# App Review Information — what fastlane deliver uploads, and what only you can fill in

`notes.txt` is the "Notes for Review" field: 4,000 characters, and the one place
App Review learns that this is a wallet on a public TEST network, that there is
no login, and why the app declares background modes. It is written and ready.

Three files are **deliberately absent**, because they are facts about you and no
agent may invent them. Create them here — one line each, nothing else — and
`fastlane ios metadata` uploads them:

| File | What Apple wants | Example shape |
| --- | --- | --- |
| `first_name.txt` | the App Review contact, first name | `Ada` |
| `last_name.txt` | same, last name | `Lovelace` |
| `email_address.txt` | an address you read daily during review | `swarmofficial@atomicmail.io` |
| `phone_number.txt` | international format, e.g. `+1 555 0100` | — |

Apple calls or emails that contact if a submission raises a question, so it must
be a person who can answer within a day.

The funded-wallet idea in `docs/ios/05-APP-STORE-LISTING.md` §5 (give the
reviewer a test wallet that already holds coins) needs 24 words and a birthday
height. Those words must never be committed here: send them to Apple in the
notes field at submission time, from a wallet created for that purpose alone.
