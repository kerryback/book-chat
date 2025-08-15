#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

console.log('Starting sequential build process...');

try {
  // Ensure dist directory exists
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  // Step 1: Build client with Vite
  console.log('Building client with Vite...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Small delay to let memory settle
  console.log('Client build complete. Waiting before server build...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 2: Build server with esbuild
  console.log('Building server with esbuild...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  console.log('Build process completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}