// Minimal browser shim for Node's 'crypto' module, wired in via the
// "browser" field in package.json. Replaces crypto-browserify so the
// unused elliptic/bn.js/public-key code (npm advisory GHSA-848j-6mx2-7j84)
// stays out of the bundle. Only the primitives actually consumed are
// provided: src/Core/Crypto.ts (randomBytes, AES-CBC, SHA-256) and
// exceljs lib/utils/encryptor.js (createHash, getHashes, randomBytes).
const randomBytes = require('randombytes');
const createHash = require('create-hash');
const cipher = require('browserify-cipher');

module.exports = {
  randomBytes,
  createHash,
  createCipheriv: cipher.createCipheriv,
  createDecipheriv: cipher.createDecipheriv,
  getCiphers: cipher.getCiphers,
  // create-hash supports exactly these algorithms
  getHashes: () => ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160', 'ripemd160'],
};
