from datetime import UTC, datetime, timedelta

import pytest

from app.services import share_tokens
from app.services.share_tokens import InvalidToken

SECRET = "test-secret-do-not-use"


def test_sign_verify_roundtrip() -> None:
    exp = datetime.now(UTC) + timedelta(days=30)
    token = share_tokens.sign("layout-123", exp, SECRET)
    decoded = share_tokens.verify(token, SECRET)
    assert decoded.layout_id == "layout-123"
    assert int(decoded.expires_at.timestamp()) == int(exp.timestamp())


def test_verify_tampered_signature_raises() -> None:
    exp = datetime.now(UTC) + timedelta(days=30)
    token = share_tokens.sign("layout-1", exp, SECRET)
    # flip a char in the signature half
    payload, sig = token.split(".", 1)
    tampered = f"{payload}.{'A' if not sig.startswith('A') else 'B'}{sig[1:]}"
    with pytest.raises(InvalidToken):
        share_tokens.verify(tampered, SECRET)


def test_verify_wrong_secret_raises() -> None:
    exp = datetime.now(UTC) + timedelta(days=30)
    token = share_tokens.sign("layout-1", exp, SECRET)
    with pytest.raises(InvalidToken):
        share_tokens.verify(token, "different-secret")


def test_verify_expired_raises() -> None:
    exp = datetime.now(UTC) - timedelta(seconds=1)
    token = share_tokens.sign("layout-1", exp, SECRET)
    with pytest.raises(InvalidToken):
        share_tokens.verify(token, SECRET)


def test_verify_malformed_raises() -> None:
    with pytest.raises(InvalidToken):
        share_tokens.verify("not-a-token", SECRET)


def test_token_hash_deterministic() -> None:
    a = share_tokens.token_hash("hello")
    b = share_tokens.token_hash("hello")
    c = share_tokens.token_hash("world")
    assert a == b
    assert a != c
    assert len(a) == 64  # sha256 hex


def test_empty_secret_rejected() -> None:
    with pytest.raises(InvalidToken):
        share_tokens.sign("layout-1", datetime.now(UTC) + timedelta(days=1), "")
    with pytest.raises(InvalidToken):
        share_tokens.verify("a.b", "")
