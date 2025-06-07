#!/usr/bin/env node

const crypto = require('crypto');

// Generate a secure random secret
const secret = crypto.randomBytes(32).toString('base64');

console.log('Generated NEXTAUTH_SECRET:');
console.log(secret);
console.log('\nAdd this to your .env.local file:');
console.log(`NEXTAUTH_SECRET=${secret}`);