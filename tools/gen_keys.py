#!/usr/bin/env python3
"""
tools/gen_keys.py
Generates an Ed25519 signing keypair for Community Scam Map licence issuance.
The private key is stored outside the repo in ~/.scammap/scammap_ed25519.key.
The public key is printed and can be embedded in app/core/license.py.
"""

import base64
from pathlib import Path
from nacl.signing import SigningKey

KEY_DIR = Path.home() / ".scammap"
KEY_DIR.mkdir(parents=True, exist_ok=True)
KEY_FILE = KEY_DIR / "scammap_ed25519.key"

def generate_keys():
    signing_key = SigningKey.generate()
    verify_key = signing_key.verify_key

    priv_b64 = base64.b64encode(signing_key.encode()).decode("utf-8")
    pub_b64 = base64.b64encode(verify_key.encode()).decode("utf-8")

    with open(KEY_FILE, "w", encoding="utf-8") as f:
        f.write(priv_b64)

    print(f"[+] Private key saved securely outside repository at:\n    {KEY_FILE}")
    print(f"[+] Public Key (Base64) to embed in code:\n    {pub_b64}")
    return pub_b64

if __name__ == "__main__":
    generate_keys()
