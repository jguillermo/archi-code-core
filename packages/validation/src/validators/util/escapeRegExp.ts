/**
 * Escapes every character with special meaning in a RegExp — including `-`, `]` and `\`, which
 * matter inside a character class — so user-supplied text can be interpolated literally.
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}
