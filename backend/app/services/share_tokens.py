"""HMAC-signed share tokens for read-only public layout links.

Token format: ``b64u(payload).b64u(hmac_sha256(payload))`` where payload is
``"{layout_id}.{int(expires_at.timestamp())}"``. The raw token rides in the URL.
The DB stores only ``sha256(token).hex()`` so a DB leak does not yield valid
tokens.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime


class InvalidToken(Exception):
    """Token has been tampered with, is malformed, or has expired."""


@dataclass(frozen=True)
class SignedToken:
    layout_id: str
    expires_at: datetime


def _b64u_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _b64u_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _mac(payload: bytes, secret: str) -> bytes:
    return hmac.new(secret.encode(), payload, hashlib.sha256).digest()


def sign(layout_id: str, expires_at: datetime, secret: str) -> str:
    if not secret:
        raise InvalidToken("share token secret not configured")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    payload = f"{layout_id}.{int(expires_at.timestamp())}".encode()
    sig = _mac(payload, secret)
    return f"{_b64u_encode(payload)}.{_b64u_encode(sig)}"


def verify(token: str, secret: str) -> SignedToken:
    if not secret:
        raise InvalidToken("share token secret not configured")
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        payload = _b64u_decode(payload_b64)
        sig = _b64u_decode(sig_b64)
    except (ValueError, base64.binascii.Error) as e:  # type: ignore[attr-defined]
        raise InvalidToken("malformed token") from e

    expected = _mac(payload, secret)
    if not hmac.compare_digest(sig, expected):
        raise InvalidToken("bad signature")

    try:
        layout_id, exp_str = payload.decode("utf-8").split(".", 1)
        expires_at = datetime.fromtimestamp(int(exp_str), tz=UTC)
    except (UnicodeDecodeError, ValueError) as e:
        raise InvalidToken("malformed payload") from e

    if datetime.now(UTC) >= expires_at:
        raise InvalidToken("expired")

    return SignedToken(layout_id=layout_id, expires_at=expires_at)


def token_hash(token: str) -> str:
    """Stable lookup key for storage. Never store the raw token."""
    return hashlib.sha256(token.encode()).hexdigest()


def random_secret() -> str:
    """Helper for one-time secret generation in dev/scripts."""
    return secrets.token_urlsafe(48)
