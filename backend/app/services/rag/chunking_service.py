import re
from ...config import get_settings

settings = get_settings()


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    return re.sub(r"[ \t]+", " ", re.sub(r"\r\n?", "\n", text)).strip()


def chunk_text(text: str, size: int | None = None, overlap: int | None = None) -> list[str]:
    """Chunk by words (a conservative token approximation) without splitting storage metadata."""
    words = clean_text(text).split()
    size, overlap = size or settings.rag_chunk_size, overlap if overlap is not None else settings.rag_chunk_overlap
    if not words:
        return []
    step = max(1, size - overlap)
    return [" ".join(words[start:start + size]) for start in range(0, len(words), step) if words[start:start + size]]
