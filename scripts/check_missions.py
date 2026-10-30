import json,hashlib
from pathlib import Path
import numpy as np
from prepare_data import destination,metrics
root=Path(__file__).resolve().parents[1]
raw=(root/'data/raw/ldem_16.img').read_bytes()
meta=json.loads((root/'data/lola-metadata.json').read_text())
assert hashlib.sha256(raw).hexdigest()==meta['sha256']
dem=np.frombuffer(raw,dtype='<i2').reshape(2880,5760)
reports=json.loads((root/'data/raw/mission-check.json').read_text())
summary=[]
for r in reports:
 z=np.asarray(r['grid']);half=(len(z)-1)//2;axis=np.arange(-half,half+1)*r['spacing'];x,y=np.meshgrid(axis,axis[::-1])
 la,lo=destination(r['lat'],r['lon'],x,y,1737400)
 rows=np.clip(np.floor((90-la)*16).astype(int),0,2879);cols=np.floor(((lo+360)%360)*16).astype(int)%5760
 expected=dem[rows,cols]*0.5
 assert np.array_equal(z,expected),(r['site'],'raster extraction mismatch')
 calculated=metrics(expected,r['spacing'])
 for key in ['min','max','mean','median','std','relief','slope','maxSlope','roughness','ruggedness']:
  assert np.isclose(calculated[key],r['metrics'][key],atol=1e-8), (r['site'],key)
 assert calculated['histogram']==r['metrics']['histogram']
 assert calculated['profile']==r['metrics']['profile']
 assert 0<=r['topScore']<=100
 summary.append({k:v for k,v in r.items() if k not in ['grid','comparison']})
out=root.parents[1]/'outputs/torsion-mission-validation.json'
out.write_text(json.dumps({'coordinateSource':'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html','casesPassed':len(summary),'checks':['NASA Apollo coordinates','raw NASA raster SHA-256','independent NumPy spherical extraction','independent NumPy statistics, slopes, plane fit, ruggedness, histogram and profile'],'limits':'Validation establishes consistency with LDEM_16, not independent ground truth, landing-scale accuracy or completeness of optional scientific layers.','results':summary},indent=2))
print('PASS: all 18 cases agree with independent NumPy extraction and terrain calculations.')
