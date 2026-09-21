/**
 * SWARM: the three design-system typefaces are bundled INSIDE the app.
 *
 * React Native's asset linking copies everything in `assets/fonts` into the
 * APK at build time, so the app never fetches a font over the network - which
 * would leak that it was opened, and to whom, before the wallet has done
 * anything else.
 *
 * The .ttf files come from the pinned `@expo-google-fonts/*` packages, which
 * ship the upstream Google Fonts releases; the SIL Open Font Licence 1.1 text
 * for each family sits next to them in `assets/fonts`.
 *
 * On Android the value passed to `fontFamily` is the FILE name, so the files
 * are named for the family and weight they contain
 * (`Sora-SemiBold.ttf` -> `fontFamily: 'Sora-SemiBold'`). See
 * `app/theme/typography.ts`, which is the only place those names are written.
 */
module.exports = {
  project: {
    android: {},
  },
  assets: ['./assets/fonts'],
};
