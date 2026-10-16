import { keccak256, toHex } from "viem";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
export const canonical = (value) => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sort(value[key])]),
    );
  return value;
}
export const abiHash = (abi) => keccak256(toHex(canonical(abi))).slice(2);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export async function inventory(dir, prefix = "") {
  const files = [];
  for (const item of (
    await readdir(join(dir, prefix), { withFileTypes: true })
  ).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix + item.name;
    if (item.isSymbolicLink())
      throw new Error("Symlinks are not allowed in export");
    if (item.isDirectory()) files.push(...(await inventory(dir, path + "/")));
    else if (path !== "imd-deployment.json") {
      const bytes = await readFile(join(dir, path));
      if (bytes.length > 8388608) throw new Error(`Oversize asset: ${path}`);
      files.push({ path, sha256: sha256(bytes) });
    }
  }
  return files;
}
