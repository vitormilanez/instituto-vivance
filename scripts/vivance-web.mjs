import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = process.argv[2] ?? "dev";
if (!["dev", "build", "start"].includes(command))
  throw new Error("Use dev, build or start");
const envFile = new URL("../.env.development.local", import.meta.url);
if (existsSync(envFile)) loadEnvFile(fileURLToPath(envFile));
const app = new URL("../apps/web/", import.meta.url);
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL("node_modules/next/dist/bin/next", app)),
    command,
    ...process.argv.slice(3),
  ],
  {
    cwd: fileURLToPath(app),
    env: process.env,
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", () => {
  console.error("Instale as dependências de apps/web com npm ci.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
