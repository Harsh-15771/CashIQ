import pytest
from backend.app.parser.mime_parser import InboundMIMEParser


def test_parse_standard_invoice_reply():
    raw_email = """From: "Rajesh Sharma" <ap-finance@apexlogistics.in>
To: "Collections Desk" <collections@merchant.com>
Subject: Re: Overdue Invoice INV-2026-001 Reminder
Date: Sat, 22 Aug 2026 14:30:00 +0530
Message-ID: <msg_1001@apexlogistics.in>
In-Reply-To: <orig_990@merchant.com>

Hi Team,

We have reviewed Invoice INV-2026-001. We will process this in our upcoming Friday payment run on 2026-08-28 via NEFT.

Thanks & Regards,
Rajesh Sharma
Senior Accounts Manager
Apex Logistics India Ltd
Ph: +91 98765 43210
"""
    parsed = InboundMIMEParser.parse_raw_rfc822(raw_email)

    assert parsed.from_address == "ap-finance@apexlogistics.in"
    assert parsed.from_name == "Rajesh Sharma"
    assert parsed.matched_invoice_id == "INV-2026-001"
    assert "We will process this in our upcoming Friday payment run" in parsed.clean_body
    assert "Senior Accounts Manager" not in parsed.clean_body  # Signature stripped


def test_unlinked_inbound_fallback():
    """An email with no invoice ID reference should have matched_invoice_id = None."""
    raw_email = """From: random.person@unknown.com
To: collections@merchant.com
Subject: General Query Regarding Services
Date: Sat, 22 Aug 2026 10:00:00 +0530

Hello, could you please send your latest company catalogue?

Best,
Random Person
"""
    parsed = InboundMIMEParser.parse_raw_rfc822(raw_email)

    assert parsed.matched_invoice_id is None
