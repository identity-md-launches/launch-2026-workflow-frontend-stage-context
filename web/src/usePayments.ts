import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  createWalletClient,
  custom,
  erc20Abi,
  zeroAddress,
  toHex,
  type Abi,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import { makeChain, makeReadClient } from "./config";
import { explain } from "./errors";
import type { ContractState, Receipt, Runtime } from "./types";
export type Tx = {
  action: string;
  phase:
    "checking" | "signing" | "confirming" | "success" | "error" | "uncertain";
  message: string;
  hash?: Hash;
};
const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* browser storage is optional */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* browser storage is optional */
    }
  },
};
export function usePayments(runtime: Runtime) {
  const { address, chainId, connector, isConnected } = useAccount();
  const chain = useMemo(() => makeChain(runtime), [runtime]);
  const rightChain = isConnected && chainId === chain.id;
  const scope = `${chain.id}:${runtime.address.toLowerCase()}:${address?.toLowerCase() || "guest"}`;
  const [orders, setOrders] = useState<Record<string, Hash>>({});
  const savedOrder = storage.get(`folir:order:${scope}`);
  const orderId =
    orders[scope] ||
    (savedOrder &&
    /^0x[0-9a-f]{64}$/i.test(savedOrder) &&
    BigInt(savedOrder) !== 0n
      ? (savedOrder as Hash)
      : null);
  const [tx, setTx] = useState<Tx | null>(null);
  const active = useRef(false);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const client = useMemo(
    () =>
      makeReadClient(
        runtime,
        rightChain && connector
          ? ({
              request: async (args) =>
                ((await connector.getProvider()) as EIP1193Provider).request(
                  args as Parameters<EIP1193Provider["request"]>[0],
                ),
            } as EIP1193Provider)
          : undefined,
      ),
    [runtime, rightChain, connector],
  );
  const newOrder = useCallback(() => {
    if (!address || active.current) return;
    const id = toHex(crypto.getRandomValues(new Uint8Array(32))) as Hash;
    storage.set(`folir:order:${scope}`, id);
    setOrders((old) => ({ ...old, [scope]: id }));
    setTx(null);
  }, [address, scope]);
  useEffect(() => {
    if (address && !orderId) newOrder();
  }, [address, orderId, newOrder]);
  const read = useCallback(async (): Promise<ContractState> => {
    const rpcChain = await client.getChainId();
    if (rpcChain !== chain.id)
      throw new Error(
        "The RPC returned a different network. Payments are disabled.",
      );
    const block = await client.getBlockNumber({ cacheTime: 0 });
    const code = await client.getCode({
      address: runtime.address,
      blockNumber: block,
    });
    if (!code || code === "0x")
      throw new Error(
        "No payment contract code was found on this network. Payments are disabled.",
      );
    const call = (functionName: string, args?: readonly unknown[]) =>
      client.readContract({
        address: runtime.address,
        abi: runtime.abi,
        functionName,
        args,
        blockNumber: block,
      });
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
    const values = await Promise.all(names.map((name) => call(name)));
    const state = Object.fromEntries(
      names.map((name, i) => [name, values[i]]),
    ) as unknown as ContractState;
    state.block = block;
    state.checkedAt = Date.now();
    state.symbol = "test tokens";
    if (state.paymentToken !== zeroAddress) {
      try {
        state.symbol = String(
          await client.readContract({
            address: state.paymentToken,
            abi: erc20Abi,
            functionName: "symbol",
            blockNumber: block,
          }),
        );
      } catch {
        /* symbol is optional metadata */
      }
      if (address && rightChain) {
        const [quote, balance, allowance] = await Promise.allSettled([
          call("quote", [address]),
          client.readContract({
            address: state.paymentToken,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
            blockNumber: block,
          }),
          client.readContract({
            address: state.paymentToken,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, runtime.address],
            blockNumber: block,
          }),
        ]);
        if (quote.status === "fulfilled")
          state.quote = quote.value as ContractState["quote"];
        else state.quoteError = explain(quote.reason);
        if (balance.status === "fulfilled") state.balance = balance.value;
        else
          state.quoteError =
            "Your test token balance could not be read. Refresh to retry.";
        if (allowance.status === "fulfilled") state.allowance = allowance.value;
        else
          state.quoteError =
            "Your token approval could not be read. Refresh to retry.";
      }
    }
    if (address && rightChain) {
      state.gasBalance = await client.getBalance({
        address,
        blockNumber: block,
      });
      if (orderId)
        state.receipt = (await call("getReceipt", [
          address,
          orderId,
        ])) as Receipt;
    }
    return state;
  }, [client, chain.id, runtime, address, rightChain, orderId]);
  const query = useQuery({
    queryKey: ["payment-state", scope, rightChain, orderId],
    queryFn: read,
    refetchInterval: rightChain ? 15000 : 30000,
    retry: 0,
  });
  const fresh = query.data && !query.isError ? query.data : undefined;
  const pending =
    tx !== null &&
    ["checking", "signing", "confirming", "uncertain"].includes(tx.phase);
  const monitor = useCallback(
    async (hash: Hash, action: string, capturedScope: string) => {
      let cancelled = false;
      try {
        const receipt = await client.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: 90000,
          pollingInterval: 2500,
          onReplaced: (replacement) => {
            hash = replacement.transactionReceipt.transactionHash;
            cancelled = replacement.reason === "cancelled";
            storage.set(
              `folir:pending:${capturedScope}`,
              JSON.stringify({ hash, action }),
            );
            if (activeScope.current === capturedScope)
              setTx({
                action,
                hash,
                phase: "confirming",
                message:
                  replacement.reason === "cancelled"
                    ? "Wallet cancellation submitted. Checking confirmation…"
                    : "Replacement transaction detected. Checking confirmation…",
              });
          },
        });
        storage.remove(`folir:pending:${capturedScope}`);
        if (activeScope.current !== capturedScope) return;
        if (cancelled)
          throw new Error(
            "The transaction was cancelled in your wallet. The requested action was not applied.",
          );
        if (receipt.status !== "success")
          throw new Error(
            "The transaction reverted. No payment was recorded. Refresh and try again.",
          );
        // Refetch, then unlock. A successful approval is not treated as a payment receipt.
        const refreshed = await query.refetch();
        if (refreshed.isError)
          throw new Error(
            "Transaction confirmed, but the updated state could not be read. Refresh before continuing.",
          );
        setTx({
          action,
          hash: receipt.transactionHash,
          phase: "success",
          message:
            action === "pay"
              ? refreshed.data?.receipt?.number
                ? "Test payment confirmed. Your receipt is ready."
                : "Transaction confirmed without a payment receipt. Refresh to check the order."
              : action === "approve"
                ? "Approval confirmed. Review the total, then pay."
                : "Transaction confirmed. Contract state refreshed.",
        });
      } catch (e) {
        if (activeScope.current !== capturedScope) return;
        const isPending =
          storage.get(`folir:pending:${capturedScope}`) !== null;
        setTx({
          action,
          hash,
          phase: isPending ? "uncertain" : "error",
          message: isPending
            ? "Confirmation is taking longer than expected. Check the explorer or check confirmation again before sending another transaction."
            : explain(e),
        });
      } finally {
        if (activeScope.current === capturedScope) active.current = false;
      }
    },
    [client, query],
  );
  // Resume an in-flight transaction after reload/account return; never resend it automatically.
  useEffect(() => {
    active.current = false;
    setTx(null);
    const saved = storage.get(`folir:pending:${scope}`);
    if (saved)
      try {
        const value = JSON.parse(saved) as { hash: Hash; action: string };
        if (/^0x[0-9a-f]{64}$/i.test(value.hash))
          setTx({
            ...value,
            phase: "uncertain",
            message:
              "A submitted transaction is saved for this wallet. Check its confirmation before continuing.",
          });
      } catch {
        storage.remove(`folir:pending:${scope}`);
      }
  }, [scope]);
  async function run(action: string, args?: readonly unknown[]) {
    if (
      active.current ||
      pending ||
      !address ||
      !rightChain ||
      !connector ||
      !fresh
    )
      return;
    active.current = true;
    const capturedScope = scope;
    setTx({
      action,
      phase: "checking",
      message: "Checking the latest contract state and simulating this action…",
    });
    let hash: Hash | undefined;
    try {
      const provider = (await connector.getProvider()) as EIP1193Provider;
      const wallet = createWalletClient({
        account: address,
        chain,
        transport: custom(provider),
      });
      const assertWallet = async () => {
        if (
          activeScope.current !== capturedScope ||
          (await wallet.getChainId()) !== chain.id ||
          (await wallet.getAddresses())[0]?.toLowerCase() !==
            address.toLowerCase()
        )
          throw new Error(
            "Your wallet or network changed. Review the current account and try again.",
          );
      };
      await assertWallet();
      const latest = await read();
      if (
        action === "pay" ||
        action === "approve" ||
        action === "resetApproval"
      ) {
        if (latest.quoteError) throw new Error(latest.quoteError);
        if (latest.paused || !latest.isConfigured || !latest.quote)
          throw new Error(
            "Test payments are not enabled. The owner must complete setup and unpause.",
          );
        if (latest.receipt?.number)
          throw new Error(
            "This order already has a receipt. View your analysis or create a new order.",
          );
        if (
          latest.paymentToken !== fresh.paymentToken ||
          latest.swarmRecipient !== fresh.swarmRecipient ||
          latest.treasuryRecipient !== fresh.treasuryRecipient ||
          latest.quote[0] !== fresh.quote?.[0] ||
          latest.quote[3] !== fresh.quote?.[3]
        ) {
          await query.refetch();
          throw new Error(
            "Payment details changed. Review the updated quote and try again.",
          );
        }
        if ((latest.balance ?? 0n) < latest.quote[0])
          throw new Error(
            "Your test token balance is too low. Obtain the configured test token, then refresh.",
          );
        if ((latest.gasBalance ?? 0n) === 0n)
          throw new Error(
            "You need Sepolia ETH for network gas. Use a testnet faucet, then refresh.",
          );
      } else if (action === "acceptOwnership") {
        if (latest.pendingOwner.toLowerCase() !== address.toLowerCase())
          throw new Error("Connect the nominated owner to accept ownership.");
      } else if (latest.owner.toLowerCase() !== address.toLowerCase())
        throw new Error("Only the current contract owner can change settings.");
      let simulation;
      if (action === "approve" || action === "resetApproval") {
        if (
          action === "approve" &&
          (latest.allowance ?? 0n) >= latest.quote![0]
        ) {
          await query.refetch();
          throw new Error("This amount is already approved. Review and pay.");
        }
        simulation = await client.simulateContract({
          address: latest.paymentToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [
            runtime.address,
            action === "resetApproval" ? 0n : latest.quote![0],
          ],
          account: address,
        });
        if (simulation.result === false)
          throw new Error(
            "The test token rejected approval. Check the token and try again.",
          );
      } else {
        if (action === "pay" && (latest.allowance ?? 0n) < latest.quote![0])
          throw new Error("Approve the current quoted amount before paying.");
        simulation = await client.simulateContract({
          address: runtime.address,
          abi: runtime.abi,
          functionName: action,
          args: action === "pay" ? [orderId, latest.paymentToken] : args,
          account: address,
        });
      }
      await assertWallet();
      if (activeScope.current !== capturedScope) return;
      setTx({
        action,
        phase: "signing",
        message: "Review and confirm this transaction in your wallet.",
      });
      hash = await wallet.writeContract({
        address: simulation.request.address,
        abi: simulation.request.abi as Abi,
        functionName: simulation.request.functionName,
        args: simulation.request.args,
      });
      storage.set(
        `folir:pending:${capturedScope}`,
        JSON.stringify({ hash, action }),
      );
      if (activeScope.current !== capturedScope) return;
      setTx({
        action,
        phase: "confirming",
        hash,
        message: "Transaction submitted. Waiting for on-chain confirmation…",
      });
      await monitor(hash, action, capturedScope);
    } catch (e) {
      if (activeScope.current === capturedScope)
        setTx({
          action,
          phase: hash ? "uncertain" : "error",
          hash,
          message: explain(e),
        });
    } finally {
      if (activeScope.current === capturedScope) active.current = false;
    }
  }
  return {
    address,
    rightChain,
    isConnected,
    orderId,
    newOrder,
    query,
    state: fresh,
    tx,
    pending,
    run,
    client,
    checkConfirmation: () => {
      if (
        tx?.hash &&
        !active.current &&
        rightChain &&
        fresh &&
        !query.isFetching
      ) {
        active.current = true;
        setTx({
          ...tx,
          phase: "confirming",
          message: "Checking confirmation…",
        });
        void monitor(tx.hash, tx.action, scope);
      }
    },
  };
}
export type PaymentController = ReturnType<typeof usePayments>;
export const isSame = (a?: Address, b?: Address) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();
