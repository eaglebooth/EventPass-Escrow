import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const address = "0x3397092ea7948Bf6398F3BeEF36BEacfF2d05FC6";
const client = createClient({ chain: studionet, account: createAccount() });
const safe = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);

for (const [label, options] of [
  ["number", { args: [0] }],
  ["bigint", { args: [0n] }],
  ["string", { args: ["0"] }],
  ["kwargs-number", { kwargs: { listing_id: 0 } }],
  ["kwargs-bigint", { kwargs: { listing_id: 0n } }],
  ["kwargs-string", { kwargs: { listing_id: "0" } }],
]) {
  try {
    const result = await client.readContract({ address, functionName: "get_listing", ...options });
    process.stdout.write(`${label}: OK ${safe(result)}\n`);
  } catch (error) {
    process.stdout.write(`${label}: FAIL ${String(error?.shortMessage || error?.message || error).split("\n")[0]}\n`);
  }
}

const summary = await client.readContract({ address, functionName: "get_summary" });
process.stdout.write(`summary: ${safe(summary)}\n`);
