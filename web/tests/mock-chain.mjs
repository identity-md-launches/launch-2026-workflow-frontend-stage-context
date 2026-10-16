import {
  decodeFunctionData,
  encodeFunctionResult,
  encodeErrorResult,
  encodeEventTopics,
  encodeAbiParameters,
  erc20Abi,
  getAddress,
  keccak256,
  toHex,
  zeroAddress,
} from "viem";
// Test-only deterministic fixtures. These never enter the production bundle or manifest.
export const fixtureAddress = (name) =>
  getAddress("0x" + keccak256(toHex("FOLIR browser test: " + name)).slice(-40));
export const account = fixtureAddress("visitor");
export const owner = fixtureAddress("owner");
export const token = fixtureAddress("token");
export const nft = fixtureAddress("identity");
export const swarm = fixtureAddress("swarm");
export const treasury = fixtureAddress("treasury");
export const nextOwner = fixtureAddress("next owner");
const blockHash = keccak256(toHex("fixture block"));
const emptyReceipt = {
  number: 0n,
  payer: zeroAddress,
  orderId: toHex(0n, { size: 32 }),
  token: zeroAddress,
  swarmAmount: 0n,
  treasuryAmount: 0n,
  swarmRecipient: zeroAddress,
  treasuryRecipient: zeroAddress,
  identityDiscount: false,
  paidAt: 0n,
};
export function createMock(manifest, abi, options = {}) {
  const contract = manifest.contracts[0].address;
  const mock = {
    connected: false,
    walletChain: manifest.chainId,
    selectedAccount: account,
    decimals: 6,
    state: {
      owner,
      pendingOwner: zeroAddress,
      paused: false,
      isConfigured: true,
      paymentToken: token,
      paymentTokenDecimals: 6,
      swarmRecipient: swarm,
      treasuryRecipient: treasury,
      identityNft: nft,
      receiptCount: 0n,
    },
    balance: 100000000n,
    gas: 10n ** 18n,
    allowance: 0n,
    discount: false,
    receipts: [],
    sends: [],
    requests: [],
    simulations: [],
    txs: new Map(),
    rejectConnect: false,
    rejectSend: false,
    unknownChain: false,
    rejectSwitch: false,
    failAllRpc: false,
    failSimulation: false,
    revertNext: false,
    emptyCode: false,
    rpcChain: manifest.chainId,
    ...options,
  };
  Object.assign(mock.state, options.state || {});
  const total = () => (mock.discount ? 500000n : 750000n);
  function result(functionName, value, useAbi = abi) {
    return encodeFunctionResult({ abi: useAbi, functionName, result: value });
  }
  function apply(tx) {
    if (tx.applied) return;
    tx.applied = true;
    if (tx.reverted) return;
    const { functionName: f, args } = tx.decoded;
    if (f === "approve") mock.allowance = args[1];
    if (f === "pay") {
      const r = {
        number: BigInt(mock.receipts.length + 1),
        payer: tx.from,
        orderId: args[0],
        token: args[1],
        swarmAmount: 500000n,
        treasuryAmount: mock.discount ? 0n : 250000n,
        swarmRecipient: mock.state.swarmRecipient,
        treasuryRecipient: mock.discount
          ? zeroAddress
          : mock.state.treasuryRecipient,
        identityDiscount: mock.discount,
        paidAt: 1782907200n,
      };
      mock.receipts.push(r);
      mock.state.receiptCount = r.number;
      mock.balance -= total();
      mock.allowance -= total();
    }
    const setters = {
      setPaymentToken: "paymentToken",
      setIdentityNft: "identityNft",
      setSwarmRecipient: "swarmRecipient",
      setTreasuryRecipient: "treasuryRecipient",
      transferOwnership: "pendingOwner",
    };
    if (setters[f]) mock.state[setters[f]] = args[0];
    if (f === "pause") mock.state.paused = true;
    if (f === "unpause") mock.state.paused = false;
    if (f === "acceptOwnership") {
      mock.state.owner = mock.selectedAccount;
      mock.state.pendingOwner = zeroAddress;
    }
    mock.state.isConfigured = [
      "paymentToken",
      "identityNft",
      "swarmRecipient",
      "treasuryRecipient",
    ].every((k) => mock.state[k] !== zeroAddress);
  }
  mock.rpc = async ({ method, params = [] }, wallet = false) => {
    mock.requests.push({ method, params, wallet });
    if (!wallet && mock.failAllRpc)
      throw Object.assign(new Error("Network unavailable"), { code: -32000 });
    switch (method) {
      case "eth_chainId":
        return toHex(wallet ? mock.walletChain : mock.rpcChain);
      case "eth_requestAccounts":
        if (mock.rejectConnect)
          throw Object.assign(new Error("User rejected the request"), {
            code: 4001,
          });
        mock.connected = true;
        return [mock.selectedAccount];
      case "eth_accounts":
        return mock.connected ? [mock.selectedAccount] : [];
      case "wallet_requestPermissions":
        mock.connected = true;
        return [{ parentCapability: "eth_accounts", caveats: [] }];
      case "wallet_getPermissions":
        return mock.connected
          ? [{ parentCapability: "eth_accounts", caveats: [] }]
          : [];
      case "wallet_switchEthereumChain":
        if (mock.rejectSwitch)
          throw Object.assign(new Error("User rejected the request"), {
            code: 4001,
          });
        if (mock.unknownChain)
          throw Object.assign(new Error("Unknown chain"), { code: 4902 });
        mock.walletChain = Number(params[0].chainId);
        return null;
      case "wallet_addEthereumChain":
        mock.unknownChain = false;
        return null;
      case "eth_blockNumber":
        return "0x100";
      case "eth_getCode":
        return mock.emptyCode ? "0x" : "0x6000600055";
      case "eth_getBalance":
        return toHex(mock.gas);
      case "eth_estimateGas":
        return "0x186a0";
      case "eth_gasPrice":
        return "0x3b9aca00";
      case "eth_maxPriorityFeePerGas":
        return "0x3b9aca00";
      case "eth_getTransactionCount":
        return "0x0";
      case "eth_call": {
        const call = params[0];
        const useAbi =
          call.to.toLowerCase() === contract.toLowerCase() ? abi : erc20Abi;
        const { functionName: f, args = [] } = decodeFunctionData({
          abi: useAbi,
          data: call.data,
        });
        if (f in mock.state) return result(f, mock.state[f]);
        if (f === "quote") {
          if (mock.quoteFailure)
            throw {
              code: 3,
              message: "execution reverted",
              data: encodeErrorResult({
                abi,
                errorName: "PaymentTokenNotConfigured",
              }),
            };
          return result(f, [
            total(),
            500000n,
            mock.discount ? 0n : 250000n,
            mock.discount,
          ]);
        }
        if (f === "getReceipt")
          return result(
            f,
            mock.receipts.find(
              (r) =>
                r.payer.toLowerCase() === args[0].toLowerCase() &&
                r.orderId === args[1],
            ) || emptyReceipt,
          );
        if (f === "getReceiptByNumber")
          return result(
            f,
            mock.receipts.find((r) => r.number === args[0]) || emptyReceipt,
          );
        if (f === "symbol") return result(f, "TST", erc20Abi);
        if (f === "decimals") return result(f, mock.decimals, erc20Abi);
        if (f === "balanceOf") return result(f, mock.balance, erc20Abi);
        if (f === "allowance") return result(f, mock.allowance, erc20Abi);
        mock.simulations.push({ functionName: f, args, to: call.to });
        if (mock.failSimulation)
          throw {
            code: 3,
            message: "execution reverted",
            data: encodeErrorResult({ abi, errorName: "IsPaused" }),
          };
        if (f === "approve") return result(f, true, erc20Abi);
        if (f === "pay") return result(f, BigInt(mock.receipts.length + 1));
        return "0x";
      }
      case "eth_sendTransaction": {
        if (mock.rejectSend)
          throw Object.assign(new Error("User rejected the request"), {
            code: 4001,
          });
        if (mock.signGate) await mock.signGate;
        const tx = params[0];
        const decoded = decodeFunctionData({
          abi: tx.to.toLowerCase() === contract.toLowerCase() ? abi : erc20Abi,
          data: tx.data,
        });
        const hash = keccak256(
          toHex("fixture transaction " + mock.sends.length),
        );
        mock.sends.push({ ...tx, decoded, hash });
        mock.txs.set(hash, {
          ...tx,
          decoded,
          hash,
          applied: false,
          reverted: mock.revertNext,
        });
        mock.revertNext = false;
        return hash;
      }
      case "eth_getTransactionReceipt": {
        const tx = mock.txs.get(params[0]);
        if (!tx || mock.holdConfirmation) return null;
        apply(tx);
        const logs = [];
        if (tx.decoded.functionName === "pay" && !tx.reverted) {
          const r = mock.receipts.at(-1);
          logs.push({
            address: contract,
            topics: encodeEventTopics({
              abi,
              eventName: "PaymentReceived",
              args: { number: r.number, payer: r.payer, orderId: r.orderId },
            }),
            data: encodeAbiParameters(
              [
                { type: "address" },
                { type: "uint256" },
                { type: "uint256" },
                { type: "bool" },
              ],
              [r.token, r.swarmAmount, r.treasuryAmount, r.identityDiscount],
            ),
            blockNumber: "0x100",
            blockHash,
            transactionHash: tx.hash,
            transactionIndex: "0x0",
            logIndex: "0x0",
            removed: false,
          });
        }
        return {
          transactionHash: tx.hash,
          transactionIndex: "0x0",
          blockHash,
          blockNumber: "0x100",
          from: tx.from,
          to: tx.to,
          cumulativeGasUsed: "0x10000",
          gasUsed: "0x10000",
          contractAddress: null,
          logs,
          logsBloom: "0x" + "0".repeat(512),
          status: tx.reverted ? "0x0" : "0x1",
          effectiveGasPrice: "0x3b9aca00",
          type: "0x2",
        };
      }
      case "eth_getTransactionByHash": {
        const tx = mock.txs.get(params[0]);
        return tx
          ? {
              ...tx,
              blockHash: null,
              blockNumber: null,
              transactionIndex: null,
              nonce: "0x0",
              gas: "0x186a0",
              gasPrice: "0x3b9aca00",
              value: "0x0",
              input: tx.data,
              v: "0x1b",
              r: toHex(1n, { size: 32 }),
              s: toHex(1n, { size: 32 }),
              type: "0x0",
            }
          : null;
      }
      case "eth_getBlockByNumber":
        return {
          number: "0x100",
          hash: blockHash,
          parentHash: blockHash,
          timestamp: "0x6a4488c0",
          nonce: "0x0000000000000000",
          difficulty: "0x0",
          totalDifficulty: "0x0",
          size: "0x100",
          gasLimit: "0x1c9c380",
          gasUsed: "0x1000",
          miner: owner,
          extraData: "0x",
          transactions: [],
          baseFeePerGas: "0x3b9aca00",
          logsBloom: "0x" + "0".repeat(512),
          sha3Uncles: blockHash,
          stateRoot: blockHash,
          transactionsRoot: blockHash,
          receiptsRoot: blockHash,
          uncles: [],
        };
      case "eth_getLogs":
        return [];
      default:
        throw Object.assign(new Error("Unsupported mock method " + method), {
          code: 4200,
        });
    }
  };
  return mock;
}
export async function installMock(
  page,
  mock,
  manifest,
  { provider = true, mobile = false } = {},
) {
  const rpcHosts = manifest.network.rpcUrls.map((url) => new URL(url).host);
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (rpcHosts.includes(url.host)) {
      if (mock.failHttp || mock.failHosts?.includes(url.host)) {
        await route.fulfill({ status: 503, body: "Unavailable" });
        return;
      }
      if (request.method() === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
          },
        });
        return;
      }
      try {
        const payload = request.postDataJSON();
        const respond = async (q) => {
          try {
            return { jsonrpc: "2.0", id: q.id, result: await mock.rpc(q) };
          } catch (e) {
            return {
              jsonrpc: "2.0",
              id: q.id,
              error: {
                code: e.code || -32000,
                message: e.message,
                data: e.data,
              },
            };
          }
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            Array.isArray(payload)
              ? await Promise.all(payload.map(respond))
              : await respond(payload),
          ),
        });
      } catch (e) {
        await route.fulfill({ status: 500, body: String(e) });
      }
      return;
    }
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      await route.continue();
      return;
    }
    await route.abort(); // No test ever reaches a real RPC or wallet service.
  });
  if (!provider) return;
  await page.exposeFunction("__fixtureRpc", async (args) => {
    try {
      return { result: await mock.rpc(args, true) };
    } catch (e) {
      return {
        error: { message: e.message, code: e.code || -32000, data: e.data },
      };
    }
  });
  await page.addInitScript(
    ({ mobile }) => {
      const listeners = {};
      const provider = {
        isMetaMask: true,
        request: async (args) => {
          const r = await window.__fixtureRpc(args);
          if (r.error) throw Object.assign(new Error(r.error.message), r.error);
          if (args.method === "wallet_switchEthereumChain")
            listeners.chainChanged?.forEach((fn) => fn(args.params[0].chainId));
          return r.result;
        },
        on: (name, fn) => {
          (listeners[name] ??= []).push(fn);
        },
        removeListener: (name, fn) => {
          listeners[name] = (listeners[name] || []).filter((f) => f !== fn);
        },
      };
      window.ethereum = provider;
      window.__emitWallet = (event, value) =>
        listeners[event]?.forEach((fn) => fn(value));
      const detail = {
        info: {
          uuid: "9cf1fb1b-132a-49e9-a8c7-d5c9bf56c836",
          name: "FOLIR test wallet",
          icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="28" height="28"%3E%3Crect width="28" height="28" fill="%23294c3e"/%3E%3C/svg%3E',
          rdns: "test.folir.wallet",
        },
        provider,
      };
      window.addEventListener("eip6963:requestProvider", () =>
        dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail })),
      );
      dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
    },
    { mobile },
  );
}
