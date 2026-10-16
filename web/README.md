# FOLIR frontend

A static English React/TypeScript application for the deployed **FolirPayments** contract on Sepolia. The interface has exactly three steps: **Add your wallet → Choose and pay → Get your analysis**. The portfolio is an explicitly labelled synthetic demonstration, including crypto, tokenized stocks, an NFT, allocation, historical illustrations, gains/losses, asset details, risk/news examples, adjustable scenarios and optional Tax. Downloading a sample exports JSON locally; no analysis server is implied.

## Install, run and rebuild

Use Node 22.12+ (validated with Node 24) and npm. All frontend tooling and the lockfile live here; no root build configuration changes are needed.

```sh
cd web
npm ci
npm run typecheck
npm run build
npm run verify
npm run preview
```

`npm run build` runs Vite with a relative `./` base, writes **repository-root `dist/`**, copies the implementation-derived ABI and generates `dist/imd-deployment.json` **after** all export files exist. `npm run verify` checks the exact handoff, allowed manifest keys, ABI binding, network parameters and every asset's bytes. The publisher can serve `dist/` directly, including at an IPFS gateway subpath. There are no server routes or server dependencies in production.

For source development, run `npm run dev`. Its small Vite middleware reads the same committed `dist/imd-deployment.json` and ABI files; it does not define another deployment. Run `npm run build` first if those files are absent. Never use the development server as production hosting.

## Deployment is one runtime configuration

The application fetches `./imd-deployment.json` and the ABI named by its contract entry. `src/config.ts` validates the ABI's canonical Keccak hash, constructs the chain, configures the public RPC fallback and wallet connectors, and handles chain switching. The app does not contain another application address/ABI/chain map.

Reproducible build inputs are `../docs/deployment-handoff.json`, `../docs/network.json` and `../docs/abi/FolirPayments.json`. The first two are unchanged copies of the supplied handoffs. The ABI is the raw implementation export at deployed source commit `2a60a84a403e0c035c0c8301c48efe086461aab0`. Its canonical Keccak-256 is `3020f73cbd8d1edc9e6f07ad4f27ca256672f3d9b1a8a3eccc938da57f52ad0c` (recursive sorted object keys, array order retained, compact JSON, UTF-8). When the pinned Git object is present, the builder also compares the ABI bytes to that object. A downloaded source archive without Git must still pass the attested ABI hash.

The manifest's `sourceCommit` describes **deployed contract source**, not a new frontend revision. Its contract set, launch ID, attestation, network and wallet-add-chain parameters remain those of the supplied handoff. This launch is `evm_contracts` with no protocol token or pool, so it has no `poolKey`, swap, liquidity, router approval or Permit2 flow. The supplied network block, including its Uniswap addresses, is preserved unchanged and is not used to invent a trading feature.

All endpoints are supplied public RPCs. There is no API key, WalletConnect project ID, secret, analytics client or backend. Wallet signing stays with the visitor. Runtime read fallback tries the network's RPCs in order, then the connected provider on the correct chain. A read verifies chain ID and nonempty contract code, reads a coherent block snapshot and refreshes every 15 seconds while connected (30 seconds otherwise). Background polling follows TanStack Query's visibility behavior. Read errors disable writes, and manual refresh is available.

## Wallet and payment behavior

- Browser wallets are discovered by EIP-6963 and retain their own name/icon. The generic connector is labelled “Browser wallet” and is hidden when a named provider exists.
- On phones without an injected provider, the sheet offers MetaMask, Coinbase Wallet, Rabby and Phantom app-browser links. Coinbase Wallet's SDK also offers a passkey smart wallet. No relay/project ID is needed.
- Connection attempts switch to Sepolia. An unknown-chain error triggers `wallet_addEthereumChain` using the exact supplied parameters, followed by another switch. A rejected switch leaves a visible **Switch to Sepolia** control and disables transactions.
- Quote, NFT eligibility, token decimals/symbol, balance, allowance, gas balance, recipients and current-order receipt come from contract reads. Before a write, account/chain, code, state and the intended action are checked again, then simulated. Changed price/token/recipients require another review. The contract owner can still change configuration after submission; this is a contract-level trust assumption, not a frontend guarantee.
- Approval is a separate transaction for exactly the quoted amount **to FolirPayments**. There is an explicit zero-allowance reset for tokens that require it. Payment calls `pay(orderId, paymentToken)` and sends no native value. The wallet quotes gas. No USD payment value is fabricated.
- One transaction lock covers signing, mining and state refresh; the visible pending label belongs to the action actually running. A submitted hash remains saved across reloads. A timeout or reload offers **Check confirmation**, never an automatic resubmission. Checking waits for a connected wallet and a successful current state read. Replacement/cancellation detection is wired through viem; real replacement behavior was not exercised.
- A cryptographically random, nonzero 32-byte order is saved per contract/chain/wallet. An existing receipt prevents repeat payment; “Start a new order” becomes available after payment. Browser storage is optional; retain the displayed order ID or receipt number for recovery on another device. Clearing storage creates a new order, not another copy of the old receipt.
- Receipts can be looked up by number or payer/order without a wallet. They display on-chain recorded amounts, payer, token, recipients, discount and timestamp. Token metadata is queried for each historical receipt; if unavailable, amounts are explicitly labelled base units.

