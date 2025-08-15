#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import os from 'os';

console.log('=== Build Environment Info ===');
console.log(`Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`CPUs: ${os.cpus().length}`);
console.log(`Platform: ${os.platform()}`);
console.log(`Node.js: ${process.version}`);
console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'not set'}`);
console.log('=============================\n');

const startTime = Date.now();

function logMemory(stage) {
  const used = process.memoryUsage();
  console.log(`\n[${stage}] Memory Usage:`);
  console.log(`  RSS: ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(used.external / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Free System Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
}

async function runBuild() {
  try {
    // Ensure dist directory exists
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }

    logMemory('Before Build');

    // Step 1: Clean previous builds
    console.log('\n📦 Cleaning previous builds...');
    try {
      execSync('rm -rf dist/public', { stdio: 'inherit' });
    } catch (e) {
      // Ignore if directory doesn't exist
    }

    // Step 2: Build client with Vite
    console.log('\n🏗️  Building client with Vite...');
    const viteStart = Date.now();
    
    try {
      execSync('vite build --config vite.config.koyeb.ts', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
    } catch (error) {
      console.error('❌ Vite build failed:', error.message);
      logMemory('After Vite Failure');
      process.exit(1);
    }
    
    console.log(`✅ Vite build completed in ${((Date.now() - viteStart) / 1000).toFixed(2)}s`);
    logMemory('After Vite Build');
    
    // Step 3: Let memory settle
    console.log('\n⏳ Waiting for memory to settle...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Force garbage collection if available
    if (global.gc) {
      console.log('🧹 Running garbage collection...');
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logMemory('After GC');
    
    // Step 4: Build server with esbuild
    console.log('\n🏗️  Building server with esbuild...');
    const esbuildStart = Date.now();
    
    try {
      execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
    } catch (error) {
      console.error('❌ Esbuild failed:', error.message);
      logMemory('After Esbuild Failure');
      process.exit(1);
    }
    
    console.log(`✅ Esbuild completed in ${((Date.now() - esbuildStart) / 1000).toFixed(2)}s`);
    logMemory('After Esbuild');
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Build completed successfully in ${totalTime}s!`);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    logMemory('After Error');
    process.exit(1);
  }
}

// Run with garbage collection exposed
runBuild();