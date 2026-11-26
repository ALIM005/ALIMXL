import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const PUBLIC_DIR = join(PROJECT_ROOT, "public");
const TARGET_DIR = join(PUBLIC_DIR, "pdf-import");

const LOCK_DIR = join(PROJECT_ROOT, ".pdf-assets-copy.lock");

const require = createRequire(
  join(PROJECT_ROOT, "package.json")
);

const ASSET_FOLDERS = [
  "cmaps",
  "standard_fonts",
  "wasm",
];

async function getEntry(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function requireFile(path, label) {
  const entry = await stat(path);

  if (!entry.isFile() || entry.size === 0) {
    throw new Error(
      `${label} must be a non-empty file: ${path}`
    );
  }
}

async function requireDirectory(path, label) {
  const entry = await stat(path);

  if (!entry.isDirectory()) {
    throw new Error(
      `${label} must be a directory: ${path}`
    );
  }
}

async function sha256(path) {
  const contents = await readFile(path);

  return createHash("sha256")
    .update(contents)
    .digest("hex");
}

async function main() {
  let lockAcquired = false;
  let stagingDir = null;
  let backupCreated = false;
  let installed = false;
  let preserveStaging = false;

  try {
    await requireFile(
      join(PROJECT_ROOT, "package.json"),
      "Project package.json"
    );

    try {
      await mkdir(LOCK_DIR);
      lockAcquired = true;
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new Error(
          "Another PDF asset-copy operation may be running. " +
            `Lock: ${LOCK_DIR}. ` +
            "If an earlier process crashed, confirm it has " +
            "stopped before manually removing this lock directory."
        );
      }

      throw error;
    }

    await writeFile(
      join(LOCK_DIR, "owner.json"),
      JSON.stringify(
        {
          pid: process.pid,
          startedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );

    let packagePath;

    try {
      packagePath = require.resolve(
        "pdfjs-dist/package.json"
      );
    } catch {
      throw new Error(
        "pdfjs-dist is not installed. Run " +
          "'npm install --save-exact pdfjs-dist' " +
          "from the project root first."
      );
    }

    const packageRoot = dirname(packagePath);

    const packageInfo = JSON.parse(
      await readFile(packagePath, "utf8")
    );

    if (
      typeof packageInfo.version !== "string" ||
      !packageInfo.version.trim()
    ) {
      throw new Error(
        "Cannot determine the installed pdfjs-dist version."
      );
    }

    const sourceWorker = join(
      packageRoot,
      "build",
      "pdf.worker.min.mjs"
    );

    await requireFile(
      sourceWorker,
      "PDF.js worker"
    );

    for (const folder of ASSET_FOLDERS) {
      await requireDirectory(
        join(packageRoot, folder),
        `PDF.js ${folder}`
      );
    }

    const publicEntry = await getEntry(PUBLIC_DIR);

    if (
      publicEntry &&
      (!publicEntry.isDirectory() ||
        publicEntry.isSymbolicLink())
    ) {
      throw new Error(
        "public must be a normal directory, not a file or symlink."
      );
    }

    await mkdir(PUBLIC_DIR, {
      recursive: true,
    });

    const targetEntry = await getEntry(TARGET_DIR);

    if (
      targetEntry &&
      (!targetEntry.isDirectory() ||
        targetEntry.isSymbolicLink())
    ) {
      throw new Error(
        "public/pdf-import must be a normal directory, " +
          "not a file or symlink."
      );
    }

    stagingDir = await mkdtemp(
      join(PROJECT_ROOT, ".pdf-assets-stage-")
    );

    const preparedDir = join(
      stagingDir,
      "prepared"
    );

    const backupDir = join(
      stagingDir,
      "previous"
    );

    await mkdir(preparedDir);

    const preparedWorker = join(
      preparedDir,
      "pdf.worker.min.mjs"
    );

    await copyFile(
      sourceWorker,
      preparedWorker
    );

    for (const folder of ASSET_FOLDERS) {
      await cp(
        join(packageRoot, folder),
        join(preparedDir, folder),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
          dereference: true,
        }
      );
    }

    await requireFile(
      preparedWorker,
      "Copied PDF.js worker"
    );

    for (const folder of ASSET_FOLDERS) {
      await requireDirectory(
        join(preparedDir, folder),
        `Copied ${folder}`
      );
    }

    const sourceHash = await sha256(
      sourceWorker
    );

    const copiedHash = await sha256(
      preparedWorker
    );

    if (sourceHash !== copiedHash) {
      throw new Error(
        "Worker verification failed: copied file does not match source."
      );
    }

    await writeFile(
      join(preparedDir, "asset-manifest.json"),
      JSON.stringify(
        {
          package: "pdfjs-dist",
          version: packageInfo.version,
          worker: "pdf.worker.min.mjs",
          workerSha256: copiedHash,
          assetFolders: ASSET_FOLDERS,
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    if (targetEntry) {
      await rename(
        TARGET_DIR,
        backupDir
      );

      backupCreated = true;
    }

    try {
      await rename(
        preparedDir,
        TARGET_DIR
      );

      installed = true;
    } catch (installError) {
      if (backupCreated) {
        try {
          await rename(
            backupDir,
            TARGET_DIR
          );

          backupCreated = false;
        } catch (restoreError) {
          preserveStaging = true;

          throw new Error(
            "Installing the new assets failed, and automatic " +
              "restoration also failed. " +
              `Previous assets remain at: ${backupDir}. ` +
              `Install error: ${installError.message}. ` +
              `Restore error: ${restoreError.message}.`
          );
        }
      }

      throw installError;
    }

    console.log(
      `[PDF assets] Ready: pdfjs-dist ${packageInfo.version}`
    );

    console.log(
      `[PDF assets] Destination: ${TARGET_DIR}`
    );

    console.log(
      `[PDF assets] Worker SHA-256: ${copiedHash}`
    );

    console.log(
      "[PDF assets] Worker, cmaps, standard_fonts and wasm copied."
    );
  } finally {
    if (stagingDir && !preserveStaging) {
      try {
        await rm(stagingDir, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        console.warn(
          "[PDF assets] Temporary-directory cleanup failed:",
          error.message
        );
      }
    }

    if (lockAcquired) {
      try {
        await rm(LOCK_DIR, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        console.warn(
          "[PDF assets] Lock cleanup failed:",
          error.message
        );
      }
    }

    if (preserveStaging && !installed) {
      console.error(
        "[PDF assets] Recovery files were preserved. " +
          "Do not delete the staging directory until recovery is complete."
      );
    }
  }
}

main().catch((error) => {
  console.error(
    "[PDF assets] FAILED:",
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exitCode = 1;
});