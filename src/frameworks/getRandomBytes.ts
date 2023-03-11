import { randomBytes } from 'crypto';

/**
 * @description Get a string of random bytes from the Node crypto module.
 *
 * The `length` value indicates the actual length in readable characters to produce.
 */
export function getRandomBytes(length: number) {
  const bytes = Math.floor(length / 2);
  return randomBytes(bytes).toString('hex');
}
