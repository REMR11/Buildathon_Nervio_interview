#!/usr/bin/env node
// Copia el worker de pdfjs-dist a public/ para la miniatura del CV (mismo origen, sin CDN).
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const src = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
if (existsSync(src)) copyFileSync(src, join(root, "public/pdf.worker.min.mjs"));
