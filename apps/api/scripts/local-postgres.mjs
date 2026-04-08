import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const rootDir = path.resolve(import.meta.dirname, "..");
const nativeDir = path.join(
  rootDir,
  "node_modules",
  "@embedded-postgres",
  `${process.platform}-${process.arch}`,
  "native",
);
const binDir = path.join(nativeDir, "bin");
const libDir = path.join(nativeDir, "lib");
const dataRoot = path.join(rootDir, ".local", "postgres");
const dataDir = path.join(dataRoot, "data");
const logFile = path.join(dataRoot, "postgres.log");
const stateFile = path.join(dataRoot, "state.json");
const port = Number(process.env.TANGXIE_PG_PORT ?? 55432);
const user = process.env.TANGXIE_PG_USER ?? "postgres";
const password = process.env.TANGXIE_PG_PASSWORD ?? "postgres";
const database = process.env.TANGXIE_PG_DATABASE ?? "tangxie";

function getDatabaseUrl(dbName = database) {
  return `postgresql://${user}:${password}@127.0.0.1:${port}/${dbName}`;
}

function getEnv() {
  const inherited = { ...process.env };
  const dyld = inherited.DYLD_LIBRARY_PATH;

  return {
    ...inherited,
    DYLD_LIBRARY_PATH: dyld ? `${libDir}:${dyld}` : libDir,
  };
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: getEnv(),
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")}\n${stderr || stdout}`.trim(),
        ),
      );
    });
  });
}

async function ensureBinaries() {
  for (const name of ["initdb", "pg_ctl", "postgres"]) {
    const target = path.join(binDir, name);
    if (!(await pathExists(target))) {
      throw new Error(`Missing PostgreSQL binary: ${target}`);
    }
  }
}

async function ensureCluster() {
  await ensureBinaries();
  await mkdir(dataRoot, { recursive: true });

  if (await pathExists(path.join(dataDir, "PG_VERSION"))) {
    return;
  }

  const passwordFile = path.join(os.tmpdir(), `tangxie-pg-pass-${Date.now()}.txt`);
  await writeFile(passwordFile, `${password}\n`, "utf8");

  try {
    await run(path.join(binDir, "initdb"), [
      `--pgdata=${dataDir}`,
      "--auth=password",
      `--username=${user}`,
      `--pwfile=${passwordFile}`,
    ]);
  } finally {
    await rm(passwordFile, { force: true });
  }
}

async function startServer() {
  await ensureCluster();
  await run(path.join(binDir, "pg_ctl"), [
    "-D",
    dataDir,
    "-l",
    logFile,
    "-o",
    `-p ${port}`,
    "-w",
    "start",
  ]);
}

async function stopServer() {
  if (!(await pathExists(path.join(dataDir, "PG_VERSION")))) {
    return;
  }

  await run(path.join(binDir, "pg_ctl"), ["-D", dataDir, "-m", "fast", "stop"], {
    capture: true,
  }).catch(async (error) => {
    if (
      error instanceof Error &&
      (error.message.includes("PID file") || error.message.includes("is not a database cluster directory"))
    ) {
      return;
    }

    throw error;
  });
}

async function ensureDatabase() {
  const client = new Client({
    host: "127.0.0.1",
    port,
    user,
    password,
    database: "postgres",
  });

  await client.connect();

  try {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database],
    );

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await client.end();
  }
}

async function writeState() {
  await writeFile(
    stateFile,
    JSON.stringify(
      {
        host: "127.0.0.1",
        port,
        user,
        password,
        database,
        databaseUrl: getDatabaseUrl(),
        dataDir,
        logFile,
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function printStatus() {
  const exists = await pathExists(stateFile);
  if (!exists) {
    console.log("Local database is not initialized.");
    return;
  }

  const state = JSON.parse(await readFile(stateFile, "utf8"));
  console.log(JSON.stringify(state, null, 2));
}

async function main() {
  const action = process.argv[2] ?? "start";

  if (action === "start") {
    await startServer();
    await ensureDatabase();
    await writeState();
    console.log(`DATABASE_URL=${getDatabaseUrl()}`);
    return;
  }

  if (action === "stop") {
    await stopServer();
    console.log("Local PostgreSQL stopped.");
    return;
  }

  if (action === "status") {
    await printStatus();
    return;
  }

  throw new Error(`Unsupported action: ${action}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
