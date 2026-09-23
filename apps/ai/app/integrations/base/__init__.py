"""Shared integration interface/contract types.

Each concrete integration (digilocker, gem, government, consent) implements
this contract. For the demo, integrations should provide mock adapters and
must not hard-code credentials — read from app.core.config settings.
"""
