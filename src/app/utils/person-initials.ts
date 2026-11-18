/// <reference lib="es2022.intl" />
/** Initials from whole graphemes, preserving combined accents and emoji. */
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const SUFFIX = /^(?:jr\.?|sr\.?|ii|iii|iv)$/i;
export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && SUFFIX.test(words.at(-1)!)) words.pop();
  // Older browsers keep a whole accented letter or code point rather than splitting UTF-16.
  const first = (word: string) => segmenter?.segment(word)[Symbol.iterator]().next().value?.segment
    ?? word.match(/[\p{L}\p{N}]\p{M}*/u)?.[0] ?? Array.from(word)[0] ?? "";
  if (!words.length) return "?";
  return (first(words[0]!) + (words.length > 1 ? first(words.at(-1)!) : "")).toLocaleUpperCase();
}
