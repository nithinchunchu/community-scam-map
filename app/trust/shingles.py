import re
import zlib
from typing import Set, Dict, Any

def extract_note_features(note: str | None) -> Dict[str, Any]:
    """
    Extracts privacy-preserving note features:
    - length
    - is_empty
    - set of CRC32-hashed character 4-grams (shingles)
    The raw text is never stored in the database!
    """
    if not note or not note.strip():
        return {
            "length": 0,
            "is_empty": True,
            "shingles": []
        }

    cleaned = " ".join(note.strip().lower().split())
    length = len(cleaned)

    shingles: Set[int] = set()
    if length < 4:
        # For very short notes (< 4 chars), hash the entire token
        shingles.add(zlib.crc32(cleaned.encode("utf-8")))
    else:
        for i in range(length - 3):
            gram = cleaned[i : i + 4]
            shingles.add(zlib.crc32(gram.encode("utf-8")))

    return {
        "length": length,
        "is_empty": False,
        "shingles": list(shingles)
    }


def jaccard_similarity(shingles_a: Set[int] | list, shingles_b: Set[int] | list) -> float:
    """
    Computes Jaccard similarity between two sets of 4-gram shingles.
    Empty notes are neutral (real victims often write nothing): they share 0 shingles
    and are never treated as duplicate copy-pastes.
    """
    set_a = set(shingles_a)
    set_b = set(shingles_b)

    if not set_a or not set_b:
        return 0.0  # Empty notes are neutral; only non-empty notes can be duplicates

    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    if union == 0:
        return 0.0
    return intersection / union
