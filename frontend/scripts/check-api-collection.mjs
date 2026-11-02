#!/usr/bin/env node
// Compara las rutas de src/app/api con la colección de Postman (raíz del repo).
// Uso: node scripts/check-api-collection.mjs  → exit 1 si falta alguna.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const apiDir = join(root, "src/app/api");
const collection = JSON.parse(
  readFileSync(join(root, "../nervio-api.postman_collection.json"), "utf8"),
);

const routes = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name === "route.ts") {
      const src = readFileSync(full, "utf8");
      const methods = [
        ...src.matchAll(
          /export (?:async )?(?:function|const) (GET|POST|PATCH|PUT|DELETE)\b/g,
        ),
      ].map((m) => m[1]);
      const path = `/api/${relative(apiDir, dir)}`.replace(/\\/g, "/");
      routes.push({ path, methods });
    }
  }
})(apiDir);

const requests = [];
(function walk(items) {
  for (const it of items) {
    if (it.item) walk(it.item);
    else
      requests.push({
        method: it.request.method,
        path: it.request.url.raw.replace("{{baseUrl}}", "").split("?")[0],
      });
  }
})(collection.item);

const toRegex = (p) =>
  new RegExp(
    `^${p.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+")}$`,
  );

let missing = 0;
for (const { path, methods } of routes.sort((a, b) =>
  a.path.localeCompare(b.path),
)) {
  const re = toRegex(path);
  const hits = requests.filter((r) => re.test(r.path));
  const list = methods.length ? methods : ["(handler de better-auth)"];
  for (const m of list) {
    const ok = methods.length
      ? hits.some((r) => r.method === m)
      : hits.length > 0;
    if (!ok) missing += 1;
    console.log(`${ok ? "✓" : "✗"} ${m.padEnd(6)} ${path}`);
  }
}
console.log(
  `\n${requests.length} requests en la colección; ${missing} faltantes.`,
);
process.exit(missing ? 1 : 0);
