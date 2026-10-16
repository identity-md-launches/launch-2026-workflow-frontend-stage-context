import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { getAddress, type EIP1193Provider } from "viem";
import { switchNetwork } from "../config";
import type { Runtime } from "../types";
import { explain } from "../errors";
import { Icon } from "./Icons";
import { AddressView } from "./Address";
import { OPEN_IN, isMobileBrowser } from "../open-in";
export function Wallet({ runtime }: { runtime: Runtime }) {
  const { address, chainId, connector, isConnected } = useAccount();
  const { connectors, connectAsync, isPending, variables } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mobile = isMobileBrowser();
  const wrong = isConnected && chainId !== runtime.deployment.chainId;
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = [
    ...connectors.filter((c) => c.type === "injected"),
    ...connectors.filter((c) => c.type !== "injected"),
  ].filter(
    (c) =>
      !(named && c.id === "injected") && !(mobile && c.type === "injected"),
  );
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  const switchToChain = async (selected = connector) => {
    if (!selected) return;
    setSwitching(true);
    setError("");
    try {
      await switchNetwork(
        (await selected.getProvider()) as EIP1193Provider,
        runtime.deployment,
      );
      close();
    } catch (e) {
      setError(explain(e));
      if (!dialog.current?.open) dialog.current?.showModal();
    } finally {
      setSwitching(false);
    }
  };
  const connect = async (selected: Connector) => {
    setError("");
    try {
      await connectAsync({ connector: selected });
      await switchToChain(selected);
    } catch (e) {
      setError(explain(e));
    }
  };
  useEffect(() => {
    const d = dialog.current;
    const onClose = () => trigger.current?.focus();
    d?.addEventListener("close", onClose);
    return () => d?.removeEventListener("close", onClose);
  }, []);
  const short = address
    ? `${getAddress(address).slice(0, 6)}…${getAddress(address).slice(-4)}`
    : "";
  return (
    <>
      <button
        id="wallet-control"
        ref={trigger}
        className={
          isConnected && !wrong
            ? "button wallet-button"
            : "button primary wallet-button"
        }
        disabled={switching}
        onClick={() =>
          wrong
            ? void switchToChain()
            : (setError(""), dialog.current?.showModal())
        }
      >
        <Icon name="wallet" size={18} />
        {switching
          ? "Switching…"
          : wrong
            ? `Switch to ${runtime.deployment.network.name}`
            : isConnected
              ? short
              : "Connect wallet"}
      </button>
      <dialog
        ref={dialog}
        className="wallet-sheet"
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="sheet-inner">
          <div className="section-head">
            <h2>{isConnected ? "Your wallet" : "Add your wallet"}</h2>
            <button
              className="icon-button"
              aria-label="Close wallet dialog"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </div>
          {isConnected && address ? (
            <>
              <AddressView
                value={address}
                explorer={runtime.deployment.network.explorer}
                label="Connected wallet"
              />
              <p className="muted">
                {wrong
                  ? `Switch to ${runtime.deployment.network.name} to use test payments.`
                  : `Connected to ${runtime.deployment.network.name}.`}
              </p>
              {wrong && (
                <button
                  className="button primary full"
                  disabled={switching}
                  onClick={() => void switchToChain()}
                >
                  {switching
                    ? "Switching…"
                    : `Switch to ${runtime.deployment.network.name}`}
                </button>
              )}
              <button
                className="button full"
                onClick={() => {
                  disconnect();
                  close();
                }}
              >
                Disconnect wallet
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                Connect for test payments and on-chain receipts.
              </p>
              {mobile &&
                OPEN_IN.map((w) => (
                  <a
                    className="wallet-row"
                    key={w.id}
                    href={w.href(location.href)}
                  >
                    <img
                      width="28"
                      height="28"
                      alt=""
                      src={`./wallets/${w.id}.svg`}
                    />
                    <span>Open in {w.name}</span>
                    <Icon name="external" size={16} />
                  </a>
                ))}
              {listed.map((c) => (
                <button
                  className="wallet-row"
                  key={c.uid}
                  disabled={isPending || switching}
                  onClick={() => void connect(c)}
                >
                  {c.icon ? (
                    <img width="28" height="28" alt="" src={c.icon} />
                  ) : c.id === "coinbaseWalletSDK" ? (
                    <img
                      width="28"
                      height="28"
                      alt=""
                      src="./wallets/coinbase.svg"
                    />
                  ) : (
                    <Icon name="wallet" size={28} />
                  )}
                  <span>
                    {c.id === "injected"
                      ? "Browser wallet"
                      : c.id === "coinbaseWalletSDK"
                        ? mobile
                          ? "Coinbase Smart Wallet"
                          : "Coinbase Wallet"
                        : c.name}
                    {isPending && variables?.connector === c
                      ? " · opening…"
                      : ""}
                  </span>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
              <p className="small muted">
                On a phone, open this page in your wallet’s browser. Coinbase
                also supports a passkey wallet.
              </p>
            </>
          )}
          <p className="error" role="alert">
            {error}
          </p>
        </div>
      </dialog>
    </>
  );
}
