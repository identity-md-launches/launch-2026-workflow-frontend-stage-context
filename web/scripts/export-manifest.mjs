import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { abiHash, inventory } from "./integrity.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const handoff = JSON.parse(
  await readFile(join(root, "docs/deployment-handoff.json")),
);
const network = JSON.parse(await readFile(join(root, "docs/network.json")));
const dist = join(root, "dist");
await mkdir(join(dist, "abi"), { recursive: true });
const contracts = [];
for (const contract of handoff.contracts) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(contract.name))
    throw new Error("Invalid ABI name");
  const sourcePath = `docs/abi/${contract.name}.json`;
  const bytes = await readFile(join(root, sourcePath));
  // Preserve implementation-derived ABI. When Git is present, bind it to the deployed commit too.
  let pinned;
  try {
    pinned = execFileSync(
      "git",
      ["show", `${handoff.sourceCommit}:${sourcePath}`],
      { cwd: root, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    console.log(
      "Pinned Git object unavailable; canonical ABI attestation remains required.",
    );
  }
  if (pinned && !bytes.equals(pinned))
    throw new Error("ABI differs from pinned source");
  const abi = JSON.parse(bytes);
  if (!Array.isArray(abi) || abiHash(abi) !== contract.abiHash)
    throw new Error(`ABI attestation mismatch: ${contract.name}`);
  const abiPath = `abi/${contract.name}.json`;
  await writeFile(join(dist, abiPath), bytes);
  contracts.push({
    name: contract.name,
    address: contract.address,
    abiHash: contract.abiHash,
    abiPath,
  });
}
const manifest = {
  version: 1,
  launchId: handoff.launchId,
  chainId: handoff.chainId,
  sourceCommit: handoff.sourceCommit,
  attestationHash: handoff.attestationHash,
  contracts,
  ...(handoff.poolKey ? { poolKey: handoff.poolKey } : {}),
  network: network.network,
  ...(network.walletAddChain ? { walletAddChain: network.walletAddChain } : {}),
  assets: await inventory(dist),
};
if (manifest.assets.length > 128) throw new Error("Asset budget exceeded");
await writeFile(
  join(dist, "imd-deployment.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Attested ${contracts.length} ABI; inventoried ${manifest.assets.length} exported assets.`,
);
await import("./verify-export.mjs");
