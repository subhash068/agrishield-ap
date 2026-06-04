import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { 
      preset: "vercel", // Tell Nitro/Vinxi to build for Vercel serverless functions
      entry: "server" 
    },
  },
});
