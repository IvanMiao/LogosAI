import hashlib
from collections import OrderedDict

from llm.agent import TextAnalysisLangchain

_MAX_CACHED_AGENTS = 8
_agent_cache: OrderedDict[tuple[str, str], TextAnalysisLangchain] = OrderedDict()


def get_agent(api_key: str, model: str) -> TextAnalysisLangchain:
    """Return a cached agent or create a new one.

    Cache is keyed on (sha256(api_key), model) so raw keys are never stored.
    """
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    cache_key = (key_hash, model)

    if cache_key in _agent_cache:
        _agent_cache.move_to_end(cache_key)
        return _agent_cache[cache_key]

    agent = TextAnalysisLangchain(gemini_key=api_key, model=model)
    _agent_cache[cache_key] = agent

    while len(_agent_cache) > _MAX_CACHED_AGENTS:
        _agent_cache.popitem(last=False)

    return agent
