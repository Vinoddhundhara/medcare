import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Support both CJS (__dirname) and ESM (import.meta.url) contexts
const getDirname = () => {
  try {
    // CJS context (bundled by esbuild)
    if (typeof __dirname !== "undefined") return __dirname;
  } catch {}
  // ESM fallback
  return path.dirname(fileURLToPath(import.meta.url));
};

export function serveStatic(app: Express) {
  // When bundled by esbuild to dist/index.cjs, __dirname is dist/
  // Vite outputs client build to dist/public/, so this resolves correctly
  const distPath = path.resolve(getDirname(), "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
