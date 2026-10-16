import { readFile, writeFile } from "node:fs/promises";
import { createPublicClient, http, keccak256 } from "viem";
const m = JSON.parse(
  await readFile(new URL("../../dist/imd-deployment.json", import.meta.url)),
);
const abi = JSON.parse(
  await readFile(
    new URL("../../dist/" + m.contracts[0].abiPath, import.meta.url),
  ),
);
const results = [];
for (const url of m.network.rpcUrls) {
  const client = createPublicClient({
    transport: http(url, { retryCount: 0, timeout: 12000 }),
  });
  try {
    const chainId = await client.getChainId();
    if (chainId !== m.chainId) throw new Error("RPC chain mismatch");
    const block = await client.getBlockNumber();
    const code = await client.getCode({
      address: m.contracts[0].address,
      blockNumber: block,
    });
    if (!code || code === "0x") throw new Error("No deployed code");
    const names = [
      "owner",
      "pendingOwner",
      "paused",
      "isConfigured",
      "paymentToken",
      "paymentTokenDecimals",
      "swarmRecipient",
      "treasuryRecipient",
      "identityNft",
      "receiptCount",
    ];
    const values = await Promise.all(
      names.map((functionName) =>
        client.readContract({
          address: m.contracts[0].address,
          abi,
          functionName,
          blockNumber: block,
        }),
      ),
    );
    results.push({
      url,
      chainId,
      block: block.toString(),
      codeBytes: (code.length - 2) / 2,
      runtimeCodeHash: keccak256(code),
      state: Object.fromEntries(
        names.map((n, i) => [
          n,
          typeof values[i] === "bigint" ? values[i].toString() : values[i],
        ]),
      ),
      passed: true,
    });
  } catch (e) {
    results.push({ url, passed: false, error: e.shortMessage || e.message });
  }
}
const evidence = {
  checkedAt: new Date().toISOString(),
  mode: "Read only. No transactions submitted.",
  contract: m.contracts[0].address,
  results,
};
await writeFile(
  new URL("../../docs/validation/live-rpc.json", import.meta.url),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
if (!results.some((r) => r.passed)) process.exitCode = 1;
