#!/usr/bin/env python3
"""
tools/simulate_attacks.py
Adversarial attack simulator entrypoint.
Calls the comprehensive attack suite in tests/adversarial/run_adversarial.py.
"""
import os
import sys
from pathlib import Path

os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.adversarial.run_adversarial import run_adversarial_suite

if __name__ == "__main__":
    passed = run_adversarial_suite()
    sys.exit(0 if passed else 1)
