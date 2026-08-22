import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CalldataEncodable, Hash } from "genlayer-js/types";

const STORAGE_KEY = "eventpass.contract.v2";
const RPC_URL = studionet.rpcUrls.default.http[0];
export const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com/address";

const readAccount = createAccount();

export function getContractAddress() {
  if (typeof window === "undefined") return DEFAULT_CONTRACT;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_CONTRACT;
}

export function saveContractAddress(address: string) {
  localStorage.setItem(STORAGE_KEY, address);
}

export function restoreContractAddress() {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_CONTRACT;
}

export function shortAddress(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "Not configured";
}

export function formatGen(value: string | number | bigint) {
  const amount = BigInt(value || 0);
  const whole = amount / 1_000_000_000_000_000_000n;
  const fraction = (amount % 1_000_000_000_000_000_000n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function parseGen(value: string) {
  const [whole = "0", fraction = ""] = value.trim().split(".");
  return BigInt(whole || 0) * 1_000_000_000_000_000_000n + BigInt((fraction + "0".repeat(18)).slice(0, 18));
}

export function normalizeDigest(value: string) {
  const raw = value.trim().toLowerCase().replace(/^sha256:/, "");
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error("Digest must be exactly 64 hexadecimal characters (sha256:<digest> is accepted).");
  }
  return `sha256:${raw}`;
}

function readClient() {
  return createClient({ chain: studionet, account: readAccount });
}

const STATUS_BY_CODE: Record<number, string> = {
  0: "PENDING",
  1: "PROPOSING",
  2: "COMMITTING",
  3: "REVEALING",
  4: "ACCEPTED",
  5: "ACCEPTED",
  6: "FINALIZED",
  7: "UNDETERMINED",
  8: "CANCELED",
  9: "LEADER_TIMEOUT",
  10: "VALIDATORS_TIMEOUT",
  11: "APPEAL",
  12: "BLOCKED",
  13: "EXECUTING",
};

function transactionHash(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.txId ?? record.hash ?? record.transactionHash;
    if (typeof candidate === "string") return candidate;
  }
  throw new Error("The wallet returned an invalid transaction identifier.");
}

const CONTRACT_ERRORS = new Set([
  "INVALID_TERMS", "INVALID_LISTING", "LISTING_NOT_AVAILABLE", "FUNDING_NOT_ALLOWED", "WRONG_VALUE",
  "TICKET_NOT_EXPECTED", "SELLER_ONLY", "DELIVERY_WINDOW_CLOSED", "INVALID_TICKET_EVIDENCE", "TICKET_ALREADY_LISTED",
  "TICKET_NOT_READY", "VERIFICATION_WINDOW_CLOSED", "CHALLENGE_NOT_AVAILABLE", "BUYER_ONLY",
  "CHALLENGE_WINDOW_CLOSED", "INVALID_CHALLENGE_EVIDENCE", "EVIDENCE_ALREADY_USED", "RESPONSE_NOT_EXPECTED",
  "RESPONSE_WINDOW_CLOSED", "INVALID_RESPONSE_EVIDENCE", "CHALLENGE_NOT_READY", "ADJUDICATION_WINDOW_CLOSED",
  "SELLER_RESPONSE_WINDOW_OPEN", "PARTY_ONLY", "SETTLEMENT_NOT_READY", "INVALID_RULING",
  "LISTING_NOT_FOUND", "RECOVERY_NOT_AVAILABLE", "ESCROW_INVARIANT_BROKEN",
]);

function findContractError(value: unknown): string | undefined {
  if (typeof value === "string") {
    const match = value.match(/[A-Z][A-Z0-9_]+/g)?.find((item) => CONTRACT_ERRORS.has(item));
    return match;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findContractError(item);
      if (match) return match;
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const match = findContractError(item);
      if (match) return match;
    }
  }
  return undefined;
}

export async function readContract<T>(functionName: string, args: CalldataEncodable[] = [], address = getContractAddress()) {
  if (!address) throw new Error("Set a deployed EventPass contract address first.");
  return (await readClient().readContract({ address: address as `0x${string}`, functionName, args })) as T;
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("Install or enable a browser wallet.");
  const chainId = `0x${studionet.id.toString(16)}`;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: "GenLayer Studionet",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
      }],
    });
  }
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  return accounts[0];
}

export async function writeContract(functionName: string, args: CalldataEncodable[] = [], value = 0n, address = getContractAddress()) {
  if (!address) throw new Error("Set a deployed EventPass contract address first.");
  const account = await connectWallet();
  if (!window.ethereum) throw new Error("Wallet provider is unavailable.");
  const client = createClient({ chain: studionet, provider: window.ethereum, account: account as `0x${string}` });
  const result = await client.writeContract({ address: address as `0x${string}`, functionName, args, value });
  const hash = transactionHash(result);
  await waitForAccepted(hash, client);
  return hash;
}

async function waitForAccepted(hash: string, client: ReturnType<typeof createClient>) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getTransactionStatus", params: [hash] }),
    });
    const payload = await response.json();
    if (payload?.error) {
      const message = String(payload.error.message ?? payload.error);
      if (/not found/i.test(message) && attempt < 12) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      throw new Error(message);
    }
    const rawStatus = payload?.result?.status ?? payload?.result;
    const status = typeof rawStatus === "number"
      ? STATUS_BY_CODE[rawStatus] ?? String(rawStatus)
      : String(rawStatus ?? "").toUpperCase();
    if (status.includes("ACCEPTED") || status.includes("FINALIZED")) {
      const transaction = await client.getTransaction({ hash: hash as Hash });
      const execution = String(transaction?.txExecutionResultName ?? "");
      if (execution === "FINISHED_WITH_ERROR") {
        throw new Error("Contract execution failed. Open the transaction in Explorer for the validator error.");
      }
      const contractError = findContractError(transaction?.consensus_data?.leader_receipt ?? transaction);
      if (contractError) throw new Error(`Contract rejected action: ${contractError}`);
      return hash;
    }
    if (["CANCELED", "UNDETERMINED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT", "BLOCKED"].some((item) => status.includes(item))) {
      throw new Error(`Transaction ended with ${status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Transaction is still pending. Check it in Explorer before retrying.");
}

declare global {
  interface Window {
    ethereum?: {
      request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
