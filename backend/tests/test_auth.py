"""
Tests for the Authentication system.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from app.auth.jwt import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        pwd = "foodbridge123"
        hashed = hash_password(pwd)
        assert hashed != pwd
        assert verify_password(pwd, hashed) is True

    def test_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False


class TestJWT:
    def test_access_token(self):
        token = create_access_token({"sub": "1", "role": "donor"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["type"] == "access"

    def test_refresh_token(self):
        token = create_refresh_token({"sub": "2", "role": "driver"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "2"
        assert payload["type"] == "refresh"

    def test_invalid_token(self):
        result = decode_token("invalid.token.here")
        assert result is None
