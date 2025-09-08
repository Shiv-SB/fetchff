const PRIME_MULTIPLIER = 31;

/**
 * Computes a polynomial rolling hash for a given string.
 * This is a non-cryptographic hash function designed for speed,
 * commonly used in hash tables and string matching algorithms.
 * Note: The result is a signed 32-bit integer, returned as a string.
 * Negative values are possible due to 32-bit overflow.
 *
 * @param str Input string to hash
 * @returns {string} Hash (decimal string representation)
 */
export function hash(str: string): string {
  const len = str.length;
  let hash = 0;

  for (let i = 0; i < len; i++) {
    const char = str.charCodeAt(i);
    hash = (hash * PRIME_MULTIPLIER + char) | 0; // wrap to 32-bit signed int
  }

  return String(hash);
}
