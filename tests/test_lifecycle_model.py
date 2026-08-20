from dataclasses import dataclass
import unittest


TERMINAL = {
    "LISTING_EXPIRED",
    "SELLER_DEFAULT",
    "VERIFICATION_TIMEOUT",
    "SELLER_PAID",
    "BUYER_REFUNDED",
    "NEUTRAL_REFUND",
    "SPLIT_SETTLED",
    "CHALLENGE_TIMEOUT_REFUND",
}


@dataclass
class Listing:
    seller: str = "seller"
    buyer: str = ""
    price: int = 100
    bond: int = 25
    funded: int = 0
    status: str = "LISTED"
    ticket_commitment: str = ""
    ticket_digest: str = ""
    challenge_digest: str = ""
    response_digest: str = ""
    challenge_verdict: str = ""
    seller_paid: int = 0
    buyer_refunded: int = 0

    @property
    def escrow(self) -> int:
        return self.funded + self.bond


class EventPassModel:
    def __init__(self):
        self.listing = Listing()
        self.used_commitments: set[str] = set()
        self.used_digests: set[str] = set()
        self.total_received = self.listing.bond
        self.total_transferred = 0

    def fund(self, sender: str, value: int) -> str:
        item = self.listing
        if item.status != "LISTED":
            return "LISTING_NOT_AVAILABLE"
        if sender == item.seller:
            return "FUNDING_NOT_ALLOWED"
        if value != item.price:
            return "WRONG_VALUE"
        item.buyer = sender
        item.funded = value
        item.status = "FUNDED"
        self.total_received += value
        return "FUNDED"

    def attach_ticket(self, sender: str, digest: str, commitment: str) -> str:
        item = self.listing
        if item.status != "FUNDED":
            return "TICKET_NOT_EXPECTED"
        if sender != item.seller:
            return "SELLER_OR_DEADLINE_INVALID"
        if digest in self.used_digests or commitment in self.used_commitments:
            return "TICKET_ALREADY_LISTED"
        item.ticket_digest = digest
        item.ticket_commitment = commitment
        self.used_digests.add(digest)
        self.used_commitments.add(commitment)
        item.status = "TICKET_ATTACHED"
        return "TICKET_ATTACHED"

    def verify(self, decision: str) -> str:
        item = self.listing
        if item.status != "TICKET_ATTACHED":
            return "TICKET_NOT_READY"
        item.status = {
            "AUTHENTIC": "VERIFIED",
            "UNAVAILABLE": "EVIDENCE_UNAVAILABLE",
        }.get(decision, "REJECTED")
        return item.status

    def challenge(self, sender: str, digest: str) -> str:
        item = self.listing
        if item.status != "VERIFIED":
            return "CHALLENGE_NOT_AVAILABLE"
        if sender != item.buyer:
            return "BUYER_OR_WINDOW_INVALID"
        if digest in self.used_digests:
            return "EVIDENCE_ALREADY_USED"
        self.used_digests.add(digest)
        item.challenge_digest = digest
        item.status = "CHALLENGED"
        return "CHALLENGED"

    def respond(self, sender: str, digest: str) -> str:
        item = self.listing
        if item.status != "CHALLENGED":
            return "RESPONSE_NOT_EXPECTED"
        if sender != item.seller:
            return "SELLER_OR_WINDOW_INVALID"
        if digest in self.used_digests:
            return "EVIDENCE_ALREADY_USED"
        self.used_digests.add(digest)
        item.response_digest = digest
        item.status = "RESPONSE_ATTACHED"
        return "RESPONSE_ATTACHED"

    def rule(self, decision: str) -> str:
        item = self.listing
        if item.status not in ("CHALLENGED", "RESPONSE_ATTACHED"):
            return "CHALLENGE_NOT_READY"
        item.challenge_verdict = decision
        item.status = "CHALLENGE_UNAVAILABLE" if decision == "UNAVAILABLE" else "RULING_READY"
        return item.status

    def _transfer(self, seller_amount: int, buyer_amount: int, terminal: str) -> str:
        item = self.listing
        total = item.escrow
        if seller_amount + buyer_amount != total:
            raise ValueError("ESCROW_INVARIANT_BROKEN")
        item.funded = 0
        item.bond = 0
        item.seller_paid += seller_amount
        item.buyer_refunded += buyer_amount
        item.status = terminal
        self.total_transferred += total
        return terminal

    def settle(self, sender: str) -> str:
        item = self.listing
        if sender not in (item.seller, item.buyer):
            return "PARTY_ONLY"
        if item.status == "REJECTED":
            return self._transfer(0, item.escrow, "BUYER_REFUNDED")
        if item.status in ("EVIDENCE_UNAVAILABLE", "CHALLENGE_UNAVAILABLE"):
            return self._transfer(item.bond, item.funded, "NEUTRAL_REFUND")
        if item.status != "RULING_READY":
            return "SETTLEMENT_NOT_READY"
        if item.challenge_verdict == "SELLER_PAID":
            return self._transfer(item.escrow, 0, "SELLER_PAID")
        if item.challenge_verdict == "BUYER_REFUND":
            return self._transfer(0, item.escrow, "BUYER_REFUNDED")
        if item.challenge_verdict == "SPLIT":
            half = item.funded // 2
            return self._transfer(item.bond + half, item.funded - half, "SPLIT_SETTLED")
        return "INVALID_RULING"

    def recover(self, stage: str) -> str:
        item = self.listing
        if item.status == "LISTED" and stage == "funding":
            return self._transfer(item.bond, 0, "LISTING_EXPIRED")
        if item.status == "FUNDED" and stage == "delivery":
            return self._transfer(0, item.escrow, "SELLER_DEFAULT")
        if item.status == "TICKET_ATTACHED" and stage == "event":
            return self._transfer(item.bond, item.funded, "VERIFICATION_TIMEOUT")
        if item.status == "VERIFIED" and stage == "challenge":
            return self._transfer(item.escrow, 0, "SELLER_PAID")
        if item.status in ("CHALLENGED", "RESPONSE_ATTACHED") and stage == "recovery":
            return self._transfer(item.bond, item.funded, "CHALLENGE_TIMEOUT_REFUND")
        return "RECOVERY_NOT_AVAILABLE"


