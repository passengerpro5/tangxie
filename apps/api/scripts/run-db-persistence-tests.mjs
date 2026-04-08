import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(import.meta.dirname, "..");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

async function main() {
  const testFiles = [
    "test/admin-ai-prisma.e2e-spec.ts",
    "test/tasks-prisma.e2e-spec.ts",
    "test/scheduling-reminders-prisma.e2e-spec.ts",
  ];

  for (const file of testFiles) {
    await run("node", ["--experimental-strip-types", "--test", file]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
