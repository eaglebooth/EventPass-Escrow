import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const address = required("CONTRACT_ADDRESS");
const key = required("PRIVATE_KEY");
const listingId = BigInt(process.env.LISTING_ID ?? "0");
const account = createAccount(key.startsWith("0x") ? key : `0x${key}`);
const client = createClient({ chain: studionet, account });
const reader = createClient({ chain: studionet });
const parse = (value) => typeof value === "string" ? JSON.parse(value) : value;
const read = async (name, args = []) => parse(await reader.readContract({ address, functionName: name, args }));

const beforeListing = await read("get_listing", [listingId]);
const beforeSummary = await read("get_summary");
const hash = await client.writeContract({ address, functionName: "settle", args: [listingId] });
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  interval: 2000,
  retries: 240,
  fullTransaction: false,
});
const afterListing = await read("get_listing", [listingId]);
const afterSummary = await read("get_summary");
const terminal = ["SELLER_PAID", "BUYER_REFUNDED", "NEUTRAL_REFUND", "SPLIT_SETTLED"].includes(afterListing.status);
const escrowReduced = BigInt(afterSummary.active_escrow) < BigInt(beforeSummary.active_escrow);
const transferredIncreased = BigInt(afterSummary.transferred) > BigInt(beforeSummary.transferred);

process.stdout.write(JSON.stringify({
  address,
  listingId: listingId.toString(),
  caller: account.address,
  hash: typeof hash === "string" ? hash : hash?.txId,
  receipt: receipt.statusName ?? "ACCEPTED",
  beforeStatus: beforeListing.status,
  afterStatus: afterListing.status,
  beforeSummary,
  afterSummary,
  verified: terminal && escrowReduced && transferredIncreased,
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));

if (!terminal || !escrowReduced || !transferredIncreased) {
  throw new Error("Settlement transaction did not produce the required terminal economic state.");
}
