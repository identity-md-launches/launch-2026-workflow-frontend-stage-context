import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "committed-runtime-config-in-development",
      configureServer(server) {
        // Development uses the same deployment manifest and attested ABIs as the export.
        server.middlewares.use((request, response, next) => {
          const path = request.url?.split("?")[0];
          if (
            path !== "/imd-deployment.json" &&
            !/^\/abi\/[A-Za-z][A-Za-z0-9_]*\.json$/.test(path || "")
          )
            return next();
          readFile(new URL(`../dist${path}`, import.meta.url))
            .then((bytes) => {
              response.setHeader("Content-Type", "application/json");
              response.end(bytes);
            })
            .catch(() => {
              response.statusCode = 404;
              response.end(
                "Build the committed export with npm run build first.",
              );
            });
        });
      },
    },
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
