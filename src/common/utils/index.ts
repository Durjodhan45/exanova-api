/**
 * Rounds a number to a fixed number of decimal places safely.
 */
export function roundToPrecision(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Decimal addition
 */
export function addDecimals(a: number | string, b: number | string): number {
  const valA = typeof a === 'string' ? parseFloat(a) : a;
  const valB = typeof b === 'string' ? parseFloat(b) : b;
  return roundToPrecision(valA + valB);
}

/**
 * Decimal subtraction
 */
export function subtractDecimals(a: number | string, b: number | string): number {
  const valA = typeof a === 'string' ? parseFloat(a) : a;
  const valB = typeof b === 'string' ? parseFloat(b) : b;
  return roundToPrecision(valA - valB);
}

/**
 * Decimal multiplication
 */
export function multiplyDecimals(a: number | string, b: number | string): number {
  const valA = typeof a === 'string' ? parseFloat(a) : a;
  const valB = typeof b === 'string' ? parseFloat(b) : b;
  return roundToPrecision(valA * valB);
}

/**
 * Decimal division
 */
export function divideDecimals(a: number | string, b: number | string): number {
  const valA = typeof a === 'string' ? parseFloat(a) : a;
  const valB = typeof b === 'string' ? parseFloat(b) : b;
  if (valB === 0) return 0;
  return roundToPrecision(valA / valB);
}

/**
 * Shuffles an array immutably using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Validates a UUID v4 string
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
