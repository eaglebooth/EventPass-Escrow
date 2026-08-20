# EventPass Escrow Design Direction

## Reference language

The supplied references combine a dark editorial hero, calm off-white content bands,
mint calls to action, and physical ticket artifacts. EventPass Escrow borrows that
visual grammar without reproducing any reference layout or copy.

## Product-specific interpretation

- Deep ink-teal (`#10282a`) communicates custody and trust.
- Warm paper (`#f5f2ea`) makes ticket records feel tangible rather than financial.
- Mint (`#87f5df`) marks safe actions and verified state.
- Signal coral (`#f04a39`) is reserved for ticket edges, disputes, and deadlines.
- Ticket stubs use perforation, serial typography, and clipped corners; operational
  surfaces remain square and quiet.
- The first screen is the live pass board, not a marketing splash page.
- One primary action is presented at a time through a state-driven pass desk.

## Layout

- Sticky 76px navigation with brand, board/protocol links, contract status, and wallet.
- Board hero uses an asymmetric 5/7 split: market context left, featured pass right.
- Live passes appear as hanging ticket stubs in a horizontal rail.
- Protocol content uses an editorial timeline and full-width bands, not nested cards.
- Forms are built as a perforated ticket composer with numbered strips, not generic
  stacked input cards.

## Motion

- Sections reveal with opacity and 18px vertical movement using IntersectionObserver.
- Ticket stubs lift by 4px on hover; no continuous decorative animation.
- Reduced-motion preferences disable reveals and transitions.

## Accessibility

- Minimum 4.5:1 body-text contrast.
- Visible focus rings use mint on dark surfaces and teal on paper surfaces.
- Status is always expressed with text in addition to color.
- Inputs have explicit labels and validation messages.
# EventPass Escrow Visual Direction

## Reference Extraction

- Use a premium consulting-style landing page: dark teal hero, soft mint calls to action, rounded photo card, and calm white/cream content bands.
- Header should feel like a floating product nav: brand on the left, pill navigation in the center, wallet/contract actions on the right, sticky while scrolling.
- Hero should be asymmetric: strong editorial headline and action buttons on the left, large rounded event/ticket visual on the right with a subtle glass overlay.
- Keep the UI clean and high-trust. Avoid crowded dashboards on the first screen; the contract workflow lives behind a single primary action.
- Use ticket-specific language and motifs: protected pass, buyer challenge, seller response, recovery clock, barcode/perforation details.
- Use one primary action at a time. The home page can market and explain; the action desk routes handle funded flows.
- Do not use the phrase "black market". Use "verified resale", "protected transfer", or "safe event ticket resale".

## EventPass Adaptation

- Brand voice: safe, direct, event-focused, and non-sensational.
- Primary CTA: "Open protected sale".
- Secondary CTA: "Browse pass board".
- Visual hierarchy: big hero headline, short explanatory copy, compact proof chips, then a readable live board.
- Sections: hero, proof strip, essential checks, live board, protocol/how it works, recovery guarantee.
