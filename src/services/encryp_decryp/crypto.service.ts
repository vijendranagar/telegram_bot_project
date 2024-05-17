import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
@Injectable()
export class cryptoservice {
  private encryptionKey = this.config.get('encryption_key')
  constructor(
    private readonly config: ConfigService,
  ) { }

  async encrypt(data: string) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return { result: iv.toString('hex') + ':' + encrypted };
  }

  async decrypt(data: string) {
    const parts = data.split(':');
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return { result: decrypted.toString('utf-8') };
    } else {
      throw new Error('Input data is not in the correct format.');
    }
  }
}
