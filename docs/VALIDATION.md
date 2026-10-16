# FOLIR frontend validation

**Complete for the assigned frontend delivery scope.** This is worker-authored evidence, not independent certification. The public deployment is deliberately still unconfigured; its owner must supply the four settings through the shipped setup panel before test payments can succeed. No real transaction was broadcast by this worker.

## Result at a glance

| Area | Result |
| --- | --- |
| Source and production export | Vite/React/TypeScript source, pinned npm lockfile, root `dist/`, relative hosting base |
| Production build / typecheck / manifest verification | Passed |
| Browser interaction suites | 20 passed in Chromium, using the actual export and mocked wallet/RPC |
| Uncaught application errors in interaction tests | 0 |
| Automated accessibility | 0 violations on the tested initial, owner and wallet surfaces; not a full conformance claim |
| Product and main action on first 390px screen | Confirmed by screenshot and button-bounds assertion |
| Horizontal overflow | None at 320, 390, 680, 768, 820, 1024 or 1440px; full addresses, very large balance and open sheet also tested |
| Pinned taste probe | 15/16 checks passed; the two eyebrow detections are chart/legend data, adjudicated below |
| Read-only deployment verification | All three configured RPCs returned the correct chain and identical nonempty contract runtime code |
| Publication | After worker submission; no URL/CID or publication result claimed |
| Write scope | Only allowed paths changed; root build files and deployed source preserved |

## Requirement coverage

| Approved requirement | Implemented evidence |
| --- | --- |
| “English React/TypeScript” | `web/src/`, `web/tsconfig.json`, `web/package-lock.json` |
| “exactly three steps: Add your wallet, Choose and pay, Get your analysis” | Three labelled items in `web/src/App.tsx`; tested count and navigation |
| “Connect to the deployed Sepolia contract using its real address and ABI” | Runtime manifest loader, canonical ABI hash validation, public RPC/wallet-provider fallback, chain and code verification |
| “Show test-payment state and receipts” | Current contract configuration, live quote/balance/allowance, explicit approval/pay, transaction lifecycle, current-order and arbitrary receipt lookup |
| “Standard price … identity NFT holder” | Contract `quote` decides eligibility and amounts; mocks verify 0.75 standard and 0.50 discounted payments, exact approval, no native value and no discounted treasury transfer |
| “Recipients, test token and test NFT … configurable by the deployment owner” | Four setting forms, review/confirm, configure-before-unpause gate, pause/unpause, ownership nomination/cancel/accept; all write methods exercised with mocks |
| “synthetic crypto, tokenized-stock and NFT data” | Persistent synthetic labels, five fixed sample assets, no claimed wallet import or live price feed |
| “allocation, history, gains/losses, risks/news, expandable assets, conditional scenarios and optional Tax” | Interactive view/period/filter/disclosure/scenario/Tax controls and downloadable synthetic JSON; tested |
| “restrained ivory/terminal … responsive on mobile” | Local Inter/IBM Plex Mono, ivory/green token system, mobile-first payment order; screenshots and six-domain review |
| “No real investment research or customer charges” | Explicit sample/testnet copy; all analysis remains synthetic after a test receipt |
| Static hosting and share metadata | Relative asset URLs, successful gateway-subpath tests, favicon/title/description/OG title/PNG image |
| Handoff manifest and complete asset inventory | Exact launch, chain, source commit, attestation, contract set and ABI hash; unchanged network/add-chain blocks; every other export file has SHA-256 |
| `poolKey` and swaps | Not applicable: handoff has no poolKey/token/pool, and approved launch is a payment application. No invented trading flow |
| “DESIGN.md at repository root” | Scoped exception: delivered as `docs/DESIGN.md`. The overriding write budget forbids a root file; no root file or symlink was created |
| GitHub/IPFS publication and public URLs | Assigned to the subsequent publisher. Worker supplied source/export/evidence; no hosting/deployment was attempted |

## Commands and evidence

Run from the repository root unless shown otherwise:

```sh
npm --prefix web ci
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web run verify
PLAYWRIGHT_BROWSERS_PATH=/tmp/folir-browsers npm --prefix web test
PLAYWRIGHT_BROWSERS_PATH=/tmp/folir-browsers node web/tests/development.mjs
node web/scripts/check-rpc.mjs
node web/scripts/check-submission.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/folir-browsers \
IMD_PLAYWRIGHT="$PWD/web/node_modules/playwright/index.mjs" \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

Dependencies were installed from the normal npm registry, with a pinned lockfile and no reported vulnerabilities in the install audit. `npm ci` is the reproducible installation command for consumers; the worker's initial installation used `npm install --save-exact`. Chromium and WebKit browser downloads live outside the submission. Tests start and stop their own bounded servers.

- `validation/build.log`: final typecheck/build/export-verification output.
- `validation/interactions.json`: test outcomes and absence of uncaught page errors. Each case exercises an observable behavior; these are not tests that merely restate source code.
- `validation/axe.json`: initial automated WCAG-tag scan (31 checks passed; two categories also include items needing manual judgment). Owner/dialog scans in the interaction suite also found no violations.
- `validation/development.json`: source development server uses the identical deployment manifest and serves an interactive sample without uncaught errors.
- `validation/taste-output.json`: unaltered pinned probe checks from the final export.
- `validation/design-measurements.json`: selected rendered text contrast measurements from that probe.
- `validation/live-rpc.json`: read-only chain/code/settings evidence.
- `validation/submission-budget.json`: permitted paths, raw submission budget and exclusion of generated dependencies/caches/submodules.

Browser automation uses the built files under an IPFS-style `/ipfs/folir-test/` subpath. Every mock test intercepts public RPC requests and blocks other external services. Transaction fixtures exist only under `web/tests/`; they are not production configuration. The assigned browser tool was additionally used to inspect the actual served export, verify loaded fonts, inspect the 390px layout, and operate the scenario control. Its +25% crypto scenario produced the expected synthetic $56,063 result with no overflow.

### Interaction coverage

The 20 passing Chromium cases cover:

1. Disconnected state, three steps, synthetic analysis, five assets, disclosure/filter, history period, conditional scenario, activity, optional Tax and downloaded JSON.
2. 390/320 layout, primary action bounds, all four mobile wallet links, Coinbase Smart Wallet row, modal keyboard containment, Escape/focus return and axe scan.
3. Named EIP-6963 connection, exact token approval, immediate pending lock, payment, receipt, duplicate prevention and reload/order persistence.
4. Identity NFT discount, exact 0.50 approval and absent treasury transfer.
5. Unknown-chain failure followed by the exact `wallet_addEthereumChain` parameters and successful re-switch.
6. Rejected switch, visible wrong-network action, disabled transactions and recovery.
7. Connection and transaction rejection with retryable feedback.
8. Contract simulation revert before signing and changed-recipient review before payment.
9. Reverted mined transaction, no receipt/success claim and an available retry.
10. Receipt lookup by number and wallet/order, invalid input and absent receipt.
11. Every owner write, equal-recipient validation, unpause gating, pause, ownership transfer/cancel/accept.
12. Public RPC fallback, wrong RPC chain, missing code, failed RPCs and connected wallet-provider fallback.
13. Insufficient token funds, a very large balance at 320/390, and account/network eligibility reset.
14. Saved pending transaction recovery after reload, locked action until confirmation and no second submission.
15. Explicit zero-first approval reset followed by exact allowance.
16. Missing gas with configured faucet links and failed quote with owner repair controls retained.
17. Missing browser wallet with recoverable message and Coinbase alternative.
18. Owner/mobile layout, owner/dialog accessibility scans and visible keyboard focus after close.
19. Tampered ABI rejection before the payment interface loads.
20. Desktop/intermediate/mobile widths, reduced-motion media state and no uncaught application errors.

The sample synthetic dataset uses illustrative USD values. No live token/USD conversion is inferred. Wallet balances and payment amounts use on-chain decimals with bigint formatting. Tests check a six-decimal token and a very large integer balance; other token decimals use the same viem formatter but were not separately exercised.

## Live read result

On the recorded read at block **11929699**, each of the three configured Sepolia RPCs reported chain **11155111**, **5862 bytes** of contract runtime code and runtime Keccak **`0x6d188b7e5a717946a42ab0cde86f2efb3822e56f54b1f23bebf5882f49aab44e`**. The address was the handoff's `FolirPayments` address. The contract was **paused**, `isConfigured` was **false**, all four configurable settings were unset, and the receipt count was **0**. Those zeros are actual contract responses, not supplied stand-in settings.

The raw ABI bytes match `docs/abi/FolirPayments.json` at deployed commit `2a60a84a403e0c035c0c8301c48efe086461aab0`; canonical Keccak matches the handoff's `3020f73cbd8d1edc9e6f07ad4f27ca256672f3d9b1a8a3eccc938da57f52ad0c`. Export verification rechecks that binding on each build. Reads establish observed deployment state, not an independent contract audit or proof of future availability.

## Better Interface review

**Visual idea:** an ivory portfolio workspace uses restrained terminal-style numbers and dark green actions to separate a synthetic analysis from a real test-payment receipt.

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native controls/labels/details/dialog, one main/H1, skip link, keyboard dialog loop and visible focus return, disabled-state reasons, persistent live feedback, three axe surfaces. No screen-reader session, native-device testing or exhaustive focus/background matrix |
| Layout | Checked | DOM order, first mobile screen, seven widths, long balances/full addresses, edge wallet sheet. Probe found no overlap, clipping or horizontal scroll. Native 200% browser zoom and localization expansion not performed |
| Writing | Checked | Action labels tied to actual behavior; synthetic and live state clearly separated; recoverable errors; current setup requirements explicit. No investment/news facts invented |
| Typography | Checked | Two locally loaded families, six sizes, three weights, 16px mobile inputs, tabular data and untruncated critical values. Fonts reported loaded in browser. No alternate language/RTL review |
| Colors | Checked | Final rendered contrast measurements passed the probe; selected ratios 13.02:1 headline, 9.23:1 connect action, 5.11:1 secondary text, 6.28:1 test-payment label. One intentional light theme; no dark-theme claim |
| UI | Checked | Flat surfaces, separated live payment and sample content, consistent SVG icons; hover/focus/disabled/loading/error/empty/confirmed states; reduced-motion behavior. Real passkey/mobile-app signing and transaction replacement were not performed |

### Findings, fixes and adjudication

1. **High, fixed: confirmation recovery could precede current wallet state.** Source: `web/src/usePayments.ts:454` and `web/src/components/Payment.tsx:46`. A reload test showed confirmation checking could refresh a pre-reconnection query and leave approval state stale. The recovery action now waits for the correct chain, successful current reads and completion of an in-progress refresh, with a matching handler guard. Recheck: the saved approval remains locked across reload and becomes payment-ready after confirmation, with exactly one transaction sent.
2. **Medium, fixed during implementation: quote failure must not hide owner repair.** Source: `web/src/usePayments.ts:147`. Quote, balance and allowance reads settle separately; quote errors block payment while retaining base configuration and owner controls. Recheck: a reverting quote leaves the owner setting controls usable and the visitor payment disabled.
3. **Medium, fixed during implementation: Rabby app link needed the actual handler parameters.** Source: `web/src/open-in.ts:18`. The mobile link uses the verified `/mobile/?_cmd=open-dapp&dapp=` form. Recheck: phone sheet includes that link with the current gateway subpath encoded. Physical Rabby handoff remains untested.
4. **Probe candidates, not design defects: two data labels resemble eyebrows to the geometric heuristic.** Source: `web/src/components/Portfolio.tsx:175` (chart axis “Period start”) and `web/src/components/Portfolio.tsx:194` (allocation legend “10.4%”). The probe identifies short mono text within 40px above a later heading. Screenshot inspection confirms these labels belong to the chart and allocation legend, not to “Allocation” or “Assets” as kickers. They were retained as useful data. The reported score remains **15/16**, not rewritten to 16/16.

No observed high/medium design defect remains unresolved. The initial probe's 11 targets below the 44px comfort recommendation passed its actual 24px/spacing rule; they are compact controls/links, not inaccessible overlapping targets. Critical first-screen and repeated layout checks passed.

### Screenshots

- `validation/live-mobile-390.png`: final export with actual read-only deployed state; product, connect control, setup state and sample action on the first screen.
- `validation/live-desktop-1440.png`: final export with actual read-only deployed state.
- `validation/mobile-320.png`, `validation/mobile-390.png`, `validation/desktop-1440.png`: mocked configured-contract views at the named widths.
- `validation/wallet-mobile.png`: mobile app-browser links and Smart Wallet option.
- `validation/paid-desktop.png`: mocked confirmed payment and receipt, with synthetic analysis labels retained.
- `validation/keyboard-focus.png`: inspected focus outline restored to the wallet control at 320px.

## Limitations and handoff

- WebKit was downloaded but could not launch because required system libraries were unavailable. Safari/iPhone rendering and physical mobile wallet deep links remain unverified. Chromium was used for required browser/interaction checks.
- Real extension signing, Coinbase passkey account creation, live approval/payment/owner transactions, native transaction replacement/cancellation, reorg behavior and real NFT/token integrations were not performed. All write validation used mocks, as required without transaction authorization.
- Screen readers, native 200% browser zoom, physical touch devices and forced-color rendering were not exercised. Automated checks and screenshots do not establish complete accessibility compliance.
- The four owner-selected addresses remain intentionally unset on chain. Their UI is shipped; they are neither guessed nor replaced. This is the contract's supported owner-configuration path, not missing frontend input.
- Owner configuration can change after simulation and while a transaction is pending. Exact approvals, fresh reads, token binding and simulation reduce accidental exposure but cannot alter the deployed contract's owner powers.
- Browser storage can be cleared or unavailable. The on-chain receipt persists and is recoverable through its number or payer/order; local order selection is not a shared server history.
- Relative Open Graph URLs are present and local assets load. Absolute hosted social metadata, IPFS CID/naming, GitHub publication and subsequent control-plane HTTP/RPC checks belong to the publisher. Those checks do not execute browser transactions and are not claimed here.
- Root `DESIGN.md` is outside the overriding write scope. The equivalent implemented design documentation is delivered at `docs/DESIGN.md`. No protected root configuration or deployed contract source was changed.
