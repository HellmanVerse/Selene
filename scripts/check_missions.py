YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíëÓ¢Ö¥¢ëiºÙbë5import json,hashlib
from pathlib import Path
import numpy as np
from prepare_data import destination,metrics
root=Path(__file__).resolve().parents[1]
raw=(root/'data/raw/ldem_16.img').read_bytes()
meta=json.loads((root/'data/lola-metadata.json').read_text())
assert hashlib.sha256(raw).hexdigest()==mãí¢G§²ÚîÆ­yÔ profile'],'limits':'Validation establishes consistency with LDEM_16, not independent ground truth, landing-scale accuracy or completeness of optional scientific layers.','results':summary},indent=2))
print('PASS: all 18 cases agree with independent NumPy extraction and terrain calculations.')

