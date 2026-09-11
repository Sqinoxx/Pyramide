import { execFileSync } from "node:child_process";

/** Tears down the isolated E2E stack, including its tmpfs data. */
export default async function globalTeardown() {
  console.log("[e2e] stopping postgres-e2e + maildev-e2e…");
  execFileSync(
    "docker",
    ["compose", "-f", "docker-compose.e2e.yml", "-p", "pyramide-e2e", "down", "-v"],
    { stdio: "inherit" },
  );
}
