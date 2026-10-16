import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const vite = await createServer({
  root,
  configFile: root + "vite.config.ts",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Explore sample analysis" }).click();
  await page.getByRole("heading", { name: "Your sample analysis" }).waitFor();
  const actual = await (
    await page.request.get(url + "/imd-deployment.json")
  ).json();
  const expected = JSON.parse(
    await readFile(new URL("../../dist/imd-deployment.json", import.meta.url)),
  );
  assert.deepEqual(actual, expected);
  assert.deepEqual(errors, []);
  await writeFile(
    new URL("../../docs/validation/development.json", import.meta.url),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        sourceDevelopmentServer: true,
        manifestMatchesCommittedExport: true,
        sampleInteractionPassed: true,
        uncaughtErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Development smoke check passed: same deployment manifest, working sample interaction, no uncaught errors.",
  );
} finally {
  await browser.close();
  await vite.close();
}
