import * as crypto from 'crypto';

const Crypto = {
  encrypt(value: string, key: string): string {
    try {
      const iv = crypto.randomBytes(16); // Initialization Vector
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + encrypted; // Prepend IV for decryption
    } catch (error) {
      console.error('Encryption error:', error);
      return ''; // Or throw an error, depending on your error handling strategy
    }
  },
  
  generatekey(keyLength = 32) {
    return crypto.randomBytes(keyLength).toString('hex');
  },

  decrypt(encryptedValue: string, key: string): string {
    try {
      const ivHex = encryptedValue.slice(0, 32); // Extract IV (32 hex chars = 16 bytes)
      const encryptedText = encryptedValue.slice(32);
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      Zotero.log('Decryption error: '+error);
      return '';
    }
  },
  
  SHA256(data: string)
  {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
};


export default Crypto;