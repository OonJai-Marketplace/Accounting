"""Compatibility entry point for the canonical manifest builder.

The former segment copier overwrote deliberate bundled/standalone variants.
All runtime changes now originate in src/; the builder preserves their order.
"""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
if __name__ == '__main__':
    if sys.argv[1:]:
        print('Legacy segment names are ignored; rebuilding canonical manifest outputs.')
    subprocess.run([sys.executable, str(root / 'tools/build-modules.py')], check=True)
