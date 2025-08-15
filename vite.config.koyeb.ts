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
        // Better chunking strategy
        manualChunks: {
          // React ecosystem
          'react-core': ['react', 'react-dom'],
          'react-router': ['wouter'],
          'react-query': ['@tanstack/react-query'],
          
          // UI libraries
          'ui-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-progress'
          ],
          'ui-components': [
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          
          // Heavy libraries
          'icons': ['lucide-react', 'react-icons'],
          'math': ['katex', 'react-katex'],
          
          // Utilities
          'utils': ['date-fns', 'zod'],
        },
        
        // Asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
      
      // Use more parallel operations on Pro tier
      maxParallelFileOps: 5,
      
      // Tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
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