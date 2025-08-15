#!/bin/bash
set -e

echo "Building application for Koyeb deployment..."

# Clean previous builds
rm -rf dist

# Build the application
echo "Building client..."
npm run build

# Create a minimal package.json for production
echo "Creating production package.json..."
node -e "
const pkg = require('./package.json');
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  type: pkg.type,
  scripts: {
    start: pkg.scripts.start
  },
  dependencies: {
    '@neondatabase/serverless': pkg.dependencies['@neondatabase/serverless'],
    'drizzle-orm': pkg.dependencies['drizzle-orm'],
    'express': pkg.dependencies.express,
    'express-session': pkg.dependencies['express-session'],
    'multer': pkg.dependencies.multer,
    'openai': pkg.dependencies.openai,
    'ws': pkg.dependencies.ws,
    'connect-pg-simple': pkg.dependencies['connect-pg-simple'],
    'memorystore': pkg.dependencies.memorystore,
    'memoizee': pkg.dependencies.memoizee
  }
};
require('fs').writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));
"

# Copy necessary files
cp Procfile dist/

# Create deployment archive
echo "Creating deployment archive..."
cd dist
tar -czf ../koyeb-deploy.tar.gz .
cd ..

echo "Build complete! Deploy koyeb-deploy.tar.gz to Koyeb"