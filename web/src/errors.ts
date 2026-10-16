import { BaseError, ContractFunctionRevertedError } from "viem";
const messages: Record<string, string> = {
  NotOwner: "Only the current contract owner can change this setting.",
  NotPendingOwner: "Connect the nominated new owner to accept ownership.",
  ZeroAddress: "Enter a nonzero wallet or contract address.",
  IsPaused: "Test payments are paused. The owner must enable them.",
  NotPaused: "Payments are already enabled. Refresh the contract state.",
  PaymentTokenNotConfigured:
    "The owner has not configured the test payment token yet.",
  SwarmRecipientNotConfigured:
    "The owner must configure the swarm-funding recipient.",
  TreasuryRecipientNotConfigured:
    "The owner must configure the treasury recipient.",
  IdentityNftNotConfigured:
    "The owner must configure the identity NFT contract.",
  RecipientsMustDiffer:
    "Use different addresses for swarm funding and treasury.",
  NotAContract: "This address has no contract code on the selected network.",
  UnsupportedTokenDecimals:
    "The test token must use between 2 and 36 decimals.",
  TokenDecimalsUnavailable:
    "The token must expose a working decimals() function.",
  TokenNotAllowlisted:
    "The payment token changed. Refresh and review the new quote.",
  ReceiptAlreadyExists:
    "This order is already paid. Refresh to view its receipt.",
  ZeroOrderId: "Create a new order before paying.",
  TokenTransferFailed:
    "The test token transfer failed. Check the balance and allowance, then retry.",
  Reentrancy:
    "The contract rejected this transaction. Refresh before trying again.",
};
export function explain(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError;
    if (revert?.data?.errorName)
      return (
        messages[revert.data.errorName] ??
        `The contract rejected this action (${revert.data.errorName}). Refresh and try again.`
      );
  }
  const text = error instanceof Error ? error.message : String(error);
  if (/user rejected|user denied|rejected the request|4001/i.test(text))
    return "Request declined in your wallet. You can try again.";
  if (/insufficient funds|exceeds the balance/i.test(text))
    return "Not enough test funds. Check your token balance and Sepolia gas balance.";
  if (/provider.*not found|provider is not available/i.test(text))
    return "No browser wallet found. Open this page in a wallet app or choose Coinbase Wallet.";
  if (/timeout|timed out|fetch|HTTP request|network request/i.test(text))
    return "The network did not respond. Check your connection and retry.";
  return text.length < 230 && !/0x[a-f\d]{20}/i.test(text)
    ? text
    : "The action could not complete. Refresh the contract state and try again.";
}
