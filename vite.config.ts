import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { 
      preset: "vercel", // Tell Nitro/Vinxi to build for Vercel serverless functions
      entry: "server" 
    },
  } ,
  server: {
    port: 8080,
    hmr: {
      clientPort: 8080,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message.includes('@tanstack')) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'leaflet';
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('lucide-react')) return 'lucide-react';
            if (id.includes('@tanstack')) return 'tanstack';
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            return 'vendor';
          }
        }
      }
    }
  }
});
