const { getPublicKeyAsync } = require('@noble/ed25519');
const crypto = require('crypto');

(async () => {
  // Generate random 32-byte private key
  const privKey = crypto.getRandomValues(new Uint8Array(32));
  const pubKey = await getPublicKeyAsync(privKey);
  
  console.log('ISSUER_PRIVATE_KEY=' + Buffer.from(privKey).toString('hex'));
  console.log('ISSUER_PUBLIC_KEY=' + Buffer.from(pubKey).toString('hex'));
})();