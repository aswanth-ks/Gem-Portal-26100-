"""Provider-agnostic error types. Both Ollama and Gemini clients raise these
(or subclasses of these) so the callers (analyze.py, propose_rule.py) never
need to know which provider is active."""

from __future__ import annotations


class ProviderUnavailableError(Exception):
    """The active AI provider isn't reachable, misconfigured, or rejected the
    request (e.g. missing/invalid API key)."""


class ProviderTimeoutError(Exception):
    """The active AI provider didn't respond within its configured timeout."""