A receipt proves a **test payment only**. Sample analysis is available without payment, stays synthetic after payment, and never imports or purports to analyze the connected wallet's portfolio. Optional Tax is only a hypothetical arithmetic illustration, not a tax service. No investment research or customer billing is delivered by this release.

## Owner setup

The supplied contract is deployed but initially paused with its four settings unset. The frontend does not substitute addresses. Connecting the on-chain owner reveals a setup panel with one review/confirm control for each setting:

1. Allowlisted standard test ERC-20 token (2–36 decimals; owner must choose a suitable non-fee-on-transfer token).
2. Test ERC-721 identity NFT.
3. Swarm-funding recipient.
4. A different treasury recipient.

After all four are configured, **Enable test payments** becomes available. **Pause test payments**, two-step ownership nomination/acceptance and cancellation of a pending transfer are also present. The zero address is used only for the contract's explicit ownership-transfer cancellation operation and for detecting unset on-chain state. It is never a stand-in deployment or recipient.

Address inputs validate nonzero addresses and distinct recipients; contract behavior is simulated before signing. Visitors see the unconfigured/paused state. A failing quote does not hide the owner's repair panel. Settings were not changed on the live contract by this worker.

## Validation

```sh
cd web
npm run typecheck
npm run build
npm run verify
npx playwright install chromium
npm test
node scripts/check-rpc.mjs
```

`npm test` starts and stops its own server, serves the actual production export at `/ipfs/folir-test/`, injects mock EIP-6963 wallets and intercepts all external calls. It never sends a real transaction. Fixtures are test-only and are not imported into production. Evidence is written under `../docs/validation/`. A supported WebKit installation enables its additional check; this worker's WebKit could not launch due to missing system libraries.

The read-only RPC script verifies the configured network, contract code and settings, recording `../docs/validation/live-rpc.json`. It makes no state-changing requests. Run it only when network access is intended.

The assignment's pinned design probe was also run from the repository root:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/folir-browsers \
IMD_PLAYWRIGHT="$PWD/web/node_modules/playwright/index.mjs" \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The pinned `.imd/reads/` inputs are assignment-provided and are removed by the publisher. They are not build dependencies. See [validation](../docs/VALIDATION.md), [design system](../docs/DESIGN.md) and the committed screenshots/results for measured coverage and limitations. Checks are this worker's evidence, not independent certification.

To regenerate the share image from its editable SVG source after a deliberate design change, run `node scripts/generate-share.mjs` with an installed Chromium browser, then rebuild. Runtime fonts, icons and their licenses are local. Open Graph paths are relative because the final host/domain is assigned during publication; the publisher may supply an absolute social-image URL once that is known, followed by a new export manifest.

## Submission and publication

Only `web/**`, `dist/**` and `docs/**` are delivered. `web/.gitignore` has the explicit allowance supplied by the assignment and excludes generated dependencies/caches at every nesting level under `web/`. Do not commit `node_modules`, browser downloads, caches, dependency archives or submodules. No vendored registry is needed.

The requested design document is at `docs/DESIGN.md`: the overriding write scope does not permit a root `DESIGN.md`. Root build files and deployed source were preserved. This worker builds and validates the source/export; the publisher subsequently commits/publishes the submission and hosts the export. No frontend publication URL or CID is fabricated, and this worker does not redeploy contracts.
