"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { ActionDesk } from "../../../components/ActionDesk";
import { ContractStrip } from "../../../components/ContractStrip";
import { SiteHeader } from "../../../components/SiteHeader";
import { EXPLORER_BASE, formatGen, getContractAddress, readContract, shortAddress } from "../../../lib/genlayer";
import type { Listing } from "../../../lib/types";

export default function PassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setListing(await readContract<Listing>("get_listing", [BigInt(id)])); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to read this pass."); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  return <main><SiteHeader /><ContractStrip onSync={() => void load()} /><section className="detail-page"><Link className="back-link" href="/"><ArrowLeft size={16} /> Pass board</Link>{error && <div className="error-message">{error}</div>}{listing && <>
    <div className="detail-hero"><div><span className="eyebrow">Pass #{String(listing.id).padStart(3, "0")}</span><h1>{listing.event}</h1><p>{listing.seat} · {listing.event_time.slice(0, 16).replace("T", " at ")}</p></div><div className="status-seal"><ShieldCheck size={27} /><span>{listing.status.replaceAll("_", " ")}</span></div></div>
    <div className="detail-layout"><section className="ledger-panel"><div className="ledger-row"><span>Asking price</span><b>{formatGen(listing.price)} GEN</b></div><div className="ledger-row"><span>Escrow funded</span><b>{formatGen(listing.funded_amount)} GEN</b></div><div className="ledger-row"><span>Seller bond</span><b>{formatGen(listing.bond)} GEN</b></div><div className="ledger-row"><span>Seller</span><b>{shortAddress(listing.seller)}</b></div><div className="ledger-row"><span>Buyer</span><b>{shortAddress(listing.buyer)}</b></div><div className="verdict-block"><span>Ticket jury</span><b>{listing.ticket_verdict || "Not evaluated"}</b><p>{listing.reason || "The jury memo will appear after an evidence review."}</p></div><a className="explorer-link" href={`${EXPLORER_BASE}/${getContractAddress()}`} target="_blank" rel="noreferrer">Open contract activity <ExternalLink size={15} /></a></section><ActionDesk listing={listing} onComplete={load} /></div>
  </>}</section></main>;
}
