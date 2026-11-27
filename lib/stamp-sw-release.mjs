import { readFileSync, writeFileSync } from "node:fs";

const sha = process.env.VERCEL_GIT_COMMIT_SHA;

if (!sha) {
  console.log("sw release: unchanged (not running on Vercel)");
  process.exit(0);
}

const file = new URL("../public/sw.js", import.meta.url);
const text = readFileSync(file, "utf8");
const release = `v10-${sha.slice(0, 8)}`;

const next = text.replace(
  /const APP_RELEASE = "[^"]*";/,
  `const APP_RELEASE = "${release}";`
);

if (next === text && !text.includes(release)) {
  console.error("sw release: APP_RELEASE line not found in public/sw.js");
  process.exit(1);
}

writeFileSync(file, next);
console.log("sw release:", release);