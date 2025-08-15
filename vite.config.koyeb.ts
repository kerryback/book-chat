import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      // Use SWC instead of Babel for faster builds
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    
    // Optimizations for Koyeb Pro
    sourcemap: false,
    minify: 'esbuild', // Faster than terser
    target: 'es2020',
    cssCodeSplit: true,
    
    // Increase chunk size limit since we have more memory
    chunkSizeWarningLimit: 2000,
    
    rollupOptions: {
      output: {
        // Simple, working chunking strategy
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-progress'
          ],
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns'],
        },
      },
      
      // Use more parallel operations on Pro tier
      maxParallelFileOps: 5,
    },
    
    // Optimize CSS
    cssMinify: true,
    
    // Report compressed size
    reportCompressedSize: false,
    
    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  
  // Optimize deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'wouter',
    ],
    exclude: ['@neondatabase/serverless'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});