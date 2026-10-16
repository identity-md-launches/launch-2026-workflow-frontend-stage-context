import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import {
  createPublicClient,
  custom,
  defineChain,
  fallback,
  isAddress,
  keccak256,
  toHex,
  type EIP1193Provider,
} from "viem";
import type { Deployment, Runtime } from "./types";

export function canonical(value: unknown): string {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, sorted((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(sorted(value));
}
const relative = (p: string) =>
  p &&
  !p.includes("..") &&
  !p.includes(":") &&
  !p.startsWith("/") &&
  !p.includes("\\");
export async function loadRuntime(): Promise<Runtime> {
  const response = await fetch("./imd-deployment.json", { cache: "no-cache" });
  if (!response.ok)
    throw new Error(
      "Deployment configuration could not be loaded. Reload to retry.",
    );
  const deployment = (await response.json()) as Deployment;
  if (
    deployment.version !== 1 ||
    deployment.chainId !== deployment.network?.chainId ||
    !deployment.network.rpcUrls.length
  )
    throw new Error("Deployment network configuration is invalid.");
  const contract = deployment.contracts.find((c) => c.name === "FolirPayments");
  if (!contract || !isAddress(contract.address) || !relative(contract.abiPath))
    throw new Error("The payment contract configuration is invalid.");
  const abiResponse = await fetch(`./${contract.abiPath}`);
  if (!abiResponse.ok)
    throw new Error(
      "The payment contract ABI could not be loaded. Reload to retry.",
    );
  const abi = await abiResponse.json();
  if (
    !Array.isArray(abi) ||
    keccak256(toHex(canonical(abi))).slice(2) !== contract.abiHash
  )
    throw new Error(
      "Contract ABI verification failed. Payments are unavailable.",
    );
  return { deployment, abi, address: contract.address };
}
export function makeChain(runtime: Runtime) {
  const n = runtime.deployment.network;
  return defineChain({
    id: runtime.deployment.chainId,
    name: n.name,
    nativeCurrency: n.nativeCurrency,
    rpcUrls: { default: { http: n.rpcUrls } },
    blockExplorers: {
      default: { name: `${n.name} explorer`, url: n.explorer },
    },
    testnet: n.testnet,
  });
}
export function makeWalletConfig(runtime: Runtime) {
  const chain = makeChain(runtime);
  return createConfig({
    chains: [chain],
    multiInjectedProviderDiscovery: true,
    connectors: [
      injected(),
      coinbaseWallet({
        appName: "FOLIR",
        appLogoUrl: new URL("./favicon.svg", location.href).href,
        preference: { options: "all" },
      }),
    ],
    transports: {
      [chain.id]: fallback(
        runtime.deployment.network.rpcUrls.map((url) =>
          http(url, { timeout: 8000, retryCount: 0 }),
        ),
        { retryCount: 0 },
      ),
    },
  });
}
export function makeReadClient(runtime: Runtime, provider?: EIP1193Provider) {
  const transports = runtime.deployment.network.rpcUrls.map((url) =>
    http(url, { timeout: 6500, retryCount: 0 }),
  );
  return createPublicClient({
    chain: makeChain(runtime),
    transport: fallback(
      [
        ...transports,
        ...(provider ? [custom(provider, { retryCount: 0 })] : []),
      ],
      { retryCount: 0 },
    ),
    pollingInterval: 4000,
  });
}
export async function switchNetwork(
  provider: EIP1193Provider,
  deployment: Deployment,
) {
  const params: [{ chainId: string }] = [
    { chainId: toHex(deployment.chainId) },
  ];
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params });
  } catch (error) {
    const e = error as {
      code?: number;
      message?: string;
      cause?: { code?: number };
    };
    if (
      (e.code === 4902 ||
        e.cause?.code === 4902 ||
        /unknown chain|unrecognized chain|not added|not configured/i.test(
          e.message || "",
        )) &&
      deployment.walletAddChain
    ) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [deployment.walletAddChain],
      });
      await provider.request({ method: "wallet_switchEthereumChain", params });
    } else throw error;
  }
  const id = await provider.request({ method: "eth_chainId" });
  if (Number(id) !== deployment.chainId)
    throw new Error(
      `Switch to ${deployment.network.name} in your wallet and try again.`,
    );
}
