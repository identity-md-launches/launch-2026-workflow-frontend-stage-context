// Deliberately synthetic, fixed illustrative data. Never a wallet import or live price feed.
export const sampleAssets = [
  {
    id: "btc",
    name: "Bitcoin",
    ticker: "BTC",
    kind: "Crypto",
    value: 18000,
    cost: 16500,
    quantity: "0.24",
    color: "gold",
    change: 9.09,
    risk: "High volatility",
    note: "The largest position is 37.3% of this sample. A price shock would have a material effect on the total.",
  },
  {
    id: "eth",
    name: "Ethereum",
    ticker: "ETH",
    kind: "Crypto",
    value: 13250,
    cost: 11900,
    quantity: "4.6",
    color: "green",
    change: 11.34,
    risk: "Correlated exposure",
    note: "This sample combines two crypto positions that can move in the same direction during a market shock.",
  },
  {
    id: "nvda",
    name: "Nvidia",
    ticker: "NVDAx",
    kind: "Tokenized stock",
    value: 7200,
    cost: 6600,
    quantity: "60",
    color: "sage",
    change: 9.09,
    risk: "Issuer and custody",
    note: "A tokenized stock can carry issuer, redemption and custody risk in addition to the underlying share price risk.",
  },
  {
    id: "aapl",
    name: "Apple",
    ticker: "AAPLx",
    kind: "Tokenized stock",
    value: 4800,
    cost: 5050,
    quantity: "24",
    color: "clay",
    change: -4.95,
    risk: "Trading-hour mismatch",
    note: "A token may trade while the underlying stock market is closed. Liquidity and pricing can diverge.",
  },
  {
    id: "art",
    name: "Chromatic #042",
    ticker: "Art NFT",
    kind: "NFT",
    value: 5000,
    cost: 4300,
    quantity: "1",
    color: "ink",
    change: 16.28,
    risk: "Illiquid estimate",
    note: "This illustrative NFT value is an estimate, not a sale offer. A thin market may produce a very different sale price.",
  },
];
export const sampleTotal = sampleAssets.reduce((a, b) => a + b.value, 0);
export const sampleCost = sampleAssets.reduce((a, b) => a + b.cost, 0);
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const histories = {
  "1 month": [
    44350, 45100, 44800, 45250, 46000, 45500, 45900, 45200, 46100, 45800, 46600,
    46350, 47100, 46750, 46900, 47900, 47500, 48250,
  ],
  "3 months": [
    40500, 41250, 42000, 40900, 43000, 42100, 43500, 42800, 44100, 43200, 44000,
    45600, 44800, 46000, 45100, 46800, 47500, 48250,
  ],
  "1 year": [
    35000, 36100, 34200, 37200, 38800, 36900, 39200, 41000, 39500, 42400, 41600,
    43750, 42200, 45600, 44000, 46800, 45900, 48250,
  ],
};
