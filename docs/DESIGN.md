# FOLIR design system

## Overview

FOLIR is a compact portfolio demonstration with an actual Sepolia payment-receipt interface. The brief's restrained **ivory/terminal** direction is implemented as warm flat surfaces, dark green actions, quiet rules and monospaced financial data. Inter carries navigation and prose; IBM Plex Mono carries amounts, addresses and order IDs. The portfolio is always labelled synthetic, and transaction state is visually separate from the demonstration.

The main page is an application workspace. A short introduction and exactly three steps precede the payment panel and sample analysis. There is no full-height marketing hero. On small screens the payment panel comes first, so the wallet, payment status and primary action remain on the first 390px-wide screen.

This document is intentionally under `docs/`: the assignment's overriding path budget permits `web/**`, `dist/**` and `docs/**`, but not a root `DESIGN.md`. Values below describe implemented source, not proposed design work.

## Colors

Canonical tokens are in `web/src/styles.css:17`. The site deliberately has one light theme (`color-scheme: light`); no theme toggle or unused dark palette is implied.

| Token | Value | Role |
| --- | --- | --- |
| `--page` | `#f5f3ec` | Ivory page background |
| `--surface` | `#fcfbf7` | Payment surface, fields, wallet sheet |
| `--soft` | `#eeeee5` | Current step and neutral hover |
| `--ink` | `#252b26` | Main text |
| `--muted` | `#65685f` | Descriptions, labels, chart axes |
| `--line` | `#d9dacf` | Structural rules and control borders |
| `--accent` | `#294c3e` | Main action, current step marker, chart line |
| `--accent-hover` | `#1f3a2f` | Filled-action hover |
| `--positive` | `#356247` | Positive gain and confirmed/ready text |
| `--negative` | `#994632` | Negative gain and error text |
| `--focus` | `#96521a` | 2px keyboard outline with 4px offset |
| `--tag`, `--chart-fill` | `#e6e9dd` | Quiet status surface and chart area |
| `--gold` | `#c8aa63` | NFT allocation segment |
| `--sage` | `#a5b19a` | Tokenized-stock allocation segment |

Asset identity discs have small local color treatments in `.asset-symbol`; they identify sample asset categories, not actions. All statuses also use words, signs or icons. Do not encode loss, success, selection or disabled eligibility only through color.

The final taste probe measured all sampled text above its applicable 4.5:1 / 3:1 threshold. Representative measured pairs are recorded in `docs/validation/design-measurements.json`. Focus was also inspected in the rendered keyboard screenshot; this is not a claim about every possible screen-reader or forced-color environment.

## Typography

Fonts are bundled WOFF2 files, loaded with `font-display: swap`. Inter's variable face supports the implemented weights; IBM Plex Mono's real regular face is used for data. `font-synthesis: none` prevents faux faces. Fontsource versions are pinned in `web/package-lock.json`; font licenses travel with the export.

| Token | Size | Use |
| --- | --- | --- |
| `--small` | 12px | Captions, metadata, receipt details, compact mobile controls |
| `--label` | 14px | Desktop controls, navigation, descriptions, asset names |
| `--body` | 16px | Fields, section subheads, normal prose |
| `--section` | 20px | Section headings |
| `--number` | 32px | Payment amount, mobile headline, brand |
| `--display` | 40px | Desktop headline and portfolio value |

Only weights 400, 600 and 700 are used. H1 is 700 with line-height 1.12 and tracking −0.045em; H2 is 600 with line-height 1.3 and tracking −0.025em; H3 is 600 with line-height 1.4. Body line-height is 1.5. Monospaced data stays regular and uses tabular numbers. Numeric displays are more prominent than supporting labels, but never receive heavier type than the headline.

`text-wrap: balance` applies to headings; prose uses `pretty`. Expanded risk explanations cap their reading measure. Full addresses and IDs wrap with `overflow-wrap: anywhere`; amounts and addresses are not ellipsized. The wallet header uses a conventional short address, with the complete checksummed address available in its sheet and copy/explorer controls. Inputs stay at 16px on mobile. No tracked capital kicker labels are authored.

## Layout

Shared CSS is in `web/src/styles.css`; composition is in `web/src/App.tsx`.

- Main content is at most 1200px wide. Desktop margins are 40px; intermediate margins are 24px; mobile margins are 16px.
- The workspace grid is `340px minmax(0, 1fr)` with a 32px gap. At 1100px it uses 310px/24px; at 820px it uses 280px/24px. At 680px it becomes a single column in DOM order: payment, then analysis.
- Three equal step columns persist on phones. Number/label pairs stack vertically, wrap naturally, and retain all three requested step names.
- The header drops secondary navigation at 820px and its network text at 680px, retaining brand and wallet control. The target network still appears in the wrong-network action and contract section.
- Analysis controls sit above the content they affect. Asset details use native disclosure rows. Allocation is a labelled stacked bar with a redundant text legend.
- Risks collapse from three columns to a vertical list at 820px. Receipts and contract state collapse from two columns to one at 680px. Owner input/action rows wrap on phones.
- A final 360px breakpoint reduces brand and asset-row density. Nothing relies on page-wide `overflow-x: hidden` to conceal layout errors.
- Major groups use 24–56px spacing; within controls/rows the common gaps are 8–16px. Headings and controls align to shared content edges.

Chromium reflow was checked at 320, 390, 680, 768, 820, 1024 and 1440px. Tests also exercise full addresses, a very large token balance and an open phone wallet sheet. Native 200% browser zoom, physical phones and RTL/localization were not tested; this release is English-only.

## Elevation & depth

The design is flat: no surface combines shadow and border, and no decorative gradient/glow is used. Thin rules separate sections and asset rows. A single lightly bordered payment surface distinguishes the live payment flow from the unboxed analysis workspace.

The wallet uses native `<dialog>` modal behavior with a translucent dark backdrop. It centers on desktop and attaches to the bottom edge below 680px. Browser modal semantics handle background inertness and focus containment. Escape, the backdrop and a labelled close button dismiss it; focus returns to the wallet control.

## Shapes

The payment panel uses an 8px radius. Buttons and wallet rows use 5px; fields use 4px; compact tags use 3px. Step counters and token identity discs are circular. The sample NFT icon is a small square with a 5px radius. The wallet sheet uses 10px corners on desktop and 12px top corners on phones.

No text container clips consequential content. The wallet sheet may scroll vertically within 85–90dvh and contains overscroll. Controls generally have a 44–54px target; compact data/chart controls use 32–40px with spacing. The probe found no targets that violate its 24px/spacing baseline; some compact targets are below its 44px comfort recommendation.

## Components

| Source | Reuse and states |
| --- | --- |
| `components/Wallet.tsx` | One wallet control, provider discovery, pending connector row, retryable rejection, wrong-network switch, connected account and disconnect. Native modal focus/escape behavior. |
| `components/Payment.tsx` → `Payment` | Live quote, optional Tax choice, configured/paused/disconnected/wrong-chain/funding states, explicit approval, payment, receipt transition and order disclosure. Every unavailable action has an adjacent reason. |
| `components/Payment.tsx` → `TransactionStatus` | Action-specific checking/signing/confirming/success/error messages, transaction explorer link and persistent confirmation recovery. Polite live region. |
| `components/Payment.tsx` → `OwnerPanel` | Labelled settings, address validation, inline review/confirm, enable/pause and two-step ownership. Only current/pending owners see the relevant controls. |
| `components/Portfolio.tsx` | Pressed-state view controls, history period buttons, SVG chart with accessible description, filters, native expandable asset rows, scenario controls, optional Tax and sample export. |
| `components/Receipts.tsx` | Receipt lookup forms, loading/empty/error/results, token-decimal reads and immutable receipt details. |
| `components/Address.tsx` | Full checksummed address, explorer link and clipboard button. Header abbreviation is a separate presentation in `Wallet`. |
| `components/Icons.tsx` | One set of restrained, `currentColor` outline icons and the FOLIR mark. Decorative icons are hidden from accessibility APIs. |
| `styles.css` → `.button`, `.icon-button`, `.facts`, `.section-head` | Reusable action, icon utility, key/value and heading/action patterns. Preserve hover, pressed, keyboard, disabled and wrapping states. |

Use a filled `.primary` for the action that advances the current payment/wallet flow. Related controls are neutral or text buttons. Feedback never depends on animation. The only continuous motion is the transaction spinner, and it runs only under `prefers-reduced-motion: no-preference`. Hover transitions are limited to background/border color for 120ms.

## Do's and don'ts

- Start additional content inside `.container`, retain shared edges and use existing type/spacing tokens.
- Keep synthetic portfolio data visibly distinguished from live contract state on every new view.
- Put a changing view's controls before its content; use native buttons, selects, details and forms.
- Pair a number with its unit, and render on-chain quantities using their token decimals. Never fabricate a real USD conversion.
- Keep payment authorization, pending locks and ABI/network validation in the payment controller. Styling must not bypass eligibility.
- Preserve complete addresses, order IDs, errors and recovery actions. Do not hide overflow to make a screenshot fit.
- Keep source assets local. Adding a runtime file requires a rebuild so the final manifest inventories its actual bytes.
- Do not add a dark theme, decorative cards, motion, fonts or new investment claims solely to fill visual space.
