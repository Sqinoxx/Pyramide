// The single process behind playwright.config.ts's webServer entry.
//
// Playwright starts webServer and runs globalSetup CONCURRENTLY, not
// sequentially (a well-known gotcha, confirmed here by writing a filesystem
// marker at the top of a would-be globalSetup and watching it never appear
// before `next dev` was already querying — and failing against — a
// database that didn't exist yet). So instead of a separate globalSetup,
// this script does the full bring-up itself, synchronously, and only then
// execs into `next dev` — which is the thing Playwright's webServer.url
// actually waits on.
import { execFileSync, spawn } from "node:child_process";

const env = { ...process.env };

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit", env, shell: true });
}

console.error("[e2e] bringing up postgres-e2e + maildev-e2e…");
run("docker", ["compose", "-f", "docker-compose.e2e.yml", "-p", "pyramide-e2e", "up", "-d", "--wait"]);

console.error("[e2e] running migrations…");
run("npx", ["tsx", "src/db/migrate.ts"]);

console.error("[e2e] seeding…");
run("npx", ["tsx", "src/db/seed.ts"]);

console.error("[e2e] starting next dev…");
const child = spawn("npx", ["next", "dev", "-p", env.E2E_APP_PORT ?? "3100"], {
  stdio: "inherit",
  shell: true,
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
