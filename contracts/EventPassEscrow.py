# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json
import hashlib


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class EventPassEscrow(gl.Contract):
    listing_count: u256
    seller: TreeMap[u256, str]
    buyer: TreeMap[u256, str]
    event_name: TreeMap[u256, str]
    seat_label: TreeMap[u256, str]
    policy_url: TreeMap[u256, str]
    policy_digest: TreeMap[u256, str]
    ticket_url: TreeMap[u256, str]
    ticket_digest: TreeMap[u256, str]
    ticket_commitment: TreeMap[u256, str]
    challenge_url: TreeMap[u256, str]
    challenge_digest: TreeMap[u256, str]
    response_url: TreeMap[u256, str]
    response_digest: TreeMap[u256, str]
    funding_deadline: TreeMap[u256, str]
    delivery_deadline: TreeMap[u256, str]
    event_time: TreeMap[u256, str]
    challenge_deadline: TreeMap[u256, str]
    response_deadline: TreeMap[u256, str]
    recovery_deadline: TreeMap[u256, str]
    price: TreeMap[u256, u256]
    funded_amount: TreeMap[u256, u256]
    seller_bond: TreeMap[u256, u256]
    status: TreeMap[u256, str]
    ticket_verdict: TreeMap[u256, str]
    challenge_verdict: TreeMap[u256, str]
    reason: TreeMap[u256, str]
    used_commitments: TreeMap[u256, str]
    used_digests: TreeMap[u256, str]
    used_commitment_count: u256
    used_digest_count: u256
    total_received: u256
    total_seller_paid: u256
    total_buyer_refunded: u256
    total_transferred: u256
    active_escrow: u256

    def __init__(self):
        self.listing_count = u256(0)
        self.total_received = u256(0)
        self.total_seller_paid = u256(0)
        self.total_buyer_refunded = u256(0)
        self.total_transferred = u256(0)
        self.active_escrow = u256(0)
        self.used_commitment_count = u256(0)
        self.used_digest_count = u256(0)

    def _sender(self) -> str:
        return gl.message.sender_address.as_hex.lower()

    def _now(self) -> str:
        try:
            value = str(gl.message_raw["datetime"])
            if "+" in value:
                value = value.split("+", 1)[0] + "Z"
            if "." in value:
                value = value.split(".", 1)[0] + "Z"
            return value
        except Exception:
            return ""

    def _valid_deadline(self, value: str) -> bool:
        if (
            len(value) != 20
            or not value.endswith("Z")
            or value[4] != "-"
            or value[7] != "-"
            or value[10] != "T"
            or value[13] != ":"
            or value[16] != ":"
        ):
            return False
        digits = value[0:4] + value[5:7] + value[8:10] + value[11:13] + value[14:16] + value[17:19]
        if not digits.isdigit():
            return False
        month = int(value[5:7])
        day = int(value[8:10])
        hour = int(value[11:13])
        minute = int(value[14:16])
        second = int(value[17:19])
        return 1 <= month <= 12 and 1 <= day <= 31 and hour <= 23 and minute <= 59 and second <= 59

    def _valid_digest(self, value: str) -> bool:
        if len(value) != 71 or not value.startswith("sha256:"):
            return False
        try:
            int(value[7:], 16)
            return value[7:] != ("0" * 64)
        except Exception:
            return False

    def _valid_url(self, value: str) -> bool:
        lowered = value.lower()
        return (
            len(value) <= 500
            and (lowered.startswith("https://arweave.net/") or lowered.startswith("https://ipfs.io/ipfs/"))
            and "example" not in lowered
            and "replace" not in lowered
        )

    def _fetch_verified(self, url: str, digest: str) -> str:
        response = gl.nondet.web.get(url)
        body = response.body.decode("utf-8")
        actual = "sha256:" + hashlib.sha256(body.encode("utf-8")).hexdigest()
        if actual != digest:
            raise gl.vm.UserError("EVIDENCE_DIGEST_MISMATCH")
        return body[:5000]

    def _is_party(self, listing_id: u256, sender: str) -> bool:
        return sender == self.seller[listing_id] or sender == self.buyer[listing_id]

    def _commitment_used(self, commitment: str) -> bool:
        index = u256(0)
        while index < self.used_commitment_count:
            if self.used_commitments[index] == commitment:
                return True
            index = index + u256(1)
        return False

    def _digest_used(self, digest: str) -> bool:
        index = u256(0)
        while index < self.used_digest_count:
            if self.used_digests[index] == digest:
                return True
            index = index + u256(1)
        return False

    def _remember_commitment(self, commitment: str) -> None:
        self.used_commitments[self.used_commitment_count] = commitment
        self.used_commitment_count = self.used_commitment_count + u256(1)

    def _remember_digest(self, digest: str) -> None:
        self.used_digests[self.used_digest_count] = digest
        self.used_digest_count = self.used_digest_count + u256(1)
    def _refund_attached(self) -> None:
        value = gl.message.value
        if value > u256(0):
            _Recipient(Address(self._sender())).emit_transfer(value=value)

    def _strict_bool(self, value: typing.Any) -> typing.Any:
        if value is True:
            return True
        if value is False:
            return False
        return None

    def _transfer_pair(self, listing_id: u256, seller_amount: u256, buyer_amount: u256, terminal: str) -> str:
        total = self.funded_amount[listing_id] + self.seller_bond[listing_id]
        if seller_amount + buyer_amount != total or total > self.balance:
            raise gl.vm.UserError("ESCROW_INVARIANT_BROKEN")
        self.funded_amount[listing_id] = u256(0)
        self.seller_bond[listing_id] = u256(0)
        self.active_escrow = self.active_escrow - total
        self.total_seller_paid = self.total_seller_paid + seller_amount
        self.total_buyer_refunded = self.total_buyer_refunded + buyer_amount
        self.total_transferred = self.total_transferred + total
        self.status[listing_id] = terminal
        if seller_amount > u256(0):
            _Recipient(Address(self.seller[listing_id])).emit_transfer(value=seller_amount)
        if buyer_amount > u256(0):
            _Recipient(Address(self.buyer[listing_id])).emit_transfer(value=buyer_amount)
        return terminal

    def _parse_ticket_verdict(self, raw: str) -> typing.Any:
        try:
            data = json.loads(raw)
            decision = str(data["decision"])
            confidence = int(data["confidence"])
            format_match = self._strict_bool(data["format_match"])
            serial_plausible = self._strict_bool(data["serial_plausible"])
            material_conflict = self._strict_bool(data["material_conflict"])
            reason = str(data["reason"])[:700]
            if decision not in ("AUTHENTIC", "SUSPICIOUS", "CONTRADICTORY", "UNAVAILABLE"):
                return None
            if confidence < 0 or confidence > 100:
                return None
            if format_match is None or serial_plausible is None or material_conflict is None or reason == "":
                return None
            if decision == "AUTHENTIC" and (confidence < 80 or not format_match or not serial_plausible or material_conflict):
                return None
            if decision == "SUSPICIOUS" and ((format_match and serial_plausible) or material_conflict):
                return None
            if decision == "CONTRADICTORY" and not material_conflict:
                return None
            if decision == "UNAVAILABLE" and confidence > 50:
                return None
            return decision, reason, confidence
        except Exception:
            return None

    def _parse_challenge_verdict(self, raw: str) -> typing.Any:
        try:
            data = json.loads(raw)
            decision = str(data["decision"])
            confidence = int(data["confidence"])
            checkin_failure = self._strict_bool(data["checkin_failure_supported"])
            seller_fault = str(data["seller_fault"])
            reason = str(data["reason"])[:700]
            if decision not in ("SELLER_PAID", "BUYER_REFUND", "SPLIT", "UNAVAILABLE"):
                return None
            if confidence < 0 or confidence > 100 or checkin_failure is None or seller_fault not in ("NONE", "SHARED", "SELLER") or reason == "":
                return None
            if decision == "BUYER_REFUND" and (not checkin_failure or seller_fault != "SELLER" or confidence < 75):
                return None
            if decision == "SELLER_PAID" and (checkin_failure or seller_fault != "NONE"):
                return None
            if decision == "SPLIT" and (not checkin_failure or seller_fault != "SHARED" or confidence < 60):
                return None
            if decision == "UNAVAILABLE" and confidence > 50:
                return None
            return decision, reason, confidence
        except Exception:
            return None

    @gl.public.write.payable
    def create_listing(
        self,
        event_name: str,
        seat_label: str,
        policy_url: str,
        policy_digest: str,
        terms_json: str,
        seller_bond: u256,
    ) -> typing.Any:
        try:
            terms = json.loads(terms_json)
            price = u256(int(terms["price_wei"]))
            funding = str(terms["funding_deadline"])
            delivery = str(terms["delivery_deadline"])
            event = str(terms["event_time"])
            challenge = str(terms["challenge_deadline"])
            response = str(terms["response_deadline"])
            recovery = str(terms["recovery_deadline"])
        except Exception:
            self._refund_attached()
            return "INVALID_TERMS"
        now = self._now()
        if (
            event_name == ""
            or len(event_name) > 120
            or len(seat_label) > 80
            or not self._valid_url(policy_url)
            or not self._valid_digest(policy_digest)
            or price == u256(0)
            or seller_bond == u256(0)
            or gl.message.value != seller_bond
            or not all(self._valid_deadline(v) for v in (funding, delivery, event, challenge, response, recovery))
            or now == ""
            or not (now < funding < delivery < event < challenge < response < recovery)
        ):
            self._refund_attached()
            return "INVALID_LISTING"
        listing_id = self.listing_count
        self.seller[listing_id] = self._sender()
        self.buyer[listing_id] = ""
        self.event_name[listing_id] = event_name
        self.seat_label[listing_id] = seat_label
        self.policy_url[listing_id] = policy_url
        self.policy_digest[listing_id] = policy_digest
        # Initialize optional fields so views and later lifecycle branches never
        # read a missing TreeMap key.
        self.ticket_url[listing_id] = ""
        self.ticket_digest[listing_id] = ""
        self.ticket_commitment[listing_id] = ""
        self.challenge_url[listing_id] = ""
        self.challenge_digest[listing_id] = ""
        self.response_url[listing_id] = ""
        self.response_digest[listing_id] = ""
        self.ticket_verdict[listing_id] = ""
        self.challenge_verdict[listing_id] = ""
        self.reason[listing_id] = ""
        self.funding_deadline[listing_id] = funding
        self.delivery_deadline[listing_id] = delivery
        self.event_time[listing_id] = event
        self.challenge_deadline[listing_id] = challenge
        self.response_deadline[listing_id] = response
        self.recovery_deadline[listing_id] = recovery
        self.price[listing_id] = price
        self.funded_amount[listing_id] = u256(0)
        self.seller_bond[listing_id] = seller_bond
        self.status[listing_id] = "LISTED"
        self.active_escrow = self.active_escrow + seller_bond
        self.total_received = self.total_received + seller_bond
        self.listing_count = listing_id + u256(1)
        return listing_id

    @gl.public.write.payable
    def fund_listing(self, listing_id: u256) -> str:
        if listing_id >= self.listing_count or self.status[listing_id] != "LISTED":
            self._refund_attached()
            return "LISTING_NOT_AVAILABLE"
        if self._now() >= self.funding_deadline[listing_id] or self._sender() == self.seller[listing_id]:
            self._refund_attached()
            return "FUNDING_NOT_ALLOWED"
        if gl.message.value != self.price[listing_id]:
            self._refund_attached()
            return "WRONG_VALUE"
        self.buyer[listing_id] = self._sender()
        self.funded_amount[listing_id] = gl.message.value
        self.status[listing_id] = "FUNDED"
        self.active_escrow = self.active_escrow + gl.message.value
        self.total_received = self.total_received + gl.message.value
        return "FUNDED"

    @gl.public.write
    def attach_ticket(self, listing_id: u256, url: str, digest: str, commitment: str) -> str:
        if listing_id >= self.listing_count or self.status[listing_id] != "FUNDED":
            return "TICKET_NOT_EXPECTED"
        if self._sender() != self.seller[listing_id]:
            return "SELLER_ONLY"
        if self._now() >= self.delivery_deadline[listing_id]:
            return "DELIVERY_WINDOW_CLOSED"
        if not self._valid_url(url) or not self._valid_digest(digest) or not self._valid_digest(commitment):
            return "INVALID_TICKET_EVIDENCE"
        if self._commitment_used(commitment) or self._digest_used(digest):
            return "TICKET_ALREADY_LISTED"
        self.ticket_url[listing_id] = url
        self.ticket_digest[listing_id] = digest
        self.ticket_commitment[listing_id] = commitment
        self._remember_commitment(commitment)
        self._remember_digest(digest)
        self.status[listing_id] = "TICKET_ATTACHED"
        return "TICKET_ATTACHED"

    @gl.public.write
    def verify_ticket(self, listing_id: u256) -> str:
        if listing_id >= self.listing_count or self.status[listing_id] != "TICKET_ATTACHED":
            return "TICKET_NOT_READY"
        if self._now() == "" or self._now() >= self.event_time[listing_id]:
            return "VERIFICATION_WINDOW_CLOSED"

        def evaluate() -> str:
            policy = self._fetch_verified(self.policy_url[listing_id], self.policy_digest[listing_id])
            ticket = self._fetch_verified(self.ticket_url[listing_id], self.ticket_digest[listing_id])
            prompt = f"""You are an event ticket authenticity jury. Compare the immutable ticket packet with the organizer's public policy. Never claim to validate a live barcode or guarantee admission. Judge structural consistency, event metadata, serial plausibility, holder/transfer rules, and contradictions.\nEVENT: {self.event_name[listing_id]}\nSEAT: {self.seat_label[listing_id]}\nPUBLIC POLICY:\n{policy}\nTICKET PACKET:\n{ticket}\nRespond ONLY with JSON: {{\"decision\":\"AUTHENTIC|SUSPICIOUS|CONTRADICTORY|UNAVAILABLE\",\"confidence\":0,\"format_match\":true,\"serial_plausible\":true,\"material_conflict\":false,\"reason\":\"under 700 chars\"}}"""
            return gl.nondet.exec_prompt(prompt)

        principle = "Outputs are equivalent only if they select the same authenticity decision and do not contradict each other about structural format, serial plausibility, source availability, or material policy conflicts. Wording may differ."
        parsed = self._parse_ticket_verdict(gl.eq_principle.prompt_comparative(evaluate, principle))
        if parsed is None:
            self.status[listing_id] = "EVIDENCE_UNAVAILABLE"
            self.ticket_verdict[listing_id] = "UNAVAILABLE"
            self.reason[listing_id] = "Validator output could not be safely interpreted."
            return "EVIDENCE_UNAVAILABLE"
        decision, reason, confidence = parsed
        self.ticket_verdict[listing_id] = decision
        self.reason[listing_id] = reason
        if decision == "AUTHENTIC":
            self.status[listing_id] = "VERIFIED"
        elif decision == "UNAVAILABLE":
            self.status[listing_id] = "EVIDENCE_UNAVAILABLE"
        else:
            self.status[listing_id] = "REJECTED"
        return self.status[listing_id]

    @gl.public.write
    def challenge_checkin(self, listing_id: u256, url: str, digest: str) -> str:
        now = self._now()
        if listing_id >= self.listing_count or self.status[listing_id] != "VERIFIED":
            return "CHALLENGE_NOT_AVAILABLE"
        if self._sender() != self.buyer[listing_id]:
            return "BUYER_ONLY"
        if not (self.event_time[listing_id] <= now < self.challenge_deadline[listing_id]):
            return "CHALLENGE_WINDOW_CLOSED"
        if not self._valid_url(url) or not self._valid_digest(digest):
            return "INVALID_CHALLENGE_EVIDENCE"
        if self._digest_used(digest):
            return "EVIDENCE_ALREADY_USED"
        self.challenge_url[listing_id] = url
        self.challenge_digest[listing_id] = digest
        self._remember_digest(digest)
        self.status[listing_id] = "CHALLENGED"
        return "CHALLENGED"

    @gl.public.write
    def attach_seller_response(self, listing_id: u256, url: str, digest: str) -> str:
        if listing_id >= self.listing_count or self.status[listing_id] != "CHALLENGED":
            return "RESPONSE_NOT_EXPECTED"
        if self._sender() != self.seller[listing_id]:
            return "SELLER_ONLY"
        if self._now() >= self.response_deadline[listing_id]:
            return "RESPONSE_WINDOW_CLOSED"
        if not self._valid_url(url) or not self._valid_digest(digest):
            return "INVALID_RESPONSE_EVIDENCE"
        if self._digest_used(digest):
            return "EVIDENCE_ALREADY_USED"
        self.response_url[listing_id] = url
        self.response_digest[listing_id] = digest
        self._remember_digest(digest)
        self.status[listing_id] = "RESPONSE_ATTACHED"
        return "RESPONSE_ATTACHED"

    @gl.public.write
    def adjudicate_challenge(self, listing_id: u256) -> str:
        if listing_id >= self.listing_count or self.status[listing_id] not in ("CHALLENGED", "RESPONSE_ATTACHED"):
            return "CHALLENGE_NOT_READY"
        now = self._now()
        if now == "" or now >= self.recovery_deadline[listing_id]:
            return "ADJUDICATION_WINDOW_CLOSED"
        if self.status[listing_id] == "CHALLENGED" and now < self.response_deadline[listing_id]:
            return "SELLER_RESPONSE_WINDOW_OPEN"

        def evaluate() -> str:
            challenge = self._fetch_verified(self.challenge_url[listing_id], self.challenge_digest[listing_id])
            response = "NO SELLER RESPONSE BEFORE DEADLINE"
            if self.response_url[listing_id] != "":
                response = self._fetch_verified(self.response_url[listing_id], self.response_digest[listing_id])
            prompt = f"""You are adjudicating an event check-in failure. A missing seller response is not proof by itself. Determine whether authenticated, time-relevant evidence supports failed admission caused by a materially invalid or duplicated ticket.\nBUYER EVIDENCE:\n{challenge}\nSELLER RESPONSE:\n{response}\nRespond ONLY with JSON: {{\"decision\":\"SELLER_PAID|BUYER_REFUND|SPLIT|UNAVAILABLE\",\"confidence\":0,\"checkin_failure_supported\":true,\"seller_fault\":\"NONE|SHARED|SELLER\",\"reason\":\"under 700 chars\"}}"""
            return gl.nondet.exec_prompt(prompt)

        principle = "Outputs are equivalent only if they select the same payout band and agree on whether failed check-in and seller responsibility are supported. Wording may differ; incompatible economic outcomes are never equivalent."
        parsed = self._parse_challenge_verdict(gl.eq_principle.prompt_comparative(evaluate, principle))
        if parsed is None:
            self.challenge_verdict[listing_id] = "UNAVAILABLE"
            self.status[listing_id] = "CHALLENGE_UNAVAILABLE"
            return "CHALLENGE_UNAVAILABLE"
        decision, reason, confidence = parsed
        self.challenge_verdict[listing_id] = decision
        self.reason[listing_id] = reason
        self.status[listing_id] = "RULING_READY"
        return "RULING_READY"

    def _settle_ready(self, listing_id: u256) -> str:
        status = self.status[listing_id]
        price = self.funded_amount[listing_id]
        bond = self.seller_bond[listing_id]
        if status == "VERIFIED" and self._now() >= self.challenge_deadline[listing_id]:
            return self._transfer_pair(listing_id, price + bond, u256(0), "SELLER_PAID")
        if status == "REJECTED":
            return self._transfer_pair(listing_id, u256(0), price + bond, "BUYER_REFUNDED")
        if status in ("EVIDENCE_UNAVAILABLE", "CHALLENGE_UNAVAILABLE"):
            return self._transfer_pair(listing_id, bond, price, "NEUTRAL_REFUND")
        if status != "RULING_READY":
            return "SETTLEMENT_NOT_READY"
        decision = self.challenge_verdict[listing_id]
        if decision == "SELLER_PAID":
            return self._transfer_pair(listing_id, price + bond, u256(0), "SELLER_PAID")
        if decision == "BUYER_REFUND":
            return self._transfer_pair(listing_id, u256(0), price + bond, "BUYER_REFUNDED")
        if decision == "SPLIT":
            half = price // u256(2)
            return self._transfer_pair(listing_id, bond + half, price - half, "SPLIT_SETTLED")
        return "INVALID_RULING"

    @gl.public.write
    def settle(self, listing_id: u256) -> str:
        if listing_id >= self.listing_count or not self._is_party(listing_id, self._sender()):
            return "PARTY_ONLY"
        return self._settle_ready(listing_id)

    @gl.public.write
    def recover_expired(self, listing_id: u256) -> str:
        if listing_id >= self.listing_count:
            return "LISTING_NOT_FOUND"
        now = self._now()
        status = self.status[listing_id]
        price = self.funded_amount[listing_id]
        bond = self.seller_bond[listing_id]
        if status == "LISTED" and now >= self.funding_deadline[listing_id]:
            return self._transfer_pair(listing_id, bond, u256(0), "LISTING_EXPIRED")
        if status == "FUNDED" and now >= self.delivery_deadline[listing_id]:
            return self._transfer_pair(listing_id, u256(0), price + bond, "SELLER_DEFAULT")
        if status == "TICKET_ATTACHED" and now >= self.event_time[listing_id]:
            return self._transfer_pair(listing_id, bond, price, "VERIFICATION_TIMEOUT")
        if status == "VERIFIED" and now >= self.challenge_deadline[listing_id]:
            return self._transfer_pair(listing_id, price + bond, u256(0), "SELLER_PAID")
        if status in ("CHALLENGED", "RESPONSE_ATTACHED") and now >= self.recovery_deadline[listing_id]:
            return self._transfer_pair(listing_id, bond, price, "CHALLENGE_TIMEOUT_REFUND")
        if status in ("REJECTED", "EVIDENCE_UNAVAILABLE", "CHALLENGE_UNAVAILABLE", "RULING_READY"):
            return self._settle_ready(listing_id)
        return "RECOVERY_NOT_AVAILABLE"

    @gl.public.view
    def get_listing(self, listing_id: u256) -> typing.Any:
        if listing_id >= self.listing_count:
            return "LISTING_NOT_FOUND"
        return {
            "id": listing_id,
            "event": self.event_name[listing_id],
            "seat": self.seat_label[listing_id],
            "seller": self.seller[listing_id],
            "buyer": self.buyer[listing_id],
            "price": self.price[listing_id],
            "funded_amount": self.funded_amount[listing_id],
            "bond": self.seller_bond[listing_id],
            "status": self.status[listing_id],
            "ticket_verdict": self.ticket_verdict[listing_id],
            "challenge_verdict": self.challenge_verdict[listing_id],
            "reason": self.reason[listing_id],
            "event_time": self.event_time[listing_id],
            "challenge_deadline": self.challenge_deadline[listing_id],
            "recovery_deadline": self.recovery_deadline[listing_id],
        }

    @gl.public.view
    def get_summary(self) -> typing.Any:
        return {
            "listing_count": self.listing_count,
            "active_escrow": self.active_escrow,
            "received": self.total_received,
            "seller_paid": self.total_seller_paid,
            "buyer_refunded": self.total_buyer_refunded,
            "transferred": self.total_transferred,
        }

