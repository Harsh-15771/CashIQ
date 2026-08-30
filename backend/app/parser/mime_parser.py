import re
import email
from email import policy
from email.parser import Parser
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field


class ParsedEmail(BaseModel):
    from_address: str
    from_name: Optional[str] = None
    to_address: Optional[str] = None
    subject: str
    date_header: Optional[str] = None
    in_reply_to: Optional[str] = None
    message_id: Optional[str] = None
    clean_body: str
    raw_body: str
    matched_invoice_id: Optional[str] = None


class InboundMIMEParser:
    """
    RFC 822 and Inbound Webhook Email Parser.
    Extracts headers, cleans thread history/signatures, and matches invoice IDs via regex.
    """

    # Regex patterns for matching invoice references in subject or body
    INVOICE_PATTERNS = [
        re.compile(r"(INV[-\s]?\d{4}[-\s]?\d{2,6})", re.IGNORECASE),
        re.compile(r"invoice\s*#?\s*([A-Za-z0-9-_]{4,15})", re.IGNORECASE),
        re.compile(r"bill\s*#?\s*([A-Za-z0-9-_]{4,15})", re.IGNORECASE),
        re.compile(r"rzp\.io/i/([A-Za-z0-9-_]+)", re.IGNORECASE),
    ]

    # Signature delimiter regexes
    SIGNATURE_PATTERNS = [
        re.compile(r"\n--\s*\n.*", re.DOTALL),
        re.compile(r"\n(Thanks\s*(&|and)?\s*Regards|Warm\s*Regards|Best\s*Regards|Sincerely|Cheers)[\s\S]*$", re.IGNORECASE),
        re.compile(r"\nSent from my (iPhone|Android|Galaxy|iPad)[\s\S]*$", re.IGNORECASE),
    ]

    # Quoted reply patterns
    QUOTED_REPLY_PATTERNS = [
        re.compile(r"\nOn\s+.+wrote:\s*[\s\S]*$", re.IGNORECASE),
        re.compile(r"\n-{3,}\s*Original Message\s*-{3,}[\s\S]*$", re.IGNORECASE),
        re.compile(r"\nFrom:\s*.+\nSent:\s*.+\nTo:\s*.+[\s\S]*$", re.IGNORECASE),
    ]

    @classmethod
    def parse_raw_rfc822(cls, raw_email_str: str) -> ParsedEmail:
        """Parses a standard RFC 822 .eml string into a structured ParsedEmail object."""
        msg = Parser(policy=policy.default).parsestr(raw_email_str)

        from_hdr = str(msg.get("From", ""))
        to_hdr = str(msg.get("To", ""))
        subject = str(msg.get("Subject", ""))
        date_hdr = str(msg.get("Date", ""))
        in_reply_to = str(msg.get("In-Reply-To", ""))
        message_id = str(msg.get("Message-ID", ""))

        # Extract name and email address from header
        from_name, from_email = cls._extract_name_and_email(from_hdr)

        # Extract plain text body
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    body = part.get_content()
                    break
        else:
            body = msg.get_content()

        clean_body = cls.clean_email_body(body)
        matched_inv = cls.extract_invoice_id(subject + " " + clean_body)

        return ParsedEmail(
            from_address=from_email,
            from_name=from_name,
            to_address=to_hdr,
            subject=subject,
            date_header=date_hdr,
            in_reply_to=in_reply_to,
            message_id=message_id,
            clean_body=clean_body,
            raw_body=body,
            matched_invoice_id=matched_inv,
        )

    @classmethod
    def parse_webhook_payload(cls, payload: Dict[str, Any]) -> ParsedEmail:
        """
        Parses standard webhook JSON from SendGrid / Postmark / Inbound Webhook.
        Expected keys: 'from', 'to', 'subject', 'text' / 'body', optional 'headers'.
        """
        from_hdr = payload.get("from", payload.get("sender", ""))
        from_name, from_email = cls._extract_name_and_email(from_hdr)
        to_hdr = payload.get("to", payload.get("recipient", ""))
        subject = payload.get("subject", "")
        raw_body = payload.get("text", payload.get("body", payload.get("html", "")))

        clean_body = cls.clean_email_body(raw_body)
        matched_inv = cls.extract_invoice_id(subject + " " + clean_body)

        return ParsedEmail(
            from_address=from_email,
            from_name=from_name,
            to_address=to_hdr,
            subject=subject,
            date_header=payload.get("date"),
            clean_body=clean_body,
            raw_body=raw_body,
            matched_invoice_id=matched_inv,
        )

    @classmethod
    def clean_email_body(cls, text: str) -> str:
        """Strips quoted replies, signatures, and excess whitespace."""
        if not text:
            return ""

        cleaned = text.replace("\r\n", "\n")

        # 1. Remove Quoted Replies
        for pattern in cls.QUOTED_REPLY_PATTERNS:
            cleaned = pattern.sub("", cleaned)

        # 2. Remove Signatures
        for pattern in cls.SIGNATURE_PATTERNS:
            cleaned = pattern.sub("", cleaned)

        # 3. Strip quote prefixes like >
        lines = [line.lstrip("> ").strip() for line in cleaned.split("\n") if line.strip()]
        return "\n".join(lines).strip()

    @classmethod
    def extract_invoice_id(cls, text: str) -> Optional[str]:
        """Scans text for invoice references and normalizes to standard uppercase format."""
        for pattern in cls.INVOICE_PATTERNS:
            match = pattern.search(text)
            if match:
                raw_id = match.group(1).strip().upper()
                # Normalize formatting e.g. "INV 2026 001" -> "INV-2026-001"
                normalized = re.sub(r"[\s_]+", "-", raw_id)
                if not normalized.startswith("INV-") and not normalized.startswith("RZP"):
                    normalized = f"INV-{normalized}"
                return normalized
        return None

    @classmethod
    def _extract_name_and_email(cls, header_val: str) -> Tuple[Optional[str], str]:
        match = re.search(r"(?:(.*)<)?([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)>?", header_val)
        if match:
            name = match.group(1).strip().strip('"\'') if match.group(1) else None
            email_addr = match.group(2).strip().lower()
            return name, email_addr
        return None, header_val.strip().lower()
