import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { abiHash, canonical, inventory } from "./integrity.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const dist = join(root, "dist");
const read = async (path) => JSON.parse(await readFile(join(root, path)));
const m = await read("dist/imd-deployment.json");
const h = await read("docs/deployment-handoff.json");
const n = await read("docs/network.json");
const expectedKeys = [
  "version",
  "launchId",
  "chainId",
  "sourceCommit",
  "attestationHash",
  "contracts",
  "assets",
  "network",
  ...(n.walletAddChain ? ["walletAddChain"] : []),
  ...(h.poolKey ? ["poolKey"] : []),
].sort();
assert.deepEqual(Object.keys(m).sort(), expectedKeys);
assert.equal(m.version, 1);
for (const key of ["launchId", "chainId", "sourceCommit", "attestationHash"])
  assert.equal(m[key], h[key]);
assert.equal(canonical(m.network), canonical(n.network));
assert.equal(canonical(m.walletAddChain), canonical(n.walletAddChain));
assert.equal(canonical(m.poolKey), canonical(h.poolKey));
assert.equal(m.network.chainId, m.chainId);
assert.equal(m.contracts.length, h.contracts.length);
const safePath = (p) =>
  typeof p === "string" &&
  !p.startsWith("/") &&
  !p.includes("..") &&
  !p.includes(":") &&
  !p.includes("\\");
for (let i = 0; i < m.contracts.length; i++) {
  const c = m.contracts[i],
    original = h.contracts[i];
  assert.deepEqual(
    Object.keys(c).sort(),
    ["name", "address", "abiHash", "abiPath"].sort(),
  );
  for (const k of ["name", "address", "abiHash"])
    assert.equal(c[k], original[k]);
  assert.ok(safePath(c.abiPath));
  assert.equal(abiHash(await read(`dist/${c.abiPath}`)), c.abiHash);
}
assert.ok(m.assets.length <= 128);
for (const a of m.assets) {
  assert.ok(safePath(a.path));
  assert.match(a.sha256, /^[0-9a-f]{64}$/);
}
assert.deepEqual(m.assets, await inventory(dist));
const bytes = (
  await Promise.all(m.assets.map((a) => stat(join(dist, a.path))))
).reduce((sum, s) => sum + s.size, 0);
assert.ok(bytes < 32 * 1024 * 1024);
console.log(
  `Export integrity passed: ${m.assets.length} assets, ${bytes} bytes, exact handoff and network.`,
);
