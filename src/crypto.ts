// cipher-suite.ts
import crypto from 'crypto';
import {CRYPTO_KEY} from '../config/constants'

export const CIPHER_SUITE = {
  encrypt(text: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(`${CRYPTO_KEY}`), Buffer.alloc(16, 0));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
  },

  decrypt(text: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(`${CRYPTO_KEY}`), Buffer.alloc(16, 0));
    let decrypted = decipher.update(Buffer.from(text, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  },
};
