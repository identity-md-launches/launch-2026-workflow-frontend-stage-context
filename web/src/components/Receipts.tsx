import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  erc20Abi,
  formatUnits,
  isAddress,
  type Address,
  type Hash,
} from "viem";
import type { Receipt, Runtime } from "../types";
import type { PaymentController } from "../usePayments";
import { explain } from "../errors";
import { AddressView } from "./Address";
import { Icon } from "./Icons";
function ReceiptDetails({
  receipt,
  controller: c,
  runtime,
}: {
  receipt: Receipt;
  controller: PaymentController;
  runtime: Runtime;
}) {
  const metadata = useQuery({
    queryKey: ["receipt-token", runtime.deployment.chainId, receipt.token],
    queryFn: async () => {
      const decimals = await c.client.readContract({
        address: receipt.token,
        abi: erc20Abi,
        functionName: "decimals",
      });
      const symbol = await c.client
        .readContract({
          address: receipt.token,
          abi: erc20Abi,
          functionName: "symbol",
        })
        .catch(() => "tokens");
      return { decimals, symbol };
    },
    retry: 0,
  });
  const amount = (n: bigint) =>
    metadata.data
      ? `${formatUnits(n, metadata.data.decimals)} ${metadata.data.symbol}`
      : `${n} base units (token decimals unavailable)`;
  return (
    <div className="receipt-content">
      <div className="section-head">
        <h3>Receipt #{receipt.number.toString()}</h3>
        <span className="positive small">Confirmed on chain</span>
      </div>
      <dl className="facts">
        <div>
          <dt>Paid at</dt>
          <dd>{new Date(Number(receipt.paidAt) * 1000).toUTCString()}</dd>
        </div>
        <div>
          <dt>Swarm funding</dt>
          <dd>{amount(receipt.swarmAmount)}</dd>
        </div>
        <div>
          <dt>Treasury</dt>
          <dd>{amount(receipt.treasuryAmount)}</dd>
        </div>
        <div>
          <dt>Identity discount</dt>
          <dd>{receipt.identityDiscount ? "Applied" : "Not applied"}</dd>
        </div>
      </dl>
      <span className="small muted">Payer</span>
      <AddressView
        value={receipt.payer}
        explorer={runtime.deployment.network.explorer}
        label="Receipt payer"
      />
      <span className="small muted">Payment token</span>
      <AddressView
        value={receipt.token}
        explorer={runtime.deployment.network.explorer}
        label="Receipt token"
      />
      <span className="small muted">Order ID</span>
      <code className="break order-id">{receipt.orderId}</code>
      <details>
        <summary>
          Recorded recipients
          <Icon name="chevron" size={16} />
        </summary>
        <div className="detail-content">
          <span className="small muted">Swarm-funding recipient</span>
          <AddressView
            value={receipt.swarmRecipient}
            explorer={runtime.deployment.network.explorer}
            label="Recorded swarm recipient"
          />
          <span className="small muted">
            Treasury recipient {receipt.identityDiscount ? "(no transfer)" : ""}
          </span>
          {receipt.identityDiscount ? (
            <p>No treasury transfer for this receipt.</p>
          ) : (
            <AddressView
              value={receipt.treasuryRecipient}
              explorer={runtime.deployment.network.explorer}
              label="Recorded treasury recipient"
            />
          )}
        </div>
      </details>
      <p className="small muted">
        The receipt proves a test payment. The analysis remains a synthetic
        demonstration.
      </p>
    </div>
  );
}
export function Receipts({
  controller: c,
  runtime,
}: {
  controller: PaymentController;
  runtime: Runtime;
}) {
  const [mode, setMode] = useState("number");
  const [number, setNumber] = useState("");
  const [payer, setPayer] = useState("");
  const [order, setOrder] = useState("");
  const [found, setFound] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setFound(null);
    setError("");
  }, [mode]);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFound(null);
    if (mode === "number" && !/^[1-9]\d{0,76}$/.test(number)) {
      setError("Enter a positive receipt number.");
      return;
    }
    if (
      mode === "order" &&
      (!isAddress(payer.trim()) || !/^0x[0-9a-f]{64}$/i.test(order.trim()))
    ) {
      setError("Enter a valid wallet address and a full 32-byte order ID.");
      return;
    }
    setPending(true);
    try {
      if ((await c.client.getChainId()) !== runtime.deployment.chainId)
        throw new Error("RPC network mismatch. Try again later.");
      const result = (await c.client.readContract({
        address: runtime.address,
        abi: runtime.abi,
        functionName: mode === "number" ? "getReceiptByNumber" : "getReceipt",
        args:
          mode === "number"
            ? [BigInt(number)]
            : [payer.trim() as Address, order.trim() as Hash],
      })) as Receipt;
      if (!result.number)
        setError(
          "No receipt found. Check the number or wallet and order ID, then try again.",
        );
      else setFound(result);
    } catch (e) {
      setError(explain(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="receipts" id="receipts">
      <div className="section-head">
        <h2>Payment receipts</h2>
        <Icon name="shield" />
      </div>
      {c.state?.receipt?.number ? (
        <ReceiptDetails
          receipt={c.state.receipt}
          controller={c}
          runtime={runtime}
        />
      ) : (
        <p className="muted">
          Your current order has no confirmed receipt. Look up any receipt
          recorded by this contract.
        </p>
      )}
      <form onSubmit={(e) => void search(e)}>
        <label htmlFor="receipt-mode">Find a receipt by</label>
        <select
          id="receipt-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="number">Receipt number</option>
          <option value="order">Wallet and order ID</option>
        </select>
        {mode === "number" ? (
          <>
            <label htmlFor="receipt-number">Receipt number</label>
            <input
              id="receipt-number"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 1"
              aria-describedby="receipt-error"
            />
          </>
        ) : (
          <>
            <label htmlFor="receipt-payer">Payer wallet address</label>
            <input
              id="receipt-payer"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <label htmlFor="receipt-order">Order ID</label>
            <input
              id="receipt-order"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </>
        )}
        <button className="button" disabled={pending}>
          {pending ? "Looking up receipt…" : "Find receipt"}
          <Icon name="arrow" size={16} />
        </button>
        <p id="receipt-error" className="error small" role="status">
          {error}
        </p>
      </form>
      {found && (
        <ReceiptDetails receipt={found} controller={c} runtime={runtime} />
      )}
    </section>
  );
}
