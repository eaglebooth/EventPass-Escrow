"use client";

import { AlertTriangle, Check, Gavel, LoaderCircle, LockKeyhole, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import type { CalldataEncodable } from "genlayer-js/types";
import { parseGen, writeContract } from "../lib/genlayer";
import type { Listing } from "../lib/types";

type Evidence = { url: string; digest: string; commitment: string };

const EMPTY_EVIDENCE: Evidence = { url: "", digest: "", commitment: "" };

export function ActionDesk({ listing, onComplete }: { listing: Listing; onComplete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [evidence, setEvidence] = useState<Evidence>(EMPTY_EVIDENCE);
  const id = BigInt(listing.id);

  async function run(functionName: string, args: CalldataEncodable[] = [id], value = 0n) {
    setBusy(true);
    setMessage("");
    try {
      const hash = await writeContract(functionName, args, value);
      setMessage(`Accepted on Studionet · ${hash.slice(0, 10)}…${hash.slice(-6)}`);
      await onComplete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Contract action failed.");
    } finally {
      setBusy(false);
    }
  }

  const evidenceFields = (includeCommitment: boolean) => (
    <div className="desk-fields">
      <label>Public evidence URL<input value={evidence.url} onChange={(event) => setEvidence({ ...evidence, url: event.target.value })} placeholder="https://arweave.net/..." /></label>
      <label>SHA-256 digest<input value={evidence.digest} onChange={(event) => setEvidence({ ...evidence, digest: event.target.value })} placeholder="64 lowercase hexadecimal characters" /></label>
      {includeCommitment && <label className="wide-field">Private ticket commitment<input value={evidence.commitment} onChange={(event) => setEvidence({ ...evidence, commitment: event.target.value })} placeholder="Commitment or encrypted handoff reference" /></label>}
    </div>
  );

  let content: React.ReactNode;
  if (listing.status === "LISTED") {
    content = <><p>The buyer funds the exact asking price. Funds stay in contract custody until a terminal outcome.</p><label className="solo-field">Payment amount (GEN)<input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.10" /></label><button className="primary-action" disabled={busy || !amount} onClick={() => run("fund_listing", [id], parseGen(amount))}><LockKeyhole size={18} /> Fund protected purchase</button></>;
  } else if (listing.status === "FUNDED") {
    content = <><p>The seller attaches a public evidence packet and a private ticket commitment. The URL cannot be replaced later.</p>{evidenceFields(true)}<button className="primary-action" disabled={busy || !evidence.url || !evidence.digest || !evidence.commitment} onClick={() => run("attach_ticket", [id, evidence.url, evidence.digest, evidence.commitment])}><Upload size={18} /> Lock ticket evidence</button></>;
  } else if (listing.status === "TICKET_ATTACHED") {
    content = <><p>GenLayer validators fetch the locked source and compare its meaning against the event policy.</p><button className="primary-action" disabled={busy} onClick={() => run("verify_ticket")}><Gavel size={18} /> Run ticket jury</button></>;
  } else if (listing.status === "VERIFIED") {
    content = <><p>If check-in failed, the buyer can lock a separate failure packet before the challenge deadline.</p>{evidenceFields(false)}<button className="primary-action" disabled={busy || !evidence.url || !evidence.digest} onClick={() => run("challenge_checkin", [id, evidence.url, evidence.digest])}><AlertTriangle size={18} /> Open check-in challenge</button><button className="secondary-action" disabled={busy} onClick={() => run("settle")}><Check size={18} /> Settle after challenge window</button></>;
  } else if (listing.status === "CHALLENGED") {
    content = <><p>The seller may attach a response packet. After the response deadline the jury can proceed without it.</p>{evidenceFields(false)}<button className="primary-action" disabled={busy || !evidence.url || !evidence.digest} onClick={() => run("attach_seller_response", [id, evidence.url, evidence.digest])}><Upload size={18} /> Attach seller response</button><button className="secondary-action" disabled={busy} onClick={() => run("adjudicate_challenge")}><Gavel size={18} /> Adjudicate after deadline</button></>;
  } else if (listing.status === "RESPONSE_ATTACHED") {
    content = <><p>Both immutable evidence packets are present. The GenLayer jury now decides the economically binding outcome.</p><button className="primary-action" disabled={busy} onClick={() => run("adjudicate_challenge")}><Gavel size={18} /> Run challenge jury</button></>;
  } else if (["REJECTED", "EVIDENCE_UNAVAILABLE", "CHALLENGE_UNAVAILABLE", "RULING_READY"].includes(listing.status)) {
    content = <><p>The ruling is ready for a guarded transfer. Contract accounting prevents duplicate settlement.</p><button className="primary-action" disabled={busy} onClick={() => run("settle")}><Check size={18} /> Execute settlement</button></>;
  } else {
    content = <div className="terminal-note"><Check size={20} /><span>This pass has reached a terminal state. No further money-moving action is available.</span></div>;
  }

  return <section className="action-desk"><div className="desk-heading"><span>Next permitted action</span><b>{listing.status.replaceAll("_", " ")}</b></div>{content}{!listing.status.endsWith("PAID") && !["REFUNDED", "SETTLED"].includes(listing.status) && <button className="text-action" disabled={busy} onClick={() => run("recover_expired")}><RefreshCw size={15} /> Recover expired escrow</button>}{busy && <div className="busy-line"><LoaderCircle size={17} className="spin" /> Waiting for ACCEPTED consensus…</div>}{message && <div className={message.startsWith("Accepted") ? "success-message" : "error-message"}>{message}</div>}</section>;
}
