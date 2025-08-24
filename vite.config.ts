import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],
    
    // Base configuration
    base: '/',
    
    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@features': resolve(__dirname, 'src/features'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@lib': resolve(__dirname, 'src/lib'),
        '@services': resolve(__dirname, 'src/services'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@types': resolve(__dirname, 'src/types'),
        '@config': resolve(__dirname, 'src/config'),
        '@data': resolve(__dirname, 'src/data'),
        '@test': resolve(__dirname, 'src/test')
      }
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: isDevelopment,
      minify: isProduction ? 'terser' : false,
      
      // Terser configuration for production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2
        },
        mangle: {
          toplevel: true
        }
      } : undefined,

      // Rollup configuration
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // Code splitting configuration
          manualChunks: isProduction ? {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-ui': ['@headlessui/react', 'lucide-react'],
            'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
            'vendor-utils': ['zod', 'dompurify', 'jose', 'bcryptjs'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-analytics': ['@vercel/analytics']
          } : undefined,
          
          // Chunk naming
          chunkFileNames: isProduction ? 'assets/js/[name]-[hash].js' : 'assets/js/[name].js',
          entryFileNames: isProduction ? 'assets/js/[name]-[hash].js' : 'assets/js/[name].js',
          assetFileNames: isProduction ? 'assets/[ext]/[name]-[hash].[ext]' : 'assets/[ext]/[name].[ext]'
        }
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Asset handling
      assetsInlineLimit: 4096, // 4KB
      
      // CSS code splitting
      cssCodeSplit: true
    },

    // Development server configuration
    server: {
      port: 3000,
      host: true,
      open: true,
      
      // Security headers for development
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    },

    // Preview configuration
    preview: {
      port: 4173,
      host: true,
      open: true
    },

    // CSS configuration
    css: {
      devSourcemap: isDevelopment,
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer')
        ]
      }
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@headlessui/react',
        'lucide-react',
        'zod',
        'dompurify'
      ],
      exclude: ['@supabase/supabase-js'] // Exclude from pre-bundling
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '2.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENVIRONMENT__: JSON.stringify(mode)
    },

    // Environment variables
    envPrefix: 'VITE_',

    // Performance optimizations
    esbuild: {
      // Remove console.log in production
      drop: isProduction ? ['console', 'debugger'] : [],
      
      // Tree shaking
      treeShaking: true
    },

    // Worker configuration
    worker: {
      format: 'es',
      plugins: [react()]
    },

    // Logging configuration
    logLevel: isDevelopment ? 'info' : 'warn',
    
    // Clear screen configuration
    clearScreen: false,

    // Custom plugins for production
    plugins: [
      react({
        // Fast refresh in development
        fastRefresh: isDevelopment,
        
        // JSX runtime
        jsxRuntime: 'automatic',
        
        // Babel configuration
        babel: {
          plugins: [
            // Add class properties support
            '@babel/plugin-proposal-class-properties',
            // Add private methods support
            '@babel/plugin-proposal-private-methods'
          ]
        }
      }),
      
      // Custom plugin for production optimizations
      {
        name: 'production-optimizations',
        apply: 'build',
        configResolved(config) {
          if (isProduction) {
            console.log('🚀 Production build optimizations enabled');
          }
        },
        generateBundle(options, bundle) {
          if (isProduction) {
            // Analyze bundle size
            let totalSize = 0;
            Object.keys(bundle).forEach(fileName => {
              const chunk = bundle[fileName];
              if (chunk.type === 'chunk' || chunk.type === 'asset') {
                totalSize += chunk.code?.length || chunk.source?.length || 0;
              }
            });
            
            console.log(`📦 Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
          }
        }
      }
    ]
  };
});
