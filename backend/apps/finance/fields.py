import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models

logger = logging.getLogger(__name__)

_PREFIX = "enc::"


def _get_fernet() -> Fernet:
    key = getattr(settings, "PLAID_ENCRYPTION_KEY", None)
    if not key:
        raise ImproperlyConfigured("PLAID_ENCRYPTION_KEY must be configured for Plaid token encryption")
    if isinstance(key, str):
        key = key.encode()
    try:
        return Fernet(key)
    except Exception as exc:  # pragma: no cover - defensive guard for misconfigured keys
        raise ImproperlyConfigured("PLAID_ENCRYPTION_KEY is invalid") from exc


def _encrypt(value: str) -> str:
    fernet = _get_fernet()
    token = fernet.encrypt(value.encode()).decode()
    return f"{_PREFIX}{token}"


def _decrypt(value: str) -> str:
    if not value:
        return value
    if not value.startswith(_PREFIX):
        # value is likely still plaintext (pre-migration). Leave untouched.
        return value
    token = value[len(_PREFIX):]
    fernet = _get_fernet()
    try:
        return fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt Plaid access token; returning stored value for safety")
        return value


class EncryptedTextField(models.TextField):
    """TextField that transparently encrypts/decrypts values using Fernet."""

    description = "TextField encrypted with application-managed Fernet key"

    def from_db_value(self, value: Optional[str], expression, connection):
        if value is None:
            return value
        return _decrypt(value)

    def to_python(self, value):
        if value is None:
            return value
        if isinstance(value, str):
            # Values loaded from DB should already be decrypted by from_db_value, but
            # Django calls to_python in a few additional scenarios (forms, fixtures).
            return _decrypt(value)
        return value

    def get_prep_value(self, value):
        if value is None:
            return value
        if not isinstance(value, str):
            value = str(value)
        if value.startswith(_PREFIX):
            # Already encrypted (e.g., coming directly from fixtures).
            return value
        return _encrypt(value)

    def value_to_string(self, obj):
        raw_value = self.value_from_object(obj)
        return self.get_prep_value(raw_value) if raw_value is not None else None
