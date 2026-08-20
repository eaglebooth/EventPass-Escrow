import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { Listing } from "../lib/types";
import { formatGen } from "../lib/genlayer";

export function TicketCard({ listing }: { listing: Listing }) {
  return (
    <article className="ticket-card">
      <div className="ticket-body">
        <div className="ticket-top"><span>{listing.status.replaceAll("_", " ")}</span><span>#{listing.id.toString().padStart(3, "0")}</span></div>
        <div className="ticket-main">
          <CalendarDays size={22} />
          <h3>{listing.event}</h3>
          <p>{listing.seat || "General admission"}</p>
          <strong>{formatGen(listing.price)} GEN</strong>
        </div>
      </div>
      <div className="ticket-stub"><span>{listing.event_time.slice(0, 16).replace("T", " · ")}</span><Link href={`/passes/${listing.id}`} aria-label={`Open ${listing.event}`}><ArrowUpRight size={20} /></Link></div>
    </article>
  );
}
