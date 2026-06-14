import * as crypto from 'crypto';

/**
 * Password acak kuat yang memenuhi kompleksitas (huruf besar+kecil+angka).
 * 12 byte → base64url, lalu tempel suffix kelas-karakter agar selalu lolos validasi.
 */
export function generatePassword(): string {
  const base = crypto.randomBytes(12).toString('base64url'); // ~16 char
  return `${base}Aa1`;
}

/**
 * PIN 6 digit acak (otorisasi aksi kasir: void/refund). Di-hash sebelum disimpan;
 * dikembalikan plaintext SEKALI untuk disampaikan ke kasir.
 */
export function generatePin(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}
