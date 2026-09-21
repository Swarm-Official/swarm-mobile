/**
 * The SWARM type system.
 *
 * Three families, each with a job the design system states plainly:
 *
 *   Sora            display and headings - geometric, slightly wide
 *   Manrope         body and UI
 *   JetBrains Mono  anything that is a number, hash or address
 *
 * That last rule is not decoration. An address or an amount rendered in a
 * proportional face is harder to compare character by character, and
 * comparing an address character by character is exactly what a wallet asks
 * its user to do.
 *
 * All three are bundled in the APK from `assets/fonts` (see
 * `react-native.config.js`); nothing is fetched at runtime.
 *
 * On Android, `fontFamily` resolves to the bundled FILE name, and a weight
 * given through `fontWeight` is ignored for a custom family - the weight has
 * to be baked into the family name. So these constants pair a family with its
 * weight, and callers pick a constant rather than a family plus a weight.
 */

export const fontFamily = {
  /** Sora 400. Display and headings at their lightest. */
  displayRegular: 'Sora-Regular',
  /** Sora 600. Section headings, button labels, screen titles. */
  displaySemiBold: 'Sora-SemiBold',
  /** Sora 700. Balance figures and the largest display type. */
  displayBold: 'Sora-Bold',

  /** Manrope 400. Body copy and most UI text. */
  bodyRegular: 'Manrope-Regular',
  /** Manrope 500. Emphasised body, list titles, input labels. */
  bodyMedium: 'Manrope-Medium',
  /** Manrope 600. The heaviest body weight; prefer Sora above this. */
  bodySemiBold: 'Manrope-SemiBold',

  /** JetBrains Mono 400. Addresses, hashes, heights, timestamps. */
  monoRegular: 'JetBrainsMono-Regular',
  /** JetBrains Mono 500. Amounts, fees, status values, kickers. */
  monoMedium: 'JetBrainsMono-Medium',
} as const;

/**
 * The design system's type scale. Sizes and letter-spacing only - the weight
 * travels with the family name above.
 */
export const typeScale = {
  display: { fontSize: 64, letterSpacing: -0.04 * 64 },
  h1: { fontSize: 40, letterSpacing: -0.02 * 40 },
  h2: { fontSize: 28, letterSpacing: -0.015 * 28 },
  screenTitle: { fontSize: 26, letterSpacing: -0.02 * 26 },
  bodyLarge: { fontSize: 18, letterSpacing: 0 },
  body: { fontSize: 15, letterSpacing: 0 },
  mono: { fontSize: 13, letterSpacing: 0.02 * 13 },
  /**
   * The all-caps mono eyebrow above a section. The design system sets these
   * very wide; at these sizes the tracking is what makes them read as a label
   * rather than as text.
   */
  kicker: { fontSize: 10, letterSpacing: 0.2 * 10 },
} as const;

/**
 * The masked form of a hidden amount.
 *
 * U+2B22 BLACK HEXAGON, one cell of the hive per digit. This is the string
 * the design system uses wherever a shielded value must not be shown, and it
 * carries the ticker so a masked balance still says which coin it is.
 */
export const MASKED_AMOUNT = '⬢⬢⬢.⬢⬢';

/** The masked amount with its ticker, e.g. for a balance line. */
export const maskedAmountWithTicker = (ticker: string): string =>
  `${MASKED_AMOUNT} ${ticker}`;

/**
 * Letter-spacing for a masked value. The hexagons are set wider than normal
 * mono so a mask never reads as a number that happens to be unfamiliar.
 */
export const MASKED_LETTER_SPACING = 0.12 * 13;