class EventPassLifecycleTests(unittest.TestCase):
    def funded_model(self) -> EventPassModel:
        model = EventPassModel()
        self.assertEqual(model.fund("buyer", 100), "FUNDED")
        return model

    def verified_model(self) -> EventPassModel:
        model = self.funded_model()
        self.assertEqual(model.attach_ticket("seller", "ticket-digest", "serial-commitment"), "TICKET_ATTACHED")
        self.assertEqual(model.verify("AUTHENTIC"), "VERIFIED")
        return model

    def assert_conserved(self, model: EventPassModel) -> None:
        self.assertEqual(model.total_received, 125)
        self.assertEqual(model.total_transferred, 125)
        self.assertEqual(model.listing.seller_paid + model.listing.buyer_refunded, 125)
        self.assertEqual(model.listing.escrow, 0)

    def test_funding_requires_an_external_buyer_and_exact_value(self):
        model = EventPassModel()
        self.assertEqual(model.fund("seller", 100), "FUNDING_NOT_ALLOWED")
        self.assertEqual(model.fund("buyer", 99), "WRONG_VALUE")
        self.assertEqual(model.fund("buyer", 100), "FUNDED")

    def test_ticket_identity_and_digest_are_single_use(self):
        model = self.funded_model()
        self.assertEqual(model.attach_ticket("buyer", "d1", "c1"), "SELLER_OR_DEADLINE_INVALID")
        self.assertEqual(model.attach_ticket("seller", "d1", "c1"), "TICKET_ATTACHED")
        other = self.funded_model()
        other.used_digests.add("d1")
        other.used_commitments.add("c1")
        self.assertEqual(other.attach_ticket("seller", "d1", "c2"), "TICKET_ALREADY_LISTED")
        self.assertEqual(other.attach_ticket("seller", "d2", "c1"), "TICKET_ALREADY_LISTED")

    def test_suspicious_ticket_returns_every_locked_wei_to_buyer(self):
        model = self.funded_model()
        model.attach_ticket("seller", "d1", "c1")
        self.assertEqual(model.verify("SUSPICIOUS"), "REJECTED")
        self.assertEqual(model.settle("buyer"), "BUYER_REFUNDED")
        self.assertEqual(model.listing.buyer_refunded, 125)
        self.assert_conserved(model)

    def test_unavailable_ticket_is_role_balanced(self):
        model = self.funded_model()
        model.attach_ticket("seller", "d1", "c1")
        self.assertEqual(model.verify("UNAVAILABLE"), "EVIDENCE_UNAVAILABLE")
        self.assertEqual(model.settle("seller"), "NEUTRAL_REFUND")
        self.assertEqual((model.listing.seller_paid, model.listing.buyer_refunded), (25, 100))
        self.assert_conserved(model)

    def test_checkin_challenge_binds_both_evidence_packets(self):
        model = self.verified_model()
        self.assertEqual(model.challenge("seller", "challenge"), "BUYER_OR_WINDOW_INVALID")
        self.assertEqual(model.challenge("buyer", "challenge"), "CHALLENGED")
        self.assertEqual(model.respond("buyer", "response"), "SELLER_OR_WINDOW_INVALID")
        self.assertEqual(model.respond("seller", "response"), "RESPONSE_ATTACHED")

    def test_all_jury_payout_bands_conserve_value(self):
        expected = {
            "SELLER_PAID": (125, 0, "SELLER_PAID"),
            "BUYER_REFUND": (0, 125, "BUYER_REFUNDED"),
            "SPLIT": (75, 50, "SPLIT_SETTLED"),
            "UNAVAILABLE": (25, 100, "NEUTRAL_REFUND"),
        }
        for decision, (seller_amount, buyer_amount, terminal) in expected.items():
            with self.subTest(decision=decision):
                model = self.verified_model()
                model.challenge("buyer", "challenge")
                model.respond("seller", "response")
                model.rule(decision)
                self.assertEqual(model.settle("buyer"), terminal)
                self.assertEqual((model.listing.seller_paid, model.listing.buyer_refunded), (seller_amount, buyer_amount))
                self.assert_conserved(model)

    def test_public_timeout_matrix_charges_the_stalling_side(self):
        scenarios = []
        listed = EventPassModel()
        scenarios.append((listed, "funding", "LISTING_EXPIRED", (25, 0)))
        funded = self.funded_model()
        scenarios.append((funded, "delivery", "SELLER_DEFAULT", (0, 125)))
        attached = self.funded_model()
        attached.attach_ticket("seller", "d1", "c1")
        scenarios.append((attached, "event", "VERIFICATION_TIMEOUT", (25, 100)))
        verified = self.verified_model()
        scenarios.append((verified, "challenge", "SELLER_PAID", (125, 0)))
        challenged = self.verified_model()
        challenged.challenge("buyer", "challenge")
        scenarios.append((challenged, "recovery", "CHALLENGE_TIMEOUT_REFUND", (25, 100)))

        for model, stage, terminal, amounts in scenarios:
            with self.subTest(terminal=terminal):
                self.assertEqual(model.recover(stage), terminal)
                self.assertEqual((model.listing.seller_paid, model.listing.buyer_refunded), amounts)
                self.assertEqual(model.total_received, model.total_transferred)

    def test_unauthorized_settlement_and_double_settlement_are_blocked(self):
        model = self.funded_model()
        model.attach_ticket("seller", "d1", "c1")
        model.verify("SUSPICIOUS")
        self.assertEqual(model.settle("stranger"), "PARTY_ONLY")
        self.assertEqual(model.settle("buyer"), "BUYER_REFUNDED")
        self.assertIn(model.listing.status, TERMINAL)
        self.assertEqual(model.settle("buyer"), "SETTLEMENT_NOT_READY")
        self.assertEqual(model.total_transferred, 125)


if __name__ == "__main__":
    unittest.main()
