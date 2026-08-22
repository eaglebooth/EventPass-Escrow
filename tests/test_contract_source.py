import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "EventPassEscrow.py"
SOURCE = CONTRACT.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
FRONTEND_GENLAYER = ROOT / "frontend" / "lib" / "genlayer.ts"
FRONTEND_ACTIONS = ROOT / "frontend" / "components" / "ActionDesk.tsx"
RUNTIME_FLOW = ROOT / "frontend" / "scripts" / "live-lifecycle.mjs"


class ContractSourceTests(unittest.TestCase):
    def test_runner_header_and_contract_shape(self):
        self.assertEqual(
            SOURCE.splitlines()[:3],
            [
                "# v0.2.16",
                '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }',
                "from genlayer import *",
            ],
        )
        self.assertIn("class EventPassEscrow(gl.Contract):", SOURCE)

    def test_subjective_verdict_uses_semantic_consensus(self):
        self.assertGreaterEqual(SOURCE.count("gl.eq_principle.prompt_comparative"), 2)
        self.assertNotIn("gl.eq_principle.strict_eq", SOURCE)
        self.assertIn("def _parse_ticket_verdict", SOURCE)
        self.assertIn("def _parse_challenge_verdict", SOURCE)

    def test_real_payable_custody_and_transfers(self):
        self.assertGreaterEqual(SOURCE.count("@gl.public.write.payable"), 2)
        self.assertIn("gl.message.value", SOURCE)
        self.assertIn("emit_transfer(value=seller_amount)", SOURCE)
        self.assertIn("emit_transfer(value=buyer_amount)", SOURCE)
        self.assertIn('raise gl.vm.UserError("ESCROW_INVARIANT_BROKEN")', SOURCE)
        self.assertIn("self.total_received", SOURCE)
        self.assertIn("self.total_transferred", SOURCE)

    def test_evidence_is_content_addressed_and_single_use(self):
        for marker in [
            "hashlib.sha256",
            'value.startswith("sha256:")',
            "https://arweave.net/",
            "https://ipfs.io/ipfs/",
            "self.used_digests",
            "self.used_commitments",
            "def _digest_used",
            "def _commitment_used",
            'return "TICKET_ALREADY_LISTED"',
            'return "EVIDENCE_ALREADY_USED"',
        ]:
            self.assertIn(marker, SOURCE)
        self.assertNotIn("TreeMap[str, u256]", SOURCE)

    def test_parties_and_deadlines_guard_value_actions(self):
        for marker in [
            "gl.message.sender_address.as_hex.lower()",
            'return "SELLER_ONLY"',
            'return "BUYER_ONLY"',
            'return "PARTY_ONLY"',
            'gl.message_raw["datetime"]',
            "self.funding_deadline",
            "self.delivery_deadline",
            "self.challenge_deadline",
            "self.response_deadline",
            "self.recovery_deadline",
        ]:
            self.assertIn(marker, SOURCE)

    def test_every_nonterminal_branch_has_bounded_recovery(self):
        self.assertIn("def recover_expired", SOURCE)
        for marker in [
            'status == "LISTED"',
            'status == "FUNDED"',
            'status == "TICKET_ATTACHED"',
            'status == "VERIFIED"',
            'status in ("CHALLENGED", "RESPONSE_ATTACHED")',
            '"LISTING_EXPIRED"',
            '"SELLER_DEFAULT"',
            '"VERIFICATION_TIMEOUT"',
            '"CHALLENGE_TIMEOUT_REFUND"',
        ]:
            self.assertIn(marker, SOURCE)

    def test_public_signatures_remain_flat(self):
        for node in ast.walk(TREE):
            if not isinstance(node, ast.FunctionDef):
                continue
            public = any(
                isinstance(item, ast.Attribute)
                and item.attr in ("write", "view", "payable")
                for item in node.decorator_list
            )
            if public:
                self.assertLessEqual(len(node.args.args) - 1, 6, node.name)

    def test_no_known_runtime_antipatterns(self):
        for marker in [
            "get_block_timestamp",
            "testnetAsimov",
            "mockContract",
            "while True",
            "range(self.listing_count",
        ]:
            self.assertNotIn(marker, SOURCE)

    def test_frontend_binds_prefixed_digests_and_contract_failures(self):
        genlayer = FRONTEND_GENLAYER.read_text(encoding="utf-8")
        actions = FRONTEND_ACTIONS.read_text(encoding="utf-8")
        runtime = RUNTIME_FLOW.read_text(encoding="utf-8")
        self.assertIn('return `sha256:${raw}`', genlayer)
        self.assertIn('FINISHED_WITH_ERROR', genlayer)
        self.assertIn('Contract rejected action:', genlayer)
        self.assertIn('normalizeDigest', actions)
        self.assertIn('Waiting for consensus and contract result', actions)
        self.assertIn('fullTransaction: true', runtime)
        self.assertIn('expectContractError', runtime)
        self.assertIn('FUNDING_NOT_ALLOWED', runtime)


if __name__ == "__main__":
    unittest.main()

