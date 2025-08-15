#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Components that are actually used based on the grep results
const usedComponents = [
  'button', 'card', 'toast', 'toaster', 'tooltip', 'textarea', 
  'badge', 'dialog', 'input', 'progress'
];

// All Radix components in package.json
const allRadixComponents = [
  'accordion', 'alert-dialog', 'aspect-ratio', 'avatar', 'checkbox',
  'collapsible', 'context-menu', 'dialog', 'dropdown-menu', 'hover-card',
  'label', 'menubar', 'navigation-menu', 'popover', 'progress',
  'radio-group', 'scroll-area', 'select', 'separator', 'slider',
  'slot', 'switch', 'tabs', 'toast', 'toggle', 'toggle-group', 'tooltip'
];

const unusedComponents = allRadixComponents.filter(
  comp => !usedComponents.includes(comp.replace('-', ''))
);

console.log('Unused Radix UI components that can be removed:');
console.log('================================================');
unusedComponents.forEach(comp => {
  console.log(`npm uninstall @radix-ui/react-${comp}`);
});

console.log('\nRun these commands to remove unused dependencies:');
console.log(`npm uninstall ${unusedComponents.map(c => `@radix-ui/react-${c}`).join(' ')}`);