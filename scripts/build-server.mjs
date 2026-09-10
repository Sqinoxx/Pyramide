// Bundles the Node-only entrypoints (DB migration runner, cron worker) into
// self-contained CJS files. Kept separate from `next build` so the runtime
// Docker image doesn't need dev tooling (tsx, ts-node) or the full
// node_modules tree just to run a migration or the worker loop.
import { build } from "esbuild";

const targets = [
  { entry: "src/db/migrate.ts", out: "dist-server/migrate.js" },
  { entry: "src/worker/index.ts", out: "dist-server/worker.js" },
];

for (const { entry, out } of targets) {
  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    sourcemap: true,
    // postgres.js and drizzle-orm are pure JS — safe to bundle.
    external: [],
    // Without this, the "server-only" import guard used throughout
    // src/server/*.ts resolves to its throwing index.js (its package.json
    // only maps the safe empty.js under the "react-server" condition,
    // which Next.js's own bundler sets automatically but esbuild doesn't).
    // The worker imports those modules directly, so it needs this too.
    conditions: ["react-server"],
  });
  console.log(`[build-server] ${entry} -> ${out}`);
}
