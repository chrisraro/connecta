#!/usr/bin/env node

/**
 * First Admin User Setup Script
 * 
 * This script grants admin role to an existing user in your Convex database.
 * Run this AFTER deploying the new schema with `npx convex deploy`
 * 
 * Usage:
 *   npx tsx scripts/setup-first-admin.ts <clerk-id>
 * 
 * Example:
 *   npx tsx scripts/setup-first-admin.ts user_2aB3cD4eF5gH6iJ7kL8mN9oP0qR
 */

import { spawn } from 'child_process';

const clerkId = process.argv[2];

if (!clerkId) {
  console.error('❌ Error: Clerk ID is required');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/setup-first-admin.ts <clerk-id>');
  console.log('\nTo find your Clerk ID:');
  console.log('  1. Go to https://dashboard.clerk.com');
  console.log('  2. Navigate to Users');
  console.log('  3. Click on your admin user');
  console.log('  4. Copy the User ID (starts with "user_")');
  process.exit(1);
}

console.log('🔧 Setting up first admin user...\n');
console.log(`Clerk ID: ${clerkId}\n`);

// Use Convex CLI to run the mutation
const convexProcess = spawn('npx', ['convex', 'run', 'admin:setupFirstAdmin', `--clerkId=${clerkId}`], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

convexProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Admin user setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Visit http://localhost:3000/admin/auth to login');
    console.log('  2. Use the same Clerk account you just granted admin to');
    console.log('  3. You will be redirected to the admin dashboard');
  } else {
    console.error('\n❌ Failed to setup admin user');
    console.error('Make sure you have deployed the schema first:');
    console.error('  npx convex deploy');
  }
  process.exit(code || 0);
});
