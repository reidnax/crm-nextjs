#!/usr/bin/env node

/**
 * Quick script to generate NEXTAUTH_SECRET for your .env file
 * Run with: node generate-auth-secret.js
 */

const crypto = require("crypto");

console.log("🔐 Generating NextAuth Secret...\n");

// Generate a cryptographically secure random secret
const secret = crypto.randomBytes(32).toString("base64");

console.log("✅ Generated NEXTAUTH_SECRET:");
console.log(`NEXTAUTH_SECRET="${secret}"`);
console.log("\n📋 Add this to your .env.local file:\n");

console.log(`# Required Environment Variables
DATABASE_URL="your-database-url-here"
NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="http://localhost:3000"
`);

console.log("🚨 IMPORTANT:");
console.log("1. Copy the NEXTAUTH_SECRET to your .env.local file");
console.log("2. Never commit this secret to version control");
console.log("3. Use a different secret for production");
console.log("4. Restart your development server after adding the secret\n");
