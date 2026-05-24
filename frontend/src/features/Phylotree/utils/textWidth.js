/**
 * Estimate the pixel width of a text string rendered in Courier (monospace).
 *
 * Courier at any size has a character width ratio of ~0.60009765625,
 * identical to the value used in Phylotree v1's text_width.js.
 *
 * @param {string} text
 * @param {number} fontSize - in px (default 14, matching .rp-label in CSS)
 * @returns {number} estimated pixel width
 */
const COURIER_RATIO = 0.60009765625;

export const estimateTextWidth = (text, fontSize = 14) =>
  Math.ceil((text?.length ?? 0) * fontSize * COURIER_RATIO);
