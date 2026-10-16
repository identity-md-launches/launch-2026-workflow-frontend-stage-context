import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { loadRuntime, makeWalletConfig } from "./config";
import App from "./App";
import "./styles.css";
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <main className="boot">
    <h1>FOLIR</h1>
    <p role="status">Loading the verified payment configuration…</p>
  </main>,
);
loadRuntime()
  .then((runtime) => {
    root.render(
      <React.StrictMode>
        <WagmiProvider config={makeWalletConfig(runtime)}>
          <QueryClientProvider
            client={
              new QueryClient({
                defaultOptions: {
                  queries: { retry: 1, refetchOnWindowFocus: false },
                },
              })
            }
          >
            <App runtime={runtime} />
          </QueryClientProvider>
        </WagmiProvider>
      </React.StrictMode>,
    );
  })
  .catch((error) =>
    root.render(
      <main className="boot">
        <h1>FOLIR</h1>
        <p role="alert">{error.message}</p>
        <button onClick={() => location.reload()}>Reload configuration</button>
      </main>,
    ),
  );
