import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // Inline Leaflet's three bundled PNGs before CSS URL resolution. Vite's
    // resolver otherwise treats the # in this workspace path as a fragment.
    { name: 'leaflet-inline-assets', enforce: 'pre', transform(source, id) {
      if (!id.split('?')[0].endsWith('/leaflet/dist/leaflet.css')) return;
      return source.replace(/url\(images\/([a-z0-9-]+\.png)\)/g, (_match, name: string) =>
        `url(data:image/png;base64,${readFileSync(path.join(__dirname, 'node_modules/leaflet/dist/images', name)).toString('base64')})`);
    } },
    {
      name: 'serve-built-dist',
      configureServer(server) {
        const distWeb = path.resolve(__dirname, 'dist/web');
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/' || req.url.startsWith('/assets/') || req.url === '/index.html')) {
            const cleanUrl = req.url.split('?')[0];
            const filePath = cleanUrl === '/' ? path.join(distWeb, 'index.html') : path.join(distWeb, cleanUrl);
            if (existsSync(filePath)) {
              const mime = filePath.endsWith('.js')
                ? 'text/javascript'
                : filePath.endsWith('.css')
                ? 'text/css'
                : filePath.endsWith('.png')
                ? 'image/png'
                : filePath.endsWith('.svg')
                ? 'image/svg+xml'
                : 'text/html';
              res.setHeader('Content-Type', mime);
              return res.end(readFileSync(filePath));
            }
          }
          next();
        });
      },
    },
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/project-images": "http://localhost:8787",
    },
    fs: {
      allow: [__dirname, path.resolve(__dirname, "..")],
    },
  },
  build: { outDir: "dist/web" },
});
