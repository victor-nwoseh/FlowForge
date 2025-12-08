import { AES, enc } from 'crypto-js';

export const encrypt = (text: string, key: string): string => {
  return AES.encrypt(text, key).toString();
};

export const decrypt = (ciphertext: string, key: string): string => {
  try {
    const decrypted = AES.decrypt(ciphertext, key).toString(enc.Utf8);

    if (!decrypted) {
      throw new Error('Failed to decrypt token - encryption key may have changed');
    }

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt token - encryption key may have changed');
  }
};

