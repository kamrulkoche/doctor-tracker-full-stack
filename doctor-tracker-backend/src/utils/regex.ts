/** Escapes every regex metacharacter so user input is always matched literally. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" matcher built from untrusted input. */
export function containsRegex(input: string): RegExp {
  return new RegExp(escapeRegex(input), 'i');
}
