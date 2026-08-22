# Two-wallet test flow

Use two funded Studionet wallets and one manually deployed `EventPassEscrow` contract.

## Preparation

1. Set the deployed address in `frontend/.env.local`.
2. Prepare an organizer policy and a ticket evidence packet on Arweave or IPFS.
3. Compute each exact SHA-256 digest and prefix it with `sha256:`.
4. Choose ordered UTC deadlines. Keep enough time for validator consensus.

## Happy path

1. Connect wallet A and create a listing with a real bond value.
2. Connect wallet B and fund the exact ticket price.
3. Connect wallet A and attach the ticket packet, digest, and unique ticket commitment.
4. Run ticket verification and wait for `ACCEPTED`.
5. After the challenge deadline, settle or call public recovery.
6. Confirm the seller payout and terminal status in the app and Explorer.

The runtime script also attempts `fund_listing` from the seller immediately after listing creation and asserts the contract-level `FUNDING_NOT_ALLOWED` return before continuing. This proves a transaction is not treated as successful merely because it reached `ACCEPTED`.

## Dispute path

1. Repeat listing, funding, delivery, and verification with a new evidence packet.
2. After the event time, wallet B attaches failed-check-in evidence.
3. Wallet A optionally attaches a separate response packet before the response deadline.
4. Run challenge adjudication.
5. Settle the selected fixed payout band and confirm both balances in Explorer.

## Required negative checks

- Seller cannot fund their own listing.
- Wrong funding value is rejected and refunded.
- Buyer cannot attach the seller ticket packet.
- Reused ticket commitment or evidence digest is rejected.
- Challenge before event time is rejected.
- Seller cannot submit buyer challenge evidence.
- A second settlement is rejected.
- Expired nonterminal states recover without either party being able to choose the payout.

The Python suite executes the full payout matrix and source-level implementation checks locally. Explorer transactions remain the proof for a deployed instance.

The frontend normalizes every user-entered digest (policy, ticket, challenge, response, and commitment) to the contract-required `sha256:<64 lowercase hex>` form. It reads the full GenLayer transaction receipt and surfaces `FINISHED_WITH_ERROR` plus contract business failure codes such as `SELLER_ONLY`, `WRONG_VALUE`, and `FUNDING_NOT_ALLOWED`.
