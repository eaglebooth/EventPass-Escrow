import { createHash } from "node:crypto";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const accountFrom = (name) => {
  const value = required(name);
  return createAccount(value.startsWith("0x") ? value : `0x${value}`);
};

const contractAddress = required("CONTRACT_ADDRESS");
const seller = accountFrom("SELLER_PRIVATE_KEY");
const buyer = accountFrom("BUYER_PRIVATE_KEY");
const sellerClient = createClient({ chain: studionet, account: seller });
const buyerClient = createClient({ chain: studionet, account: buyer });
const reader = createClient({ chain: studionet });

const policyUrl = "https://arweave.net/3_jpbUEOqAhgRkfkj5nzydbe2nNjW-fZAhS1_-ERDBo";
const ticketUrl = "https://arweave.net/eZRQIsEILZlWbI6ZupUiuNUSkucpzjj9m2hTOGrJGzE";

const sha256 = (value) => `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
const parseRead = (value) => typeof value === "string" ? JSON.parse(value) : value;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = async (functionName, args = []) => parseRead(
  await reader.readContract({ address: contractAddress, functionName, args }),
);

const fetchEvidence = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Evidence fetch failed (${response.status}): ${url}`);
  const text = await response.text();
  if (!text) throw new Error(`Evidence source is empty: ${url}`);
  return { digest: sha256(text), text };
};

const waitFor = async (label, predicate) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const value = await predicate();
    if (value) return value;
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const write = async (client, functionName, args = [], value = 0n) => {
  const hash = await client.writeContract({
    address: contractAddress,
    functionName,
    args,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 2000,
    retries: 240,
    fullTransaction: false,
  });
  process.stdout.write(`${functionName}: ${hash} (${receipt.statusName || "ACCEPTED"})\n`);
  return hash;
};

const futureIso = (seconds) => new Date(Date.now() + seconds * 1000)
  .toISOString()
  .replace(/\.\d{3}Z$/, "Z");

const main = async () => {
  if (seller.address.toLowerCase() === buyer.address.toLowerCase()) {
    throw new Error("Seller and buyer must be different wallets");
  }

  // Fetch and hash before any on-chain write so unavailable evidence cannot strand funds.
  const [policy, ticket] = await Promise.all([
    fetchEvidence(policyUrl),
    fetchEvidence(ticketUrl),
  ]);
  const before = await read("get_summary");
  const listingId = BigInt(before.listing_count);
  const price = 1n;
  const bond = 1n;
  const terms = JSON.stringify({
    price_wei: price.toString(),
    funding_deadline: futureIso(60),
    delivery_deadline: futureIso(120),
    event_time: futureIso(180),
    challenge_deadline: futureIso(240),
    response_deadline: futureIso(300),
    recovery_deadline: futureIso(360),
  });
  const commitment = sha256(`eventpass:${Date.now()}:${seller.address}:${buyer.address}`);

  process.stdout.write(`Contract ${contractAddress}\nSeller ${seller.address}\nBuyer ${buyer.address}\nListing ${listingId}\n`);

  await write(sellerClient, "create_listing", [
    "EventPass contradictory-evidence lifecycle test",
    "TEST-ROW-A-SEAT-1",
    policyUrl,
    policy.digest,
    terms,
    bond,
  ], bond);
  await waitFor("LISTED", async () => (await read("get_listing", [listingId])).status === "LISTED");

  await write(buyerClient, "fund_listing", [listingId], price);
  await waitFor("FUNDED", async () => (await read("get_listing", [listingId])).status === "FUNDED");

  await write(sellerClient, "attach_ticket", [listingId, ticketUrl, ticket.digest, commitment]);
  await waitFor("TICKET_ATTACHED", async () => (await read("get_listing", [listingId])).status === "TICKET_ATTACHED");

  await write(buyerClient, "verify_ticket", [listingId]);
  const reviewed = await waitFor("ticket jury outcome", async () => {
    const current = await read("get_listing", [listingId]);
    return ["REJECTED", "EVIDENCE_UNAVAILABLE", "VERIFIED"].includes(current.status)
      ? current
      : undefined;
  });
  process.stdout.write(`Jury status: ${reviewed.status}; verdict: ${reviewed.ticket_verdict}\n`);

  if (reviewed.status === "VERIFIED") {
    const challengeAt = Date.parse(reviewed.challenge_deadline);
    const waitMs = Math.max(0, challengeAt - Date.now() + 2000);
    process.stdout.write(`Waiting ${Math.ceil(waitMs / 1000)}s for the buyer challenge window to close.\n`);
    await sleep(waitMs);
  }

  await write(buyerClient, "settle", [listingId]);
  const terminal = await waitFor("terminal settlement", async () => {
    const current = await read("get_listing", [listingId]);
    return ["SELLER_PAID", "BUYER_REFUNDED", "NEUTRAL_REFUND"].includes(current.status)
      ? current
      : undefined;
  });
  const after = await read("get_summary");
  if (BigInt(after.active_escrow) !== BigInt(before.active_escrow)) {
    throw new Error("Escrow remained locked after settlement");
  }
  if (BigInt(after.transferred) - BigInt(before.transferred) !== price + bond) {
    throw new Error("Transferred value does not conserve the funded price and seller bond");
  }

  process.stdout.write(`${JSON.stringify({ terminal, before, after }, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
