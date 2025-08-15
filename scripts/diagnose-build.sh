#!/bin/bash

echo "=== Koyeb Build Diagnostics ==="
echo "Date: $(date)"
echo ""

echo "System Information:"
echo "==================="
echo "Memory: $(free -h | grep Mem | awk '{print $2}') total, $(free -h | grep Mem | awk '{print $3}') used"
echo "Swap: $(free -h | grep Swap | awk '{print $2}') total, $(free -h | grep Swap | awk '{print $3}') used"
echo "CPU: $(nproc) cores"
echo "Disk: $(df -h / | tail -1 | awk '{print $4}') free"
echo ""

echo "Node.js Information:"
echo "===================="
node --version
npm --version
echo "NODE_OPTIONS: ${NODE_OPTIONS:-not set}"
echo ""

echo "Package Analysis:"
echo "================="
echo "Total dependencies: $(npm ls --depth=0 2>/dev/null | wc -l)"
echo "Production dependencies: $(npm ls --prod --depth=0 2>/dev/null | wc -l)"
echo ""

echo "Largest node_modules directories:"
du -sh node_modules/* 2>/dev/null | sort -hr | head -10
echo ""

echo "Build Test:"
echo "==========="
echo "Testing build with monitoring..."
npm run build:koyeb

echo ""
echo "Build artifacts:"
echo "==============="
if [ -d "dist" ]; then
    echo "dist/ directory size: $(du -sh dist | cut -f1)"
    echo "dist/public size: $(du -sh dist/public 2>/dev/null | cut -f1 || echo 'N/A')"
    echo "dist/index.js size: $(ls -lh dist/index.js 2>/dev/null | awk '{print $5}' || echo 'N/A')"
else
    echo "No dist directory found!"
fi

echo ""
echo "=== Diagnostics Complete ==="