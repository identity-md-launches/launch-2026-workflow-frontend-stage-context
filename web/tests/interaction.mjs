import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { zeroAddress, toHex } from "viem";
import { serve } from "../scripts/serve.mjs";
import {
  createMock,
  installMock,
  account,
  owner,
  token,
  nft,
  swarm,
  treasury,
  nextOwner,
  fixtureAddress,
} from "./mock-chain.mjs";
const manifest = JSON.parse(
  await readFile(new URL("../../dist/imd-deployment.json", import.meta.url)),
);
const abi = JSON.parse(
  await readFile(
    new URL("../../dist/" + manifest.contracts[0].abiPath, import.meta.url),
  ),
);
const out = new URL("../../docs/validation/", import.meta.url);
await mkdir(out, { recursive: true });
await mkdir(new URL("../../test/scratch/interaction/", import.meta.url), {
  recursive: true,
});
const { server, url } = await serve();
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
const test = async (name, fn) => {
  if (
    process.env.FOLIR_TEST_FILTER &&
    !name.includes(process.env.FOLIR_TEST_FILTER)
  )
    return;
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log("PASS " + name);
  } catch (e) {
    results.push({
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: e.message,
    });
    console.error("FAIL " + name + "\n" + e.message);
  }
};
async function setup(options = {}, browserOptions = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...browserOptions,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => errors.push(error.message));
  const mock = createMock(manifest, abi, options);
  await installMock(page, mock, manifest, {
    provider: browserOptions.provider !== false,
  });
  await page.goto(url + "/ipfs/folir-test/");
  await expect(
    page.getByRole("heading", { name: "Understand your portfolio." }),
  ).toBeVisible();
  return { page, mock, context };
}
async function connect(page) {
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page.getByRole("button", { name: "FOLIR test wallet" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function approve(page, amount = "0.75") {
  const b = page.getByRole("button", {
    name: `Approve ${amount} TST`,
    exact: true,
  });
  await expect(b).toBeEnabled();
  await b.click();
  await expect(
    page.getByRole("button", { name: `Pay ${amount} TST`, exact: true }),
  ).toBeEnabled();
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(sizes.scroll <= sizes.width, JSON.stringify(sizes));
}
try {
  await test("Disconnected, three steps, synthetic analysis, expandable assets, filters, scenarios, history, optional tax and download", async () => {
    const { page, context, mock } = await setup({}, { provider: false });
    await expect(page.locator(".steps li")).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: "Add wallet to continue" }),
    ).toBeDisabled();
    await page.getByLabel("Include a tax illustration").check();
    await page.getByRole("button", { name: "Explore sample analysis" }).click();
    await expect(
      page.getByRole("heading", { name: "Your sample analysis" }),
    ).toBeVisible();
    await expect(page.locator(".asset")).toHaveCount(5);
    await page.locator(".asset summary").first().click();
    await expect(page.getByText("Sample quantity").first()).toBeVisible();
    await page
      .getByLabel("Filter sample assets")
      .selectOption("Tokenized stock");
    await expect(page.locator(".asset")).toHaveCount(2);
    await page.getByRole("button", { name: "3 months", exact: true }).click();
    await expect(page.locator(".chart svg")).toHaveAttribute(
      "aria-label",
      /3 months/,
    );
    await page.getByRole("button", { name: "Scenarios", exact: true }).click();
    await expect(page.locator(".scenario-result")).toContainText("$42,000");
    await page.getByRole("button", { name: "+25%", exact: true }).click();
    await expect(page.locator(".scenario-result")).toContainText("$56,063");
    await page.getByLabel("Asset class", { exact: true }).selectOption("NFT");
    await expect(page.locator(".scenario-result")).toContainText("$49,500");
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(page.locator(".activity-list li")).toHaveCount(4);
    await page.getByRole("button", { name: "Tax", exact: true }).click();
    await expect(page.getByText("$780", { exact: true })).toBeVisible();
    const dl = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download sample", exact: true })
      .click();
    const download = await dl;
    const contents = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(contents.synthetic, true);
    assert.equal(contents.realResearch, false);
    assert.equal(contents.assets.length, 5);
    assert.equal(contents.tax.amount, 780);
    assert.equal(mock.sends.length, 0);
    await context.close();
  });
  await test("Mobile first screen at 390/320, wallet links, keyboard focus, dialog close, reflow and accessibility audit", async () => {
    const { page, context } = await setup(
      {},
      {
        provider: false,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      },
    );
    await noOverflow(page);
    const action = await page
      .getByRole("button", { name: "Explore sample analysis" })
      .boundingBox();
    assert.ok(action.y + action.height < 844);
    await page.screenshot({ path: new URL("mobile-390.png", out).pathname });
    await page
      .getByRole("button", { name: "Connect wallet", exact: true })
      .click();
    for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"])
      await expect(
        page.getByRole("link", { name: "Open in " + name }),
      ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Coinbase Smart Wallet" }),
    ).toBeVisible();
    assert.ok(
      (
        await page
          .getByRole("link", { name: "Open in Rabby" })
          .getAttribute("href")
      ).includes("_cmd=open-dapp&dapp="),
    );
    await noOverflow(page);
    await page.screenshot({ path: new URL("wallet-mobile.png", out).pathname });
    for (let i = 0; i < 10; i++) await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(
        () => document.activeElement.closest("dialog") !== null,
      ),
      true,
    );
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Connect wallet", exact: true }),
    ).toBeFocused();
    await page.setViewportSize({ width: 320, height: 800 });
    await noOverflow(page);
    await page.screenshot({ path: new URL("mobile-320.png", out).pathname });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await writeFile(
      new URL("axe.json", out),
      JSON.stringify(
        {
          violations: axe.violations,
          passes: axe.passes.length,
          incomplete: axe.incomplete.map((x) => ({
            id: x.id,
            description: x.description,
          })),
        },
        null,
        2,
      ),
    );
    assert.equal(
      axe.violations.length,
      0,
      JSON.stringify(
        axe.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
    );
    await context.close();
  });
  await test("Named EIP-6963 wallet, exact approval, pending lock, payment receipt, duplicate prevention and reload recovery", async () => {
    const { page, mock, context } = await setup();
    await connect(page);
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    let release;
    mock.signGate = new Promise((r) => {
      release = r;
    });
    await page.getByRole("button", { name: "Approve 0.75 TST" }).click();
    await expect(
      page.getByRole("button", { name: "Approving test tokens…" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Review and confirm this transaction in your wallet.", {
        exact: true,
      }),
    ).toBeVisible();
    release();
    mock.signGate = null;
    await expect(
      page.getByRole("button", { name: "Pay 0.75 TST" }),
    ).toBeEnabled();
    assert.equal(mock.sends.length, 1);
    assert.equal(mock.sends[0].to.toLowerCase(), token.toLowerCase());
    assert.equal(
      mock.sends[0].decoded.args[0].toLowerCase(),
      manifest.contracts[0].address.toLowerCase(),
    );
    assert.equal(mock.sends[0].decoded.args[1], 750000n);
    await page.getByRole("button", { name: "Pay 0.75 TST" }).click();
    await expect(
      page.getByRole("button", { name: "Get your analysis", exact: true }),
    ).toBeEnabled();
    assert.equal(mock.sends.length, 2);
    assert.equal(mock.sends[1].decoded.functionName, "pay");
    assert.equal(
      mock.sends[1].decoded.args[1].toLowerCase(),
      token.toLowerCase(),
    );
    assert.equal(mock.sends[1].value, undefined);
    assert.notEqual(mock.sends[1].decoded.args[0], toHex(0n, { size: 32 }));
    await expect(
      page.getByRole("heading", { name: "Receipt #1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pay 0.75 TST" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: new URL("paid-desktop.png", out).pathname,
      fullPage: true,
    });
    const order = mock.sends[1].decoded.args[0];
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Get your analysis", exact: true }),
    ).toBeEnabled();
    assert.equal(mock.sends.length, 2);
    assert.equal(mock.receipts[0].orderId, order);
    await page.locator(".payment-details summary").click();
    await page.getByRole("button", { name: "Start a new order" }).click();
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    assert.notEqual(await page.locator(".order-id").first().innerText(), order);
    await context.close();
  });
  await test("Identity NFT discount quotes and pays 0.50 with no treasury transfer", async () => {
    const { page, mock, context } = await setup({ discount: true });
    await connect(page);
    await approve(page, "0.5");
    await page
      .getByRole("button", { name: "Pay 0.5 TST", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Receipt #1" }),
    ).toBeVisible();
    assert.equal(mock.sends[0].decoded.args[1], 500000n);
    assert.equal(mock.receipts[0].treasuryAmount, 0n);
    await context.close();
  });
  await test("Unknown-chain switch adds exact handoff chain parameters and switches again", async () => {
    const { page, mock, context } = await setup({
      walletChain: 1,
      unknownChain: true,
    });
    await connect(page);
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    const flow = mock.requests.filter(
      (x) =>
        x.method.startsWith("wallet_") &&
        ["wallet_switchEthereumChain", "wallet_addEthereumChain"].includes(
          x.method,
        ),
    );
    assert.deepEqual(
      flow.map((x) => x.method),
      [
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
        "wallet_switchEthereumChain",
      ],
    );
    assert.deepEqual(flow[1].params, [manifest.walletAddChain]);
    await context.close();
  });
  await test("Wrong network remains disabled after switch rejection and can recover", async () => {
    const { page, mock, context } = await setup({
      walletChain: 1,
      rejectSwitch: true,
    });
    await page
      .getByRole("button", { name: "Connect wallet", exact: true })
      .click();
    await page.getByRole("button", { name: "FOLIR test wallet" }).click();
    await expect(
      page.getByText("Request declined in your wallet. You can try again.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close wallet dialog" }).click();
    await expect(page.locator("#wallet-control")).toHaveText(
      "Switch to Sepolia",
    );
    await expect(page.locator("#payment .primary")).toBeDisabled();
    mock.rejectSwitch = false;
    await page.locator("#wallet-control").click();
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    await context.close();
  });
  await test("Wallet connection rejection and transaction rejection show retryable errors", async () => {
    const { page, mock, context } = await setup({ rejectConnect: true });
    await page
      .getByRole("button", { name: "Connect wallet", exact: true })
      .click();
    await page.getByRole("button", { name: "FOLIR test wallet" }).click();
    await expect(
      page.getByText("Request declined in your wallet. You can try again."),
    ).toBeVisible();
    mock.rejectConnect = false;
    await page.getByRole("button", { name: "FOLIR test wallet" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    mock.rejectSend = true;
    await page.getByRole("button", { name: "Approve 0.75 TST" }).click();
    await expect(page.locator(".transaction-status")).toContainText(
      "Request declined",
    );
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    assert.equal(mock.sends.length, 0);
    mock.rejectSend = false;
    await approve(page);
    await context.close();
  });
  await test("Simulation revert stops signing; changed recipients require a fresh review", async () => {
    const { page, mock, context } = await setup({ allowance: 750000n });
    await connect(page);
    mock.failSimulation = true;
    await page.getByRole("button", { name: "Pay 0.75 TST" }).click();
    await expect(page.locator(".transaction-status")).toContainText(
      "Test payments are paused",
    );
    assert.equal(mock.sends.length, 0);
    mock.failSimulation = false;
    mock.state.swarmRecipient = fixtureAddress("changed swarm");
    await page.getByRole("button", { name: "Pay 0.75 TST" }).click();
    await expect(page.locator(".transaction-status")).toContainText(
      "Payment details changed",
    );
    assert.equal(mock.sends.length, 0);
    await page.getByRole("button", { name: "Pay 0.75 TST" }).click();
    await expect(
      page.getByRole("heading", { name: "Receipt #1" }),
    ).toBeVisible();
    await context.close();
  });
  await test("Reverted payment is an error with no receipt, no success claim and retry enabled", async () => {
    const { page, mock, context } = await setup({ allowance: 750000n });
    await connect(page);
    mock.revertNext = true;
    await page.getByRole("button", { name: "Pay 0.75 TST" }).click();
    await expect(page.locator(".transaction-status")).toContainText(
      "transaction reverted",
    );
    assert.equal(mock.receipts.length, 0);
    await expect(
      page.getByRole("button", { name: "Pay 0.75 TST" }),
    ).toBeEnabled();
    await context.close();
  });
  await test("Receipt lookup by number and by wallet/order; absent and invalid inputs", async () => {
    const { page, mock, context } = await setup();
    const order = toHex(9n, { size: 32 });
    mock.receipts.push({
      number: 1n,
      payer: account,
      orderId: order,
      token,
      swarmAmount: 500000n,
      treasuryAmount: 250000n,
      swarmRecipient: swarm,
      treasuryRecipient: treasury,
      identityDiscount: false,
      paidAt: 1782907200n,
    });
    await page
      .getByRole("button", { name: "Find receipt", exact: true })
      .click();
    await expect(
      page.getByText("Enter a positive receipt number."),
    ).toBeVisible();
    await page.getByLabel("Receipt number", { exact: true }).fill("2");
    await page
      .getByRole("button", { name: "Find receipt", exact: true })
      .click();
    await expect(page.getByText(/No receipt found/)).toBeVisible();
    await page.getByLabel("Receipt number", { exact: true }).fill("1");
    await page
      .getByRole("button", { name: "Find receipt", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Receipt #1" }),
    ).toBeVisible();
    await page.getByLabel("Find a receipt by").selectOption("order");
    await page.getByLabel("Payer wallet address").fill(account);
    await page.getByLabel("Order ID", { exact: true }).fill(order);
    await page
      .getByRole("button", { name: "Find receipt", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Receipt #1" }),
    ).toBeVisible();
    assert.equal(mock.sends.length, 0);
    await context.close();
  });
  await test("All owner configuration actions, recipient validation, pause/unpause, transfer/cancel/accept", async () => {
    const { page, mock, context } = await setup({ selectedAccount: owner });
    mock.state = {
      ...mock.state,
      paused: true,
      isConfigured: false,
      paymentToken: zeroAddress,
      identityNft: zeroAddress,
      swarmRecipient: zeroAddress,
      treasuryRecipient: zeroAddress,
    };
    await connect(page);
    await expect(
      page.getByRole("heading", { name: "Owner setup" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enable test payments", exact: true }),
    ).toBeDisabled();
    for (const [id, value, label] of [
      ["setPaymentToken", token, "test payment token"],
      ["setIdentityNft", nft, "identity nft"],
      ["setSwarmRecipient", swarm, "swarm-funding recipient"],
      ["setTreasuryRecipient", treasury, "treasury recipient"],
    ]) {
      if (id === "setTreasuryRecipient") {
        await page.locator("#" + id).fill(swarm);
        await page
          .locator(".setting")
          .filter({ has: page.locator("#" + id) })
          .getByRole("button", { name: "Review", exact: true })
          .click();
        await expect(
          page.getByText("The two recipient addresses must differ."),
        ).toBeVisible();
      }
      await page.locator("#" + id).fill(value);
      await page
        .locator(".setting")
        .filter({ has: page.locator("#" + id) })
        .getByRole("button", { name: "Review", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm " + label, exact: true })
        .click();
      await expect(page.locator("#owner .transaction-status")).toContainText(
        "Transaction confirmed",
      );
    }
    await page
      .getByRole("button", { name: "Enable test payments", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Confirm enable test payments",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Pause test payments", exact: true }),
    ).toBeEnabled();
    assert.equal(mock.state.paused, false);
    await page
      .getByRole("button", { name: "Pause test payments", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm pause test payments", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Enable test payments", exact: true }),
    ).toBeEnabled();
    assert.equal(mock.state.paused, true);
    await page
      .locator("#owner summary")
      .filter({ hasText: "Transfer ownership" })
      .click();
    const nominate = async () => {
      await page.getByLabel("New owner address").fill(nextOwner);
      await page
        .locator("#owner details")
        .getByRole("button", { name: "Review", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Confirm nominate new owner",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Cancel pending transfer",
          exact: true,
        }),
      ).toBeEnabled();
    };
    await nominate();
    await page
      .getByRole("button", { name: "Cancel pending transfer", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Confirm cancel pending ownership transfer",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Cancel pending transfer",
        exact: true,
      }),
    ).toHaveCount(0);
    assert.equal(mock.state.pendingOwner, zeroAddress);
    await nominate();
    mock.selectedAccount = nextOwner;
    await page.evaluate(
      (a) => window.__emitWallet("accountsChanged", [a]),
      nextOwner,
    );
    await expect(
      page.getByRole("button", { name: "Accept ownership", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Accept ownership", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Confirm accept contract ownership",
        exact: true,
      })
      .click();
    await expect(page.getByLabel("New owner address")).toHaveCount(1);
    assert.equal(mock.state.owner.toLowerCase(), nextOwner.toLowerCase());
    assert.deepEqual(
      new Set(mock.sends.map((s) => s.decoded.functionName)),
      new Set([
        "setPaymentToken",
        "setIdentityNft",
        "setSwarmRecipient",
        "setTreasuryRecipient",
        "unpause",
        "pause",
        "transferOwnership",
        "acceptOwnership",
      ]),
    );
    await context.close();
  });
  await test("RPC fallback, no-code/chain mismatch and unavailable RPC disable payments; wallet-provider fallback", async () => {
    const first = await setup({
      failHosts: [
        new URL(manifest.network.rpcUrls[0]).host,
        new URL(manifest.network.rpcUrls[1]).host,
      ],
    });
    await connect(first.page);
    await expect(
      first.page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    await first.context.close();
    for (const options of [
      { emptyCode: true },
      { rpcChain: 1 },
      { failHttp: true },
    ]) {
      const { page, context } = await setup(options, { provider: false });
      await expect(page.locator("#contract .error")).toBeVisible();
      await expect(page.locator("#payment .primary")).toBeDisabled();
      await context.close();
    }
    const { page, context } = await setup({ failHttp: true });
    await connect(page);
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    await context.close();
  });
  await test("Insufficient funds, large-balance reflow and account/chain change reset eligibility", async () => {
    const { page, mock, context } = await setup({ balance: 1n });
    await connect(page);
    await expect(
      page.getByText("Your test token balance is too low."),
    ).toBeVisible();
    await expect(page.locator("#payment .primary")).toBeDisabled();
    mock.balance = 2n ** 240n;
    await page.getByRole("button", { name: "Refresh contract state" }).click();
    await expect(
      page.getByRole("button", { name: "Approve 0.75 TST" }),
    ).toBeEnabled();
    await page.locator(".payment-details summary").click();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(page);
    }
    mock.walletChain = 1;
    await page.evaluate(() => window.__emitWallet("chainChanged", "0x1"));
    await expect(page.locator("#wallet-control")).toHaveText(
      "Switch to Sepolia",
    );
    await expect(page.locator("#payment .primary")).toBeDisabled();
    await context.close();
  });

  await test("Pending transaction survives reload, stays locked and checks confirmation without resending", async () => {
    const { page, mock, context } = await setup();
    await connect(page);
    mock.holdConfirmation = true;
    await page.getByRole("button", { name: "Approve 0.75 TST" }).click();
    await expect(
      page.getByText(
        "Transaction submitted. Waiting for on-chain confirmation…",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approving test tokens…" }),
    ).toBeDisabled();
    assert.equal(mock.sends.length, 1);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Check confirmation", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#payment .primary")).toBeDisabled();
    mock.holdConfirmation = false;
    await page
      .getByRole("button", { name: "Check confirmation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Pay 0.75 TST" }),
    ).toBeEnabled();
    assert.equal(mock.sends.length, 1);
    await context.close();
  });
  await test("Zero-first allowance reset is explicit and confirms before exact approval", async () => {
    const { page, mock, context } = await setup({ allowance: 1n });
    await connect(page);
    await page.locator(".payment-details summary").click();
    await page
      .getByRole("button", { name: "Reset approval to zero", exact: true })
      .click();
    await expect(page.locator(".transaction-status")).toContainText(
      "Transaction confirmed",
    );
    assert.equal(mock.sends[0].decoded.args[1], 0n);
    await approve(page);
    assert.equal(mock.sends[1].decoded.args[1], 750000n);
    await context.close();
  });
  await test("No gas blocks payment with faucet links; broken NFT quote preserves owner repair controls", async () => {
    const first = await setup({ gas: 0n });
    await connect(first.page);
    await expect(
      first.page.getByText("Add Sepolia ETH for network gas."),
    ).toBeVisible();
    await expect(first.page.locator("#payment .primary")).toBeDisabled();
    await first.page.locator(".payment-details summary").click();
    await expect(
      first.page.getByRole("link", { name: "Sepolia faucet 1" }),
    ).toHaveAttribute("href", manifest.network.faucets[0]);
    await first.context.close();
    const { page, mock, context } = await setup({
      selectedAccount: owner,
      quoteFailure: true,
    });
    await connect(page);
    await expect(
      page.getByRole("heading", { name: "Owner setup" }),
    ).toBeVisible();
    await expect(page.locator("#payment .primary")).toBeDisabled();
    await expect(
      page
        .locator(".setting")
        .first()
        .getByRole("button", { name: "Review", exact: true }),
    ).toBeEnabled();
    assert.equal(mock.sends.length, 0);
    await context.close();
  });
  await test("Absent browser wallet gives a recoverable message and keeps alternative connector", async () => {
    const { page, context } = await setup({}, { provider: false });
    await page
      .getByRole("button", { name: "Connect wallet", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Browser wallet", exact: true })
      .click();
    await expect(page.getByText(/No browser wallet found/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Coinbase Wallet", exact: true }),
    ).toBeEnabled();
    await context.close();
  });
  await test("Owner layout, dialog contrast and keyboard focus remain usable", async () => {
    const { page, context } = await setup({ selectedAccount: owner });
    await connect(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator("#owner summary").click();
    await noOverflow(page);
    const ownerAudit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.equal(
      ownerAudit.violations.length,
      0,
      JSON.stringify(ownerAudit.violations.map((v) => v.id)),
    );
    await page.locator("#wallet-control").click();
    await noOverflow(page);
    const dialogAudit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.equal(
      dialogAudit.violations.length,
      0,
      JSON.stringify(dialogAudit.violations.map((v) => v.id)),
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("#wallet-control")).toBeFocused();
    await page.screenshot({
      path: new URL("keyboard-focus.png", out).pathname,
    });
    await context.close();
  });

  await test("ABI tampering fails closed before payment UI loads", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/abi/FolirPayments.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );
    await page.goto(url);
    await expect(page.getByRole("alert")).toContainText(
      "Contract ABI verification failed",
    );
    await expect(
      page.getByRole("button", { name: "Connect wallet" }),
    ).toHaveCount(0);
    await context.close();
  });
  await test("Desktop, intermediate layout and reduced-motion render without errors", async () => {
    const { page, context } = await setup({}, { provider: false });
    for (const width of [1440, 1024, 820, 768, 680, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: new URL("desktop-1440.png", out).pathname });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
      true,
    );
    await context.close();
    assert.deepEqual(errors, []);
  });
  let wk;
  try {
    wk = await webkit.launch({ headless: true });
    await test("WebKit sample action and mobile reflow", async () => {
      const page = await wk.newPage({ viewport: { width: 390, height: 844 } });
      const mock = createMock(manifest, abi);
      await installMock(page, mock, manifest, { provider: false });
      await page.goto(url);
      await page
        .getByRole("button", { name: "Explore sample analysis" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Your sample analysis" }),
      ).toBeVisible();
      await noOverflow(page);
    });
  } catch (e) {
    results.push({
      name: "WebKit browser",
      passed: null,
      limitation:
        "WebKit could not launch: required system libraries are unavailable.",
    });
    console.log("LIMITATION: WebKit system libraries unavailable.");
  } finally {
    await wk?.close();
  }
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
  await writeFile(
    new URL("interactions.json", out),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        target: "Production export served at an IPFS-style subpath",
        mode: "Mocked wallet and RPC. No real transaction broadcasts.",
        results,
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
}
if (results.some((r) => r.passed === false)) process.exitCode = 1;
