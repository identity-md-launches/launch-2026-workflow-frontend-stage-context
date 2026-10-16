import { useState } from "react";
import type { Runtime } from "./types";
import { usePayments } from "./usePayments";
import { Wallet } from "./components/Wallet";
import { Icon, Mark } from "./components/Icons";
import { Payment, OwnerPanel } from "./components/Payment";
import { Portfolio, RiskNotes } from "./components/Portfolio";
import { Receipts } from "./components/Receipts";
import { AddressView } from "./components/Address";
import { explain } from "./errors";
export default function App({ runtime }: { runtime: Runtime }) {
  const c = usePayments(runtime);
  const [tax, setTax] = useState(false);
  const [selected, setSelected] = useState(false);
  const paid = !!c.state?.receipt?.number;
  const step = selected ? 3 : c.isConnected ? 2 : 1;
  const showAnalysis = () => {
    setSelected(true);
    document
      .getElementById("analysis")
      ?.scrollIntoView({ behavior: "instant", block: "start" });
    document.getElementById("analysis")?.focus({ preventScroll: true });
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="./" aria-label="FOLIR home">
          <Mark />
          <span>
            FOLIR<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-current" href="#main">
            Workspace
          </a>
          <a href="#receipts">Receipts</a>
          <a href="#contract">Contract</a>
        </nav>
        <div className="header-end">
          <span className="network-label">
            <span className="status-dot ready" />
            {runtime.deployment.network.name}
          </span>
          <Wallet runtime={runtime} />
        </div>
      </header>
      <main id="main" className="container">
        <div className="page-intro">
          <div>
            <h1>Understand your portfolio.</h1>
            <p>Explore a sample portfolio. Try a test payment.</p>
          </div>
          <div className="testnet-note">
            <Icon name="shield" size={17} />
            <span>Testnet edition</span>
          </div>
        </div>
        <ol className="steps" aria-label="Your three steps">
          <li aria-current={step === 1 ? "step" : undefined}>
            <button
              onClick={() => {
                setSelected(false);
                document.getElementById("wallet-control")?.click();
              }}
            >
              <span className="step-number mono">
                {c.isConnected ? <Icon name="check" size={16} /> : "01"}
              </span>
              <span>Add your wallet</span>
            </button>
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>
            <a href="#payment" onClick={() => setSelected(false)}>
              <span className="step-number mono">
                {paid ? <Icon name="check" size={16} /> : "02"}
              </span>
              <span>Choose and pay</span>
            </a>
          </li>
          <li aria-current={step === 3 ? "step" : undefined}>
            <button onClick={showAnalysis}>
              <span className="step-number mono">03</span>
              <span>Get your analysis</span>
            </button>
          </li>
        </ol>
        <div className="workspace">
          <div className="payment-column">
            <Payment
              controller={c}
              runtime={runtime}
              tax={tax}
              setTax={setTax}
              showAnalysis={showAnalysis}
            />
            <div className="quiet-note">
              <Icon name="shield" size={18} />
              <p>
                One payment. One on-chain receipt.
                <br />
                <span className="muted">Your keys stay in your wallet.</span>
              </p>
            </div>
          </div>
          <Portfolio tax={tax} paid={paid} selected={selected} />
        </div>
        <RiskNotes />
        <div className="support-grid">
          <Receipts controller={c} runtime={runtime} />
          <section id="contract" className="contract-panel">
            <div className="section-head">
              <h2>Connected to the contract</h2>
              <button
                className="icon-button"
                aria-label="Refresh contract state"
                disabled={c.query.isFetching || c.pending}
                onClick={() => void c.query.refetch()}
              >
                <Icon name="refresh" />
              </button>
            </div>
            <p className="small muted">
              FolirPayments · {runtime.deployment.network.name}
            </p>
            <AddressView
              value={runtime.address}
              explorer={runtime.deployment.network.explorer}
              label="FolirPayments"
            />
            {c.query.isError && (
              <p className="error" role="alert">
                {explain(c.query.error)} Use refresh to retry.
              </p>
            )}
            {!c.state && !c.query.isError && (
              <p role="status" className="muted">
                Verifying network and deployed code…
              </p>
            )}
            {c.state && (
              <>
                <dl className="facts">
                  <div>
                    <dt>Contract status</dt>
                    <dd>
                      {!c.state.isConfigured
                        ? "Awaiting owner setup"
                        : c.state.paused
                          ? "Payments paused"
                          : "Payments enabled"}
                    </dd>
                  </div>
                  <div>
                    <dt>Recorded receipts</dt>
                    <dd className="mono">{c.state.receiptCount.toString()}</dd>
                  </div>
                  <div>
                    <dt>Last checked block</dt>
                    <dd className="mono">{c.state.block.toString()}</dd>
                  </div>
                  <div>
                    <dt>Network and code</dt>
                    <dd>Verified on read</dd>
                  </div>
                </dl>
                <details>
                  <summary>
                    Owner and identity contract
                    <Icon name="chevron" size={16} />
                  </summary>
                  <div className="detail-content">
                    <span className="small muted">Contract owner</span>
                    <AddressView
                      value={c.state.owner}
                      explorer={runtime.deployment.network.explorer}
                      label="Owner"
                    />
                    <span className="small muted">Identity NFT</span>
                    <AddressView
                      value={c.state.identityNft}
                      explorer={runtime.deployment.network.explorer}
                      label="Identity NFT"
                    />
                  </div>
                </details>
              </>
            )}
            <p className="small muted">
              Payment state is live. Portfolio figures are synthetic. Receipts
              remain public and can be retrieved without connecting a wallet.
            </p>
            <a
              className="text-link small"
              href="./imd-deployment.json"
              target="_blank"
              rel="noreferrer"
            >
              View deployment record <Icon name="external" size={14} />
            </a>
          </section>
        </div>
        <OwnerPanel controller={c} runtime={runtime} />
      </main>
      <footer className="container site-footer">
        <a className="brand footer-brand" href="./">
          FOLIR.
        </a>
        <p>Portfolio perspective, without the noise.</p>
        <span className="small muted">
          Synthetic analysis · Sepolia test payments
        </span>
      </footer>
    </>
  );
}
