import { useState } from "react";
import { getAddress, zeroAddress } from "viem";
import { Icon } from "./Icons";
export function AddressView({
  value,
  explorer,
  label,
}: {
  value: string;
  explorer: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (value.toLowerCase() === zeroAddress)
    return <span className="muted">Not configured</span>;
  const address = getAddress(value);
  return (
    <span className="address-row">
      <a
        className="address mono"
        href={`${explorer}/address/${address}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label || "Address"} on explorer: ${address}`}
      >
        {address}
        <Icon name="external" size={14} />
      </a>
      <button
        className="icon-button"
        aria-label={`Copy ${label || "address"}`}
        title={copied ? "Copied" : "Copy address"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Icon name={copied ? "check" : "copy"} size={16} />
      </button>
    </span>
  );
}
