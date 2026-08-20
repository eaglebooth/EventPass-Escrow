export type Listing = {
  id: string | number;
  event: string;
  seat: string;
  seller: string;
  buyer: string;
  price: string;
  funded_amount: string;
  bond: string;
  status: string;
  ticket_verdict: string;
  challenge_verdict: string;
  reason: string;
  event_time: string;
  challenge_deadline: string;
  recovery_deadline: string;
};

export type Summary = {
  listing_count: string;
  active_escrow: string;
  received: string;
  seller_paid: string;
  buyer_refunded: string;
  transferred: string;
};

export const EMPTY_SUMMARY: Summary = {
  listing_count: "0",
  active_escrow: "0",
  received: "0",
  seller_paid: "0",
  buyer_refunded: "0",
  transferred: "0",
};
