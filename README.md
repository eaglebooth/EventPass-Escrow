# EventPass Escrow

EventPass Escrow is a GenLayer-native ticket resale protocol. A seller locks a bond and commits immutable ticket evidence, a buyer funds the quoted price, and GenLayer validators assess ticket authenticity and any later check-in dispute before releasing escrow.

## Why GenLayer

Ticket validity cannot be established by checking one deterministic field. The contract must interpret an organizer policy, ticket structure, delivery evidence, and contradictory check-in evidence. `gl.nondet.web.get` reads the committed public evidence while `gl.nondet.exec_prompt` performs the subjective assessment. `prompt_comparative` asks validators to agree on the economic meaning rather than byte-identical prose.

## Lifecycle

1. **List** - the seller defines the event, immutable organizer policy, price, bond, and all deadlines.
2. **Fund** - a different wallet pays the exact ticket price into contract custody.
3. **Deliver** - the seller attaches an Arweave or IPFS ticket packet and SHA-256 digest.
4. **Verify** - the on-chain jury compares the ticket packet with the organizer policy.
5. **Challenge** - after the event, the buyer may attach immutable failed-check-in evidence.
6. **Respond** - the seller may attach an independent response before the response deadline.
7. **Settle** - the jury selects seller payout, buyer refund, or a fixed split. Contract transfers conserve the funded price plus seller bond.
8. **Recover** - every nonterminal state has a fixed deadline and deterministic payout, so funds cannot remain stranded.

## Repository

```text
contracts/   Intelligent Contract source
frontend/    Next.js application using genlayer-js
tests/       Contract-source and lifecycle invariant tests
docs/        Architecture, design, and test instructions
```

## Local verification

```bash
python -m unittest discover -s tests -v
cd frontend
npm install
npm run build
npm run dev -- -p 3044
```

Open `http://localhost:3044`. A deployed Studionet address is configured with `NEXT_PUBLIC_CONTRACT_ADDRESS`; until then, the app remains in an explicit local preview state and does not simulate successful on-chain writes.

## Contract configuration

Create `frontend/.env.local` after manual deployment:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
```

The contract page accepts a temporary runtime address so operators can inspect another deployment without rebuilding the frontend.

## Safety properties

- Sender-bound seller and buyer roles
- Exact payable value checks with invalid-value refunds
- Arweave/IPFS allowlist and fetched-content SHA-256 verification
- Digest and ticket commitment reuse prevention
- Comparative semantic consensus for subjective outcomes
- Mutually consistent verdict fields and fixed payout bands
- Deterministic recovery for every expired nonterminal state
- Conservation checks and double-settlement protection

See [docs/test-flow.md](docs/test-flow.md) for the two-wallet test sequence.
