// ─────────────────────────────────────────────────────────────
// iPaymu API v2 Utility — HMAC-SHA256 signature generator
// ─────────────────────────────────────────────────────────────
import * as crypto from 'crypto';

/**
 * Generate iPaymu signature header untuk autentikasi API.
 *
 * Formula iPaymu v2:
 *   1. bodySha256 = SHA256(JSON.stringify(payload))
 *   2. stringToSign = HTTP_METHOD:VA:bodySha256:apiKey
 *   3. signature = HMAC-SHA256(stringToSign, apiKey)
 *
 * @param method HTTP method (POST)
 * @param va Virtual Account iPaymu (dari dashboard)
 * @param body JSON.stringify(payload) — harus sama persis dengan request body
 * @param apiKey API Key iPaymu (dari dashboard)
 */
export function generateIpaymuSignature(
  method: string,
  va: string,
  body: string,
  apiKey: string,
): string {
  // 1. SHA256 dari request body
  const bodySha256 = crypto
    .createHash('sha256')
    .update(body)
    .digest('hex')
    .toLowerCase();

  // 2. String-to-sign: format resmi iPaymu v2
  const stringToSign = `${method}:${va}:${bodySha256}:${apiKey}`;

  // 3. HMAC-SHA256 dengan ApiKey sebagai secret
  return crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');
}

/**
 * Konfigurasi environment iPaymu.
 */
export interface IpaymuConfig {
  va: string;
  apiKey: string;
  isProduction: boolean;
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

export function getIpaymuUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://my.ipaymu.com/api/v2/payment'
    : 'https://sandbox.ipaymu.com/api/v2/payment';
}
