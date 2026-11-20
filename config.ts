import { http, createConfig } from "wagmi";
import { injected } from "@wagmi/connectors";

export const altcoinchain = {
  id: 2330,
  name: "Altcoinchain",
  nativeCurrency: { name: "ALT", symbol: "ALT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.wattxchange.app"] } },
} as const;

export const config = createConfig({
  chains: [altcoinchain],
  connectors: [injected()],
  transports: {
    [altcoinchain.id]: http("https://rpc.wattxchange.app"),
  },
});   
