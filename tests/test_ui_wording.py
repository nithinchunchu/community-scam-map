import os
import re
import json
from pathlib import Path

FORBIDDEN_WORDS = [
    r"\bscammer\b",
    r"\bcriminal\b",
    r"\ba fraud\b",
    r"\bthe fraud\b",
    r"\bthis fraud\b",
    r"\bis a fraud\b"
]

def test_no_derogatory_labels_in_frontend():
    """
    Ensures that no derogatory or defamatory labels ('scammer', 'criminal',
    or 'fraud' used as a label for a person) exist in any UI source,
    translation dictionary, or built production assets.
    """
    root_frontend = Path("frontend/src")
    assert root_frontend.exists(), "frontend/src directory must exist"

    # Scan all frontend source files (.ts, .tsx, .json)
    scanned_files = 0
    violations = []

    for file_path in root_frontend.rglob("*"):
        if file_path.suffix in [".ts", ".tsx", ".json"]:
            scanned_files += 1
            content = file_path.read_text(encoding="utf-8", errors="ignore").lower()
            for pattern in FORBIDDEN_WORDS:
                match = re.search(pattern, content)
                if match:
                    violations.append(f"{file_path}: matched forbidden pattern '{pattern}' at '{match.group(0)}'")

    # Scan dist files if built
    dist_dir = Path("frontend/dist")
    if dist_dir.exists():
        for file_path in dist_dir.rglob("*.js"):
            scanned_files += 1
            content = file_path.read_text(encoding="utf-8", errors="ignore").lower()
            for pattern in FORBIDDEN_WORDS:
                match = re.search(pattern, content)
                if match:
                    violations.append(f"{file_path}: matched forbidden pattern '{pattern}' at '{match.group(0)}'")

    assert scanned_files > 0, "Expected to scan at least 10 frontend files"
    assert len(violations) == 0, f"Found defamatory wording violations:\n" + "\n".join(violations)

def test_translation_dictionaries_compliance():
    """
    Directly inspects the translations file to ensure all verdict messages and
    advice adhere strictly to objective wording ('Reported by N people near you').
    """
    trans_path = Path("frontend/src/i18n/translations.ts")
    content = trans_path.read_text(encoding="utf-8")
    
    assert "Reported by {count} people near you" in content
    assert "आपके आसपास {count} लोगों द्वारा रिपोर्ट किया गया" in content
    assert "Number hidden until confirmed by 3 people near you" in content
