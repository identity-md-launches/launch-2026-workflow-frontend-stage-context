import type { Abi, Address, Hash } from "viem";
export type Deployment = {
  version: 1;
  launchId: string;
  chainId: number;
  sourceCommit: string;
  attestationHash: string;
  contracts: {
    name: string;
    address: Address;
    abiHash: string;
    abiPath: string;
  }[];
  assets: { path: string; sha256: string }[];
  network: {
    chainId: number;
    name: string;
    testnet: boolean;
    rpcUrls: [string, ...string[]];
    explorer: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    faucets: string[];
    uniswapV4: Record<string, string | boolean>;
  };
  walletAddChain?: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
    blockExplorerUrls: string[];
  };
};
export type Runtime = { deployment: Deployment; abi: Abi; address: Address };
export type Receipt = {
  number: bigint;
  payer: Address;
  orderId: Hash;
  token: Address;
  swarmAmount: bigint;
  treasuryAmount: bigint;
  swarmRecipient: Address;
  treasuryRecipient: Address;
  identityDiscount: boolean;
  paidAt: bigint;
};
export type ContractState = {
  owner: Address;
  pendingOwner: Address;
  paused: boolean;
  isConfigured: boolean;
  paymentToken: Address;
  paymentTokenDecimals: number;
  swarmRecipient: Address;
  treasuryRecipient: Address;
  identityNft: Address;
  receiptCount: bigint;
  block: bigint;
  checkedAt: number;
  symbol: string;
  balance?: bigint;
  allowance?: bigint;
  gasBalance?: bigint;
  quoteError?: string;
  quote?: readonly [bigint, bigint, bigint, boolean];
  receipt?: Receipt;
};
