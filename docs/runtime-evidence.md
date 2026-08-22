# EventPass Escrow — Runtime Evidence

Contract: `0x3397092ea7948Bf6398F3BeEF36BEacfF2d05FC6`

## Updated failure and recovery checks

| Check | Result | Transaction |
|---|---|---|
| Seller attempts to fund own listing | `FUNDING_NOT_ALLOWED` | `0x8c1578af32e75def569d153d1ce8858d930071cab380c3337e308167a5f5696e` |
| Delivery window failure is surfaced | `DELIVERY_WINDOW_CLOSED` | `0xa75a40d25a422c9151c603c4f2e04e7dff48d8a91b50cdf15748a0b7aaa84ff5` |
| Expired funded listing recovery | `SELLER_DEFAULT`, escrow cleared | `0x9d152477449d049bc338708d3163caf145fe0bdadd99378f610cc2d091063a0b` |
| Previous listing recovery | `SELLER_DEFAULT`, escrow cleared | `0x49e2ea1bb130a1f0f1b0d2bd611424333b29ae1fa2765fea99456872d481a14b` |

## Fresh evidence verification

The fresh single-use evidence path reached `VERIFIED / AUTHENTIC`:

- Listing: `7`
- Jury transaction: `0x5aa64bd3069d9d3019dc715909db31b2fa0737f4b90599f0047ba0d8d9a4877d`
- Evidence attachment: `0x426ed0bb24683e828d53093b23ac762e22e0c41269cd102c26ef1a6a201ef1f7`

## Existing terminal payout proof

- Result: `SELLER_PAID`
- Transaction: `0xcdad903d54c2fa1b3de0d3b8de868005b1b6969b61a28019403fbacde354d3df`

The frontend and runtime test implementation are documented in `docs/test-flow.md` and `frontend/scripts/live-lifecycle.mjs`.
