"""Optional real-COG regional analysis service; empty catalog returns unavailable.

Deploy separately with COG_CATALOG pointing to a verified JSON coverage manifest.
Raster URLs come exclusively from the trusted server catalog, never request input.
"""
import json, os, math
from pathlib import Path
from functools import lru_cache
from typing import Literal
import numpy as np
import rasterio
from rasterio.windows import Window
from scipy.ndimage import uniform_filter
from pyproj import CRS, Transformer
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app=FastAPI(title='TerraMatch verified lunar COG analysis')
MOON='+proj=longlat +R=1737400 +no_defs'
CATALOG_PATH=Path(os.environ.get('COG_CATALOG',Path(__file__).with_name('catalog.example.json')))

class Region(BaseModel):
    lat:float=Field(ge=-90,le=90)
    lon:float=Field(ge=-180,le=360)
    radius_km:float=Field(ge=5,le=150)
    spacing_m:float=Field(ge=5,le=10000)

@lru_cache(maxsize=1)
def catalog():
    entries=json.loads(CATALOG_PATH.read_text())
    required={'id','url','bounds','resolution_m','source','acquired','scale','offset'}
    if any(not required.issubset(x) for x in entries):raise RuntimeError('Incomplete source provenance')
    return entries

def contains(bounds,lat,lon):
    west,south,east,north=bounds
    return south<=lat<=north and (west<=lon<=east if west<=east else lon>=west or lon<=east)

@app.get('/coverage')
def coverage(lat:float=0,lon:float=0):
    if not(-90<=lat<=90 and -180<=lon<=360):raise HTTPException(422,'Invalid lunar coordinate')
    lo=(lon+180)%360-180
    # Center overlap is an index lookup, not proof of full region coverage.
    found=[{k:v for k,v in e.items() if k!='url'} for e in catalog() if contains(e['bounds'],lat,lo)]
    return {'center_overlap':found,'full_region_coverage':'determined during extraction','missing':[] if found else ['regional/local elevation']}

@app.post('/analyze')
def analyze(region:Region):
    lo=(region.lon+180)%360-180
    entries=sorted((e for e in catalog() if contains(e['bounds'],region.lat,lo)),key=lambda e:e['resolution_m'])
    if not entries:raise HTTPException(404,'No verified regional/local COG covers this center. Global frontend baseline remains available.')
    entry=entries[0];spacing=max(region.spacing_m,entry['resolution_m'])
    half=math.floor(region.radius_km*1000/spacing)
    if half*2+1>301:raise HTTPException(413,'Request fewer cells or queue a background job.')
    local=CRS.from_proj4(f'+proj=aeqd +lat_0={region.lat} +lon_0={lo} +R=1737400 +units=m +no_defs')
    axis=np.arange(-half,half+1)*spacing
    x,y=np.meshgrid(axis,axis[::-1])
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
        with rasterio.open(entry['url']) as src:
            if src.crs is None:raise HTTPException(422,'COG has no declared planetary CRS.')
            transform=Transformer.from_crs(local,src.crs,always_xy=True)
            sx,sy=transform.transform(x,y)
            rows,cols=rasterio.transform.rowcol(src.transform,sx.ravel(),sy.ravel())
            rows=np.asarray(rows);cols=np.asarray(cols)
            inside=(rows>=0)&(rows<src.height)&(cols>=0)&(cols<src.width)
            if not inside.all():raise HTTPException(422,'COG does not cover the full window. Use a larger baseline product.')
            r0,r1=int(rows.min()),int(rows.max());c0,c1=int(cols.min()),int(cols.max())
            if (r1-r0+1)*(c1-c0+1)>10000000:raise HTTPException(413,'Projected window too large for synchronous extraction.')
            data=src.read(1,window=Window(c0,r0,c1-c0+1,r1-r0+1),masked=True)
            sample=data[rows-r0,cols-c0]
            if np.ma.getmaskarray(sample).any():raise HTTPException(422,'Window intersects source no-data. Unavailable values were not filled.')
            z=(sample.astype(float)*entry['scale']+entry['offset']).reshape(x.shape)
    gy,gx=np.gradient(z,spacing);slope=np.degrees(np.arctan(np.hypot(gx,gy)))
    a=np.column_stack([x.ravel(),y.ravel(),np.ones(z.size)]);plane=(a@np.linalg.lstsq(a,z.ravel(),rcond=None)[0]).reshape(z.shape)
    tri=np.sqrt(np.mean([(np.roll(z,(dy,dx),(0,1))[1:-1,1:-1]-z[1:-1,1:-1])**2 for dy in [-1,0,1] for dx in [-1,0,1] if dx or dy],axis=0))
    # Thermal/geology/hazards intentionally absent without their own validated products.
    m={'min':float(z.min()),'max':float(z.max()),'mean':float(z.mean()),'median':float(np.median(z)),'std':float(z.std()),'relief':float(np.ptp(z)),'slope':float(slope.mean()),'maxSlope':float(slope.max()),'roughness':float(np.sqrt(np.mean((z-plane)**2))),'ruggedness':float(tri.mean())}
    return {'source':{k:v for k,v in entry.items() if k!='url'},'effective_spacing_m':spacing,'coverage_percent':100,'metrics':m,'profile':z[half].tolist(),'missing':['thermal','mineralogy','illumination','validated hazards'],'uncertainty':'Not quantified; consult source metadata','limits':'Nearest-neighbor extraction on lunar spherical AEQD grid. No inference below source resolution.'}
