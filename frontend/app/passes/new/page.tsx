"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, LoaderCircle, ShieldCheck, Ticket } from "lucide-react";
import { useState } from "react";
import { ContractStrip } from "../../../components/ContractStrip";
import { SiteHeader } from "../../../components/SiteHeader";
import { parseGen, writeContract } from "../../../lib/genlayer";

function iso(value: string) { return value ? new Date(value).toISOString().replace(".000", "") : ""; }

export default function NewPassPage() {
  const [form, setForm] = useState({ event: "", seat: "", policy: "", digest: "", price: "", bond: "", funding: "", delivery: "", eventTime: "", challenge: "", response: "", recovery: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function update(key: keyof typeof form, value: string) { setForm({ ...form, [key]: value }); }
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const terms = JSON.stringify({ price_wei: parseGen(form.price).toString(), funding_deadline: iso(form.funding), delivery_deadline: iso(form.delivery), event_time: iso(form.eventTime), challenge_deadline: iso(form.challenge), response_deadline: iso(form.response), recovery_deadline: iso(form.recovery) });
      const bond = parseGen(form.bond);
      const hash = await writeContract("create_listing", [form.event, form.seat, form.policy, form.digest, terms, bond], bond);
      setMessage(`Listing accepted · ${hash}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create listing."); }
    finally { setBusy(false); }
  }
  return <main><SiteHeader /><ContractStrip /><section className="composer-page">
    <div className="composer-intro"><Link href="/"><ArrowLeft size={16} /> Pass board</Link><span className="eyebrow">Seller action · payable</span><h1>Build the rules before the ticket moves.</h1><p>The visible listing and all deadlines are locked in one transaction. The jury cannot rewrite them later.</p></div>
    <div className="composer-layout">
      <aside className="preview-ticket"><div className="preview-red"><Ticket size={21} /><span>PROTECTED PASS</span></div><div className="preview-body"><small>EVENT</small><h2>{form.event || "Your event title"}</h2><span>{form.seat || "Seat or admission tier"}</span><strong>{form.price || "0.00"} GEN</strong><div className="barcode" /></div><div className="preview-stub"><CalendarClock size={20} /><span>{form.eventTime ? new Date(form.eventTime).toLocaleString() : "Event date"}</span></div></aside>
      <section className="composer-console"><div className="console-heading"><ShieldCheck size={21} /><div><span>Listing specification</span><b>Public terms and custody</b></div></div>
        <div className="form-grid"><label>Event name<input value={form.event} onChange={(e) => update("event", e.target.value)} /></label><label>Seat / tier<input value={form.seat} onChange={(e) => update("seat", e.target.value)} /></label><label>Official policy URL<input value={form.policy} onChange={(e) => update("policy", e.target.value)} placeholder="https://..." /></label><label>Policy SHA-256<input value={form.digest} onChange={(e) => update("digest", e.target.value)} placeholder="64 lowercase hexadecimal characters" /></label><label>Sale price (GEN)<input value={form.price} onChange={(e) => update("price", e.target.value)} /></label><label>Seller bond (GEN)<input value={form.bond} onChange={(e) => update("bond", e.target.value)} /></label></div>
        <div className="deadline-grid"><label>Funding closes<input type="datetime-local" value={form.funding} onChange={(e) => update("funding", e.target.value)} /></label><label>Ticket delivery<input type="datetime-local" value={form.delivery} onChange={(e) => update("delivery", e.target.value)} /></label><label>Event starts<input type="datetime-local" value={form.eventTime} onChange={(e) => update("eventTime", e.target.value)} /></label><label>Challenge closes<input type="datetime-local" value={form.challenge} onChange={(e) => update("challenge", e.target.value)} /></label><label>Seller response<input type="datetime-local" value={form.response} onChange={(e) => update("response", e.target.value)} /></label><label>Recovery opens<input type="datetime-local" value={form.recovery} onChange={(e) => update("recovery", e.target.value)} /></label></div>
        <button className="primary-action" disabled={busy || Object.values(form).some((value) => !value)} onClick={submit}>{busy ? <LoaderCircle className="spin" /> : <Ticket />} Open protected listing</button>{message && <div className={message.startsWith("Listing accepted") ? "success-message" : "error-message"}>{message}</div>}
      </section>
    </div>
  </section></main>;
}
