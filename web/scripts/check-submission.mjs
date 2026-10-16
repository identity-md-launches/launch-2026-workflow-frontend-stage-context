import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const allowed = (p) =>
  p === "web/.gitignore" ||
  (/^(web|dist|docs)\//.test(p) &&
    !p
      .split("/")
      .slice(1)
      .some((part) => part.startsWith(".")));
const trackedChanges = git("diff", "--name-only", "HEAD")
  .split("\n")
  .filter(Boolean);
const newFiles = git("ls-files", "--others", "--exclude-standard")
  .split("\n")
  .filter(Boolean);
const changes = [...new Set([...trackedChanges, ...newFiles])].filter(
  (p) => !p.startsWith("test/scratch/"),
);
for (const p of changes) assert.ok(allowed(p), `Out-of-scope file: ${p}`);
const all = git("ls-files", "--cached", "--others", "--exclude-standard")
  .split("\n")
  .filter((p) => p && !p.startsWith("test/scratch/"));
let total = 0,
  delivered = 0;
for (const p of all) {
  const info = await lstat(join(root, p));
  assert.ok(!info.isSymbolicLink(), `Unexpected symlink: ${p}`);
  if (!info.isFile()) continue;
  assert.ok(
    !/(^|\/)(node_modules|\.npm|\.cache|\.vite|\.pnpm-store|playwright-report|test-results)(\/|$)|\.tgz$/.test(
      p,
    ),
    `Generated artifact in submission: ${p}`,
  );
  total += info.size;
  if (changes.includes(p)) delivered += info.size;
}
assert.equal(
  git("ls-files", "--stage")
    .split("\n")
    .some((line) => line.startsWith("160000 ")),
  false,
  "Submodules are forbidden",
);
// A raw file budget is deliberately more conservative than compressed Git objects.
assert.ok(
  total < 7 * 1024 * 1024,
  "Leave at least 1 MiB below the 8 MiB Git-bundle budget",
);
const manifest = JSON.parse(
  await readFile(join(root, "dist/imd-deployment.json")),
);
const report = {
  limitBytes: 8388608,
  submissionRawFileBytes: total,
  newOrChangedFileBytes: delivered,
  changedFileCount: changes.length,
  exportAssetCount: manifest.assets.length,
  onlyAllowedChanges: true,
  noSubmodules: true,
  noDependencyOrCacheArtifacts: true,
  method:
    "Sum all submission file bytes, including unchanged tracked source; reserve at least 1 MiB for Git metadata/history and compression overhead. Dependency/cache trees and test/scratch are excluded by Git ignore or assignment scope.",
};
await writeFile(
  join(root, "docs/validation/submission-budget.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
