import { useState } from "react";
import {
  sampleAssets,
  sampleCost,
  sampleTotal,
  histories,
  money,
} from "../sample";
import { Icon } from "./Icons";
export function Portfolio({
  tax,
  paid,
  selected,
}: {
  tax: boolean;
  paid: boolean;
  selected: boolean;
}) {
  const [view, setView] = useState("Overview");
  const [period, setPeriod] = useState<keyof typeof histories>("1 month");
  const [scenario, setScenario] = useState(-20);
  const [category, setCategory] = useState("Crypto");
  const [filter, setFilter] = useState("All assets");
  const [downloaded, setDownloaded] = useState(false);
  const views = ["Overview", "Scenarios", "Activity", ...(tax ? ["Tax"] : [])];
  const currentView = views.includes(view) ? view : "Overview";
  const values = histories[period];
  const min = Math.min(...values) - 1000,
    max = Math.max(...values) + 1200;
  const points = values
    .map(
      (n, i) =>
        `${(i / (values.length - 1)) * 640},${150 - ((n - min) / (max - min)) * 130}`,
    )
    .join(" ");
  const lastY = 150 - ((values.at(-1)! - min) / (max - min)) * 130;
  const selectedValue = sampleAssets
    .filter((a) => a.kind === category)
    .reduce((n, a) => n + a.value, 0);
  const delta = (selectedValue * scenario) / 100;
  const download = () => {
    const report = {
      title: "FOLIR synthetic portfolio illustration",
      synthetic: true,
      realResearch: false,
      currency: "USD (illustrative)",
      sampleTotal,
      sampleCost,
      assets: sampleAssets,
      scenario: { category, percent: scenario, illustrativeChange: delta },
      ...(tax
        ? {
            tax: {
              illustrativeRate: 20,
              sampleUnrealizedGain: sampleTotal - sampleCost,
              amount: (sampleTotal - sampleCost) * 0.2,
              note: "Simple hypothetical calculation, not a tax return or jurisdiction-specific advice.",
            },
          }
        : {}),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "folir-synthetic-analysis.json";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };
  return (
    <section
      id="analysis"
      className="analysis"
      aria-labelledby="analysis-title"
      tabIndex={-1}
    >
      <div className="analysis-head">
        <div>
          <h2 id="analysis-title">
            {selected ? "Your sample analysis" : "A look inside FOLIR"}
          </h2>
          <p className="small muted">
            Synthetic data · Illustrative USD · No live holdings
          </p>
        </div>
        <span className="sample-label">
          {paid ? "Receipt linked · Sample" : "Sample portfolio"}
        </span>
      </div>
      <div className="view-nav" aria-label="Analysis views">
        {views.map((v) => (
          <button
            key={v}
            aria-pressed={currentView === v}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </div>
      {currentView === "Overview" && (
        <>
          <div className="portfolio-summary">
            <div>
              <span className="muted small">Sample portfolio value</span>
              <p className="portfolio-value mono">
                {money(sampleTotal)}
                <span className="cents">.00</span>
              </p>
              <p className="positive small">
                <span className="mono">
                  +{money(sampleTotal - sampleCost)} (+
                  {((sampleTotal / sampleCost - 1) * 100).toFixed(2)}%)
                </span>
                <span className="muted"> vs. sample cost</span>
              </p>
            </div>
            <div className="period-control" aria-label="Chart period">
              {Object.keys(histories).map((p) => (
                <button
                  key={p}
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p as keyof typeof histories)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="chart">
            <div className="chart-labels mono small" aria-hidden="true">
              <span>{money(max)}</span>
              <span>{money((min + max) / 2)}</span>
              <span>{money(min)}</span>
            </div>
            <svg
              viewBox="0 0 640 170"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Synthetic ${period} history, from ${money(values[0])} to ${money(sampleTotal)}. Not historical market data.`}
            >
              <defs>
                <pattern
                  id="chart-dots"
                  width="16"
                  height="16"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="1"
                    cy="1"
                    r="0.65"
                    fill="currentColor"
                    opacity="0.17"
                  />
                </pattern>
              </defs>
              <rect width="640" height="170" fill="url(#chart-dots)" />
              <path
                d={`M0,170 L${points.replaceAll(" ", " L")} L640,170 Z`}
                fill="var(--chart-fill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx="636" cy={lastY} r="4" fill="var(--accent)" />
            </svg>
          </div>
          <div className="chart-axis small mono">
            <span>Period start</span>
            <span>Illustrative history</span>
            <span>Period end</span>
          </div>
          <div className="allocation">
            <div className="section-head">
              <h3>Allocation</h3>
              <span className="small muted">5 sample assets</span>
            </div>
            <div
              className="allocation-bar"
              role="img"
              aria-label="Crypto 64.8%, tokenized stocks 24.9%, NFT 10.4%"
            >
              <span style={{ width: "64.77%" }} />
              <span style={{ width: "24.87%" }} />
              <span style={{ width: "10.36%" }} />
            </div>
            <div className="allocation-legend">
              <span>
                <i className="legend-dot crypto" />
                Crypto <b className="mono">64.8%</b>
              </span>
              <span>
                <i className="legend-dot stocks" />
                Tokenized stocks <b className="mono">24.9%</b>
              </span>
              <span>
                <i className="legend-dot nft" />
                NFT <b className="mono">10.4%</b>
              </span>
            </div>
          </div>
          <div className="assets-head">
            <h3>Assets</h3>
            <label className="filter-label">
              <span className="sr-only">Filter sample assets</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["All assets", "Crypto", "Tokenized stock", "NFT"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="asset-column-labels small muted" aria-hidden="true">
            <span>Asset / exposure</span>
            <span>Value / gain or loss</span>
          </div>
          <div className="asset-list">
            {sampleAssets
              .filter((a) => filter === "All assets" || a.kind === filter)
              .map((a) => (
                <details className="asset" key={a.id}>
                  <summary>
                    <span
                      className={`asset-symbol ${a.color}`}
                      aria-hidden="true"
                    >
                      {a.id === "btc"
                        ? "₿"
                        : a.id === "eth"
                          ? "Ξ"
                          : a.id === "art"
                            ? "◈"
                            : a.name.slice(0, 1)}
                    </span>
                    <span className="asset-name">
                      <strong>{a.name}</strong>
                      <span className="small muted">{a.kind}</span>
                    </span>
                    <span className="asset-value">
                      <span className="mono">{money(a.value)}</span>
                      <span
                        className={`small mono ${a.change < 0 ? "negative" : "positive"}`}
                      >
                        {a.change < 0 ? "" : "+"}
                        {a.change.toFixed(2)}%
                      </span>
                    </span>
                    <Icon name="chevron" size={16} />
                  </summary>
                  <div className="asset-expanded">
                    <dl className="facts">
                      <div>
                        <dt>Sample quantity</dt>
                        <dd>
                          {a.quantity} {a.ticker}
                        </dd>
                      </div>
                      <div>
                        <dt>Sample cost</dt>
                        <dd>{money(a.cost)}</dd>
                      </div>
                      <div>
                        <dt>Unrealized gain / loss</dt>
                        <dd>
                          {a.value - a.cost < 0 ? "−" : "+"}
                          {money(Math.abs(a.value - a.cost))}
                        </dd>
                      </div>
                      <div>
                        <dt>Portfolio share</dt>
                        <dd>{((a.value / sampleTotal) * 100).toFixed(1)}%</dd>
                      </div>
                    </dl>
                    <p className="small">
                      <strong>{a.risk}.</strong> {a.note}
                    </p>
                  </div>
                </details>
              ))}
          </div>
        </>
      )}
      {currentView === "Scenarios" && (
        <div className="view-content">
          <h3>What if the market moved?</h3>
          <p className="muted">
            Change one sample asset class. All other prices stay fixed.
          </p>
          <label htmlFor="scenario-category">Asset class</label>
          <select
            id="scenario-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Crypto", "Tokenized stock", "NFT"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <label htmlFor="scenario-change">
            Hypothetical price change{" "}
            <strong className="mono">
              {scenario > 0 ? "+" : ""}
              {scenario}%
            </strong>
          </label>
          <input
            id="scenario-change"
            type="range"
            min="-80"
            max="80"
            step="5"
            value={scenario}
            onChange={(e) => setScenario(Number(e.target.value))}
          />
          <div className="scenario-presets">
            {[-30, -20, 10, 25].map((n) => (
              <button
                key={n}
                className="button small-button"
                aria-pressed={scenario === n}
                onClick={() => setScenario(n)}
              >
                {n > 0 ? "+" : ""}
                {n}%
              </button>
            ))}
          </div>
          <dl className="facts scenario-result">
            <div>
              <dt>Sample starting value</dt>
              <dd>{money(sampleTotal)}</dd>
            </div>
            <div>
              <dt>Hypothetical change</dt>
              <dd className={delta < 0 ? "negative" : "positive"}>
                {delta < 0 ? "−" : "+"}
                {money(Math.abs(delta))}
              </dd>
            </div>
            <div>
              <dt>Resulting sample value</dt>
              <dd className="mono">{money(sampleTotal + delta)}</dd>
            </div>
          </dl>
          <p className="small muted">
            A simple sensitivity illustration. No prediction, probability, fees,
            correlations or liquidity effects are included.
          </p>
        </div>
      )}
      {currentView === "Activity" && (
        <div className="view-content">
          <h3>Sample activity</h3>
          <p className="muted">
            Fictional entries used to demonstrate the history view.
          </p>
          <ul className="activity-list">
            {[
              {
                date: "Jun 18",
                name: "Added Ethereum",
                detail: "Illustrative purchase · 0.6 ETH",
                value: "$1,550",
              },
              {
                date: "Jun 12",
                name: "Added Apple exposure",
                detail: "Illustrative purchase · 24 AAPLx",
                value: "$5,050",
              },
              {
                date: "Jun 05",
                name: "Added Chromatic #042",
                detail: "Illustrative NFT purchase · 1 item",
                value: "$4,300",
              },
              {
                date: "Jun 01",
                name: "Portfolio snapshot",
                detail: "Opening synthetic portfolio value",
                value: "$44,350",
              },
            ].map((e) => (
              <li key={e.date}>
                <span className="mono small muted">{e.date}</span>
                <span>
                  <strong>{e.name}</strong>
                  <span className="small muted">{e.detail}</span>
                </span>
                <span className="mono">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {currentView === "Tax" && (
        <div className="view-content">
          <h3>A tax illustration</h3>
          <p className="muted">
            An optional arithmetic example, using a hypothetical 20% rate.
          </p>
          <dl className="facts">
            <div>
              <dt>Sample unrealized gain</dt>
              <dd>{money(sampleTotal - sampleCost)}</dd>
            </div>
            <div>
              <dt>Hypothetical rate</dt>
              <dd>20%</dd>
            </div>
            <div>
              <dt>Illustrative amount</dt>
              <dd>{money((sampleTotal - sampleCost) * 0.2)}</dd>
            </div>
          </dl>
          <p className="small muted">
            This is not tax owed, a tax return or tax advice. There are no real
            transactions, jurisdiction rules, realized-gain calculations or loss
            offsets in this example.
          </p>
        </div>
      )}
      <div className="analysis-bottom">
        <span className="small muted">All figures are synthetic.</span>
        <button className="button small-button" onClick={download}>
          {downloaded ? "Download sample again" : "Download sample"}
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );
}
export function RiskNotes() {
  return (
    <section className="risk-section" aria-labelledby="risk-title">
      <div className="section-head">
        <h2 id="risk-title">Risks & context</h2>
        <span className="small muted">Illustrative notes</span>
      </div>
      <div className="risk-grid">
        <article>
          <span className="risk-number mono">01</span>
          <h3>Concentrated in crypto</h3>
          <p>
            64.8% of the sample sits in crypto. A shared market shock can affect
            both positions.
          </p>
          <span className="small">Portfolio risk</span>
        </article>
        <article>
          <span className="risk-number mono">02</span>
          <h3>Token, stock, issuer</h3>
          <p>
            Tokenized exposure adds issuer and custody dependencies to the
            underlying stock risk.
          </p>
          <span className="small">Asset structure</span>
        </article>
        <article>
          <span className="risk-number mono">03</span>
          <h3>News changes the picture</h3>
          <p>
            A fictional earnings surprise illustrates how company news could
            move the sample stock positions.
          </p>
          <span className="small">Synthetic news scenario</span>
        </article>
      </div>
    </section>
  );
}
