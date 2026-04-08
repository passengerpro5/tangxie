import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");
const stateFile = path.join(rootDir, ".local", "postgres", "state.json");

async function main() {
  const argv = process.argv.slice(2);
  let cwd = rootDir;

  if (argv[0]?.startsWith("--cwd=")) {
    cwd = path.resolve(process.cwd(), argv[0].slice("--cwd=".length));
    argv.shift();
  }

  const command = argv[0];
  const args = argv.slice(1);

  if (!command) {
    throw new Error("Usage: node scripts/with-local-db.mjs <command> [...args]");
  }

  let state;
  try {
    state = JSON.parse(await readFile(stateFile, "utf8"));
  } catch {
    throw new Error(
      `Local database state not found at ${stateFile}. Run "npm run db:local:start" first.`,
    );
  }

  if (!state.databaseUrl) {
    throw new Error(`Missing databaseUrl in ${stateFile}`);
  }

  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: state.databaseUrl,
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
