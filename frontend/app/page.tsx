"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  FileCheck2,
  ShieldCheck,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ContractStrip } from "../components/ContractStrip";
import { Reveal } from "../components/Reveal";
import { SiteHeader } from "../components/SiteHeader";
import { TicketCard } from "../components/TicketCard";
import { readContract } from "../lib/genlayer";
import { EMPTY_SUMMARY, type Listing, type Summary } from "../lib/types";

function normalizeListing(value: Listing): Listing { return { ...value, id: String(value.id) }; }

export default function HomePage() {
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [listings, setListings] = useState<Listing[]>([]);
  const loadBoard = useCallback(async (nextSummary?: Summary) => {
    try {
      const liveSummary = nextSummary ?? await readContract<Summary>("get_summary");
      setSummary(liveSummary);
      const count = Number(liveSummary.listing_count);
      const rows = await Promise.all(Array.from({ length: count }, (_, id) => readContract<Listing>("get_listing", [BigInt(id)])));
      setListings(rows.map(normalizeListing));
    } catch { setListings([]); }
  }, []);
  useEffect(() => { void loadBoard(); }, [loadBoard]);

  return <main>
    <SiteHeader />
    <ContractStrip onSync={(value) => void loadBoard(value)} />
    <section className="hero-band eventpass-hero-shell">
      <div className="hero-copy">
        <div className="audience-toggle">
          <span>For buyers</span>
          <i />
          <span>For sellers</span>
        </div>
        <span className="eyebrow"><BadgeCheck size={16} /> GenLayer verified resale escrow</span>
        <h1>Verified ticket resale without blind trust.</h1>
        <p>EventPass Escrow keeps the ticket packet, buyer funds, and challenge window inside one Intelligent Contract. A semantic jury only releases payment when the evidence matches the public event rules.</p>
        <div className="hero-actions">
          <Link className="hero-primary" href="/passes/new">Open protected sale <ArrowRight size={18} /></Link>
          <a className="hero-link" href="#board">View live board <ArrowRight size={16} /></a>
        </div>
        <div className="hero-proof">
          <span><WalletCards size={17} /> Buyer funds held</span>
          <span><TicketCheck size={17} /> Ticket packet locked</span>
          <span><Clock3 size={17} /> Challenge window</span>
        </div>
      </div>
      <div className="hero-visual eventpass-photo-card">
        <Image src="/eventpass-hero.png" alt="A concert attendee holding a verified digital event pass" fill priority sizes="(max-width: 1100px) 50vw, 620px" />
        <div className="visual-caption hero-glass-card">
          <span className="glass-kicker">Live escrow</span>
          <b>{summary.active_escrow}</b>
          <span>wei protected across active transfers</span>
          <div className="mini-line-chart" aria-hidden="true">
            <i style={{ height: "28%" }} />
            <i style={{ height: "44%" }} />
            <i style={{ height: "58%" }} />
            <i style={{ height: "72%" }} />
            <i style={{ height: "90%" }} />
          </div>
        </div>
      </div>
    </section>

    <section className="trust-strip" aria-label="Protocol metrics">
      <div><b>{summary.listing_count}</b><span>listed passes</span></div>
      <div><b>{summary.active_escrow}</b><span>wei in custody</span></div>
      <div><b>{summary.seller_paid}</b><span>wei released</span></div>
      <div><b>{summary.buyer_refunded}</b><span>wei recovered</span></div>
    </section>

    <Reveal><section className="checks-band">
      <div className="section-intro">
        <span className="eyebrow">What the contract checks</span>
        <h2>Resale rules are visible before funds move.</h2>
        <p>The app keeps the workflow simple for judges: one primary action at a time, live contract reads, and Explorer access for every transaction trail.</p>
      </div>
      <div className="checks-grid">
        <article><FileCheck2 size={24} /><h3>Ticket packet</h3><p>Seller locks issuer page, ticket digest, event metadata, and transfer terms before buyer payment is accepted.</p></article>
        <article><BarChart3 size={24} /><h3>Semantic jury</h3><p>Validators judge the meaning of authenticity and check-in evidence, not fragile JSON wording.</p></article>
        <article><ShieldCheck size={24} /><h3>Bounded recovery</h3><p>Every abandoned or unavailable state has an explicit refund path so value cannot stay trapped forever.</p></article>
      </div>
    </section></Reveal>

    <Reveal><section className="market-board" id="board">
      <div className="section-intro"><span className="eyebrow">Live transfer board</span><h2>Protected passes with visible rules.</h2><p>Every item below is read from the selected Intelligent Contract. Open one to see its exact custody and jury state.</p></div>
      <div className="ticket-grid">{listings.length ? listings.map((listing) => <TicketCard key={String(listing.id)} listing={listing} />) : <div className="empty-board"><TicketCheck size={30} /><b>No protected passes yet.</b><span>Open the first listing and fund it from a second wallet.</span><Link href="/passes/new">Create first pass <ArrowRight size={16} /></Link></div>}</div>
    </section></Reveal>

    <Reveal><section className="protocol-band" id="protocol">
      <div className="protocol-title"><span className="eyebrow">One contract · one bounded lifecycle</span><h2>A transfer protocol people can inspect.</h2><p>Each step is intentionally narrow, with its state and next action visible on-chain.</p></div>
      <div className="protocol-list">
        <article><b>01</b><div><h3>List and fund</h3><p>Seller bond and buyer price enter payable custody under sender-bound roles.</p></div></article>
        <article><b>02</b><div><h3>Lock evidence</h3><p>Policy, ticket, check-in failure, and seller response each carry an immutable digest.</p></div></article>
        <article><b>03</b><div><h3>Reach meaning</h3><p>Validators compare substantive authenticity and challenge outcomes, not byte-identical prose.</p></div></article>
        <article><b>04</b><div><h3>Settle or recover</h3><p>Explicit deadlines prevent abandoned or unavailable evidence from trapping either party.</p></div></article>
      </div>
    </section></Reveal>

    <Reveal><section className="recovery-band">
      <div><span className="eyebrow">Failure is a designed state</span><h2>No ticket transfer can wait forever.</h2></div>
      <p>If delivery, evidence, or validator consensus becomes unavailable, the contract follows role-balanced refund rules. Recovery never invents a verdict and never bypasses value conservation.</p>
      <Link href="/contract">Inspect live contract <ArrowRight size={17} /></Link>
    </section></Reveal>
  </main>;
}
