import { useEffect, useState } from "react";
import { formatEther, formatUnits, isAddress, zeroAddress } from "viem";
import type { Runtime } from "../types";
import type { PaymentController } from "../usePayments";
import { isSame } from "../usePayments";
import { Icon } from "./Icons";
import { AddressView } from "./Address";
export function TransactionStatus({
  controller: c,
  runtime,
}: {
  controller: PaymentController;
  runtime: Runtime;
}) {
  return (
    <div className="transaction-status" aria-live="polite" aria-atomic="true">
      {c.tx && (
        <>
          <p
            className={
              c.tx.phase === "error" || c.tx.phase === "uncertain"
                ? "error"
                : c.tx.phase === "success"
                  ? "positive"
                  : "muted"
            }
          >
            {c.pending && c.tx.phase !== "uncertain" && (
              <span className="spinner" />
            )}
            {c.tx.message}
          </p>
          {c.tx.hash && (
            <a
              className="text-link"
              href={`${runtime.deployment.network.explorer}/tx/${c.tx.hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction <Icon name="external" size={14} />
            </a>
          )}
          {c.tx.phase === "uncertain" && (
            <button
              className="button small-button"
              disabled={!c.rightChain || !c.state || c.query.isFetching}
              onClick={c.checkConfirmation}
            >
              Check confirmation
            </button>
          )}
        </>
      )}
    </div>
  );
}
export function Payment({
  controller: c,
  runtime,
  tax,
  setTax,
  showAnalysis,
}: {
  controller: PaymentController;
  runtime: Runtime;
  tax: boolean;
  setTax: (b: boolean) => void;
  showAnalysis: () => void;
}) {
  const s = c.state;
  const paid = !!s?.receipt?.number;
  const needed = (s?.allowance ?? 0n) < (s?.quote?.[0] ?? 0n);
  const available = !!s && s.isConfigured && !s.paused;
  const eligible =
    c.rightChain &&
    available &&
    !!s?.quote &&
    !s.quoteError &&
    s.balance !== undefined &&
    s.allowance !== undefined &&
    !!c.orderId &&
    !paid;
  const insufficient =
    s?.quote && s.balance !== undefined && s.balance < s.quote[0];
  const noGas = s?.gasBalance === 0n;
  const approved = eligible && !needed;
  const value = (amount: bigint) =>
    `${formatUnits(amount, s!.paymentTokenDecimals)} ${s!.symbol}`;
  const reason = c.query.isError
    ? "Contract reads are unavailable. Refresh to retry."
    : !s
      ? "Checking the deployed contract…"
      : !s.isConfigured
        ? "Test payments await owner setup."
        : s.paused
          ? "Test payments are paused by the owner."
          : !c.isConnected
            ? "Add your wallet to see your live quote."
            : !c.rightChain
              ? `Switch to ${runtime.deployment.network.name} using the wallet control.`
              : s.quoteError
                ? s.quoteError
                : insufficient
                  ? "Your test token balance is too low."
                  : noGas
                    ? "Add Sepolia ETH for network gas."
                    : paid
                      ? "This order has a confirmed receipt."
                      : "Your quote is read from the payment contract.";
  return (
    <section
      id="payment"
      className="payment-panel"
      aria-labelledby="payment-title"
    >
      <div className="section-head">
        <h2 id="payment-title">Choose and pay</h2>
        <span className="status-tag">Test payment</span>
      </div>
      <div className="plan">
        <Icon name="grid" size={24} />
        <div>
          <h3>Portfolio analysis</h3>
          <p className="small muted">Allocation, performance and scenarios</p>
        </div>
        <Icon name="check" size={18} />
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={tax}
          disabled={c.pending}
          onChange={(e) => setTax(e.target.checked)}
        />
        <span>
          Include a tax illustration <span className="muted">(optional)</span>
        </span>
      </label>
      <div className="price-line">
        <span className="muted">
          {s?.quote?.[3] ? "Identity holder total" : "Test payment total"}
        </span>
        <strong className="price mono">
          {s?.quote ? formatUnits(s.quote[0], s.paymentTokenDecimals) : "0.75"}{" "}
          <span className="small">{s?.quote ? s.symbol : "test units"}</span>
        </strong>
      </div>
      <p className="small muted price-note">
        {s?.quote?.[3]
          ? "Identity discount applied. Treasury share: 0."
          : "Identity NFT holders pay 0.50 test units."}
      </p>
      <div className="payment-state">
        <span className={`status-dot ${available ? "ready" : ""}`} />
        <p role="status">{reason}</p>
      </div>
      {paid ? (
        <button className="button primary full" onClick={showAnalysis}>
          Get your analysis <Icon name="arrow" />
        </button>
      ) : (
        <button
          className="button primary full"
          disabled={
            !eligible ||
            c.pending ||
            c.query.isFetching ||
            !!insufficient ||
            noGas
          }
          onClick={() => void c.run(needed ? "approve" : "pay")}
        >
          {c.pending && c.tx?.action === "approve"
            ? "Approving test tokens…"
            : c.pending && c.tx?.action === "pay"
              ? "Confirming payment…"
              : !c.isConnected
                ? "Add wallet to continue"
                : !available
                  ? "Payments unavailable"
                  : approved
                    ? `Pay ${value(s!.quote![0])}`
                    : `Approve ${s?.quote ? value(s.quote[0]) : "test tokens"}`}
          {!c.pending && (
            <Icon name={approved ? "arrow" : "shield"} size={18} />
          )}
        </button>
      )}
      <button className="button text-button full" onClick={showAnalysis}>
        Explore sample analysis <Icon name="arrow" size={17} />
      </button>
      <p className="small muted payment-footnote">
        Sepolia only. No customer charges or real investment research.
      </p>
      <TransactionStatus controller={c} runtime={runtime} />
      <details className="payment-details">
        <summary>
          Payment details and order <Icon name="chevron" size={16} />
        </summary>
        <div className="detail-content">
          <dl className="facts">
            <div>
              <dt>Swarm funding</dt>
              <dd>{s?.quote ? value(s.quote[1]) : "0.50 test units"}</dd>
            </div>
            <div>
              <dt>Treasury</dt>
              <dd>{s?.quote ? value(s.quote[2]) : "0.25 test units"}</dd>
            </div>
            <div>
              <dt>USD value</dt>
              <dd>Unavailable for test tokens</dd>
            </div>
            {s?.balance !== undefined && (
              <div>
                <dt>Wallet balance</dt>
                <dd className="break">{value(s.balance)}</dd>
              </div>
            )}
            {s?.allowance !== undefined && (
              <div>
                <dt>Approved amount</dt>
                <dd className="break">{value(s.allowance)}</dd>
              </div>
            )}
            {s?.gasBalance !== undefined && (
              <div>
                <dt>Gas balance</dt>
                <dd className="break">
                  {formatEther(s.gasBalance)}{" "}
                  {runtime.deployment.network.nativeCurrency.symbol}
                </dd>
              </div>
            )}
          </dl>
          <p className="small muted">
            Approval permits this contract to spend exactly the quoted amount.
            Payment is a separate confirmation. The wallet shows network gas
            before signing.
          </p>
          {s?.paymentToken && (
            <>
              <span className="small muted">Configured test token</span>
              <AddressView
                value={s.paymentToken}
                explorer={runtime.deployment.network.explorer}
                label="Payment token"
              />
            </>
          )}
          <p className="small muted">
            The owner can change recipients, token and NFT eligibility. Review
            current details before paying.
          </p>
          {s && (
            <>
              <span className="small muted">Swarm-funding recipient</span>
              <AddressView
                value={s.swarmRecipient}
                explorer={runtime.deployment.network.explorer}
                label="Swarm recipient"
              />
              <span className="small muted">Treasury recipient</span>
              <AddressView
                value={s.treasuryRecipient}
                explorer={runtime.deployment.network.explorer}
                label="Treasury recipient"
              />
            </>
          )}
          {c.orderId && (
            <>
              <span className="small muted">Your current order ID</span>
              <code className="break order-id">{c.orderId}</code>
              <p className="small muted">
                Saved in this browser for this wallet. Keep the order ID or
                receipt number to find your payment elsewhere.
              </p>
              <button
                className="button small-button"
                disabled={c.pending || !paid}
                onClick={c.newOrder}
              >
                Start a new order
              </button>
            </>
          )}
          {eligible && (s?.allowance ?? 0n) > 0n && needed && (
            <>
              <p className="small muted">
                If this token requires zero allowance first, reset it before
                approving.
              </p>
              <button
                className="button small-button"
                disabled={c.pending}
                onClick={() => void c.run("resetApproval")}
              >
                {c.tx?.action === "resetApproval" && c.pending
                  ? "Resetting approval…"
                  : "Reset approval to zero"}
              </button>
            </>
          )}
          {noGas &&
            runtime.deployment.network.faucets.map((url, i) => (
              <a
                key={url}
                className="text-link"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                Sepolia faucet {i + 1}
                <Icon name="external" size={14} />
              </a>
            ))}
        </div>
      </details>
    </section>
  );
}
const settings = [
  [
    "setPaymentToken",
    "Test payment token",
    "paymentToken",
    "A standard ERC-20 contract with 2–36 decimals.",
  ],
  [
    "setIdentityNft",
    "Identity NFT",
    "identityNft",
    "An ERC-721 contract used to check the discount.",
  ],
  [
    "setSwarmRecipient",
    "Swarm-funding recipient",
    "swarmRecipient",
    "Receives 0.50 test token units per payment.",
  ],
  [
    "setTreasuryRecipient",
    "Treasury recipient",
    "treasuryRecipient",
    "Receives 0.25 units on standard payments. Must differ from swarm funding.",
  ],
] as const;
export function OwnerPanel({
  controller: c,
  runtime,
}: {
  controller: PaymentController;
  runtime: Runtime;
}) {
  const s = c.state;
  const owner = isSame(c.address, s?.owner);
  const pendingOwner = isSame(c.address, s?.pendingOwner);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<{
    action: string;
    value?: string;
    label: string;
  } | null>(null);
  useEffect(() => {
    setReview(null);
    setErrors({});
  }, [c.address]);
  if (!s || !c.rightChain || (!owner && !pendingOwner)) return null;
  const validate = (action: string, label: string) => {
    const v = (values[action] || "").trim();
    let error =
      !isAddress(v) || v.toLowerCase() === zeroAddress
        ? "Enter a valid, nonzero address."
        : "";
    if (
      (action === "setSwarmRecipient" &&
        v.toLowerCase() === s.treasuryRecipient.toLowerCase()) ||
      (action === "setTreasuryRecipient" &&
        v.toLowerCase() === s.swarmRecipient.toLowerCase())
    )
      error = "The two recipient addresses must differ.";
    setErrors((old) => ({ ...old, [action]: error }));
    if (!error) setReview({ action, value: v, label });
    else document.getElementById(action)?.focus();
  };
  return (
    <section className="owner-panel" id="owner">
      <div className="section-head">
        <h2>Owner setup</h2>
        <Icon name="shield" />
      </div>
      <p className="muted">
        These settings change the live test contract. Configure all four, then
        enable payments.
      </p>
      {owner && (
        <>
          {settings.map(([action, label, field, hint]) => (
            <div className="setting" key={action}>
              <label htmlFor={action}>{label}</label>
              <AddressView
                value={s[field]}
                explorer={runtime.deployment.network.explorer}
                label={`Current ${label.toLowerCase()}`}
              />
              <div className="input-action">
                <input
                  id={action}
                  name={action}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={values[action] || ""}
                  onChange={(e) =>
                    setValues((old) => ({ ...old, [action]: e.target.value }))
                  }
                  placeholder="Paste a Sepolia address"
                  aria-invalid={!!errors[action]}
                  aria-describedby={`${action}-hint`}
                />
                <button
                  className="button"
                  disabled={c.pending}
                  onClick={() => validate(action, label)}
                >
                  {c.tx?.action === action && c.pending ? "Saving…" : "Review"}
                </button>
              </div>
              <p
                id={`${action}-hint`}
                className={errors[action] ? "small error" : "small muted"}
              >
                {errors[action] || hint}
              </p>
            </div>
          ))}
          <div className="owner-actions">
            <button
              className="button"
              disabled={c.pending || (s.paused && !s.isConfigured)}
              onClick={() =>
                setReview({
                  action: s.paused ? "unpause" : "pause",
                  label: s.paused
                    ? "Enable test payments"
                    : "Pause test payments",
                })
              }
            >
              {s.paused ? "Enable test payments" : "Pause test payments"}
            </button>
          </div>
          <details>
            <summary>
              Transfer ownership <Icon name="chevron" size={16} />
            </summary>
            <div className="detail-content">
              <p className="small muted">
                Nominate a new owner. They must connect and accept before
                control changes.
              </p>
              <label htmlFor="transferOwnership">New owner address</label>
              <div className="input-action">
                <input
                  id="transferOwnership"
                  name="new-owner"
                  autoComplete="off"
                  value={values.transferOwnership || ""}
                  onChange={(e) =>
                    setValues((old) => ({
                      ...old,
                      transferOwnership: e.target.value,
                    }))
                  }
                  aria-invalid={!!errors.transferOwnership}
                  aria-describedby="transfer-error"
                />
                <button
                  className="button"
                  disabled={c.pending}
                  onClick={() =>
                    validate("transferOwnership", "Nominate new owner")
                  }
                >
                  Review
                </button>
              </div>
              <p id="transfer-error" className="error small">
                {errors.transferOwnership}
              </p>
              <span className="small muted">Pending owner</span>
              <AddressView
                value={s.pendingOwner}
                explorer={runtime.deployment.network.explorer}
                label="Pending owner"
              />
              {s.pendingOwner !== zeroAddress && (
                <button
                  className="button"
                  disabled={c.pending}
                  onClick={() =>
                    setReview({
                      action: "transferOwnership",
                      value: zeroAddress,
                      label: "Cancel pending ownership transfer",
                    })
                  }
                >
                  Cancel pending transfer
                </button>
              )}
            </div>
          </details>
        </>
      )}
      {pendingOwner && (
        <button
          className="button"
          disabled={c.pending}
          onClick={() =>
            setReview({
              action: "acceptOwnership",
              label: "Accept contract ownership",
            })
          }
        >
          Accept ownership
        </button>
      )}
      {review && (
        <div className="review-action">
          <h3>Review: {review.label}</h3>
          {review.value && <code className="break">{review.value}</code>}
          <p className="small">
            This changes FolirPayments on {runtime.deployment.network.name}.
            Your wallet will ask for confirmation.
          </p>
          <div className="button-group">
            <button
              className="button primary"
              disabled={c.pending}
              onClick={() => {
                void c.run(
                  review.action,
                  review.value ? [review.value] : undefined,
                );
                setReview(null);
              }}
            >
              Confirm {review.label.toLowerCase()}
            </button>
            <button className="button" onClick={() => setReview(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <TransactionStatus controller={c} runtime={runtime} />
    </section>
  );
}
