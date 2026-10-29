"""Reproducible NASA ingestion and broad Earth screening. No generated terrain."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request, json, hashlib, gzip, math, io, time
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw'
RAW.mkdir(parents=True, exist_ok=True)
DATA = ROOT / 'data'
PUBLIC = ROOT / 'public'
BASE = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/'

def download(url, path):
    if path.exists(): return path.read_bytes()
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=90) as r: body = r.read()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
            return body
        except Exception:
            if attempt == 3: raise
            time.sleep(attempt+1)

def destination(lat, lon, east, north, radius):
    d = np.hypot(east,north) / radius
    bearing = np.arctan2(east,north)
    p = math.radians(lat)
    la = np.arcsin(np.clip(np.sin(p)*np.cos(d)+np.cos(p)*np.sin(d)*np.cos(bearing),-1,1))
    lo = math.radians(lon) + np.arctan2(np.sin(bearing)*np.sin(d)*np.cos(p),np.cos(d)-np.sin(p)*np.sin(la))
    return np.degrees(la), ((np.degrees(lo)+180)%360)-180

def metrics(z, spacing):
    gy,gx = np.gradient(z,spacing)
    slopes = np.degrees(np.arctan(np.hypot(gx,gy)))
    # RMS residual from a best-fit plane: regional roughness, not grain size.
    yy,xx = np.indices(z.shape)
    a = np.column_stack([xx.ravel(),yy.ravel(),np.ones(z.size)])
    plane = (a @ np.linalg.lstsq(a,z.ravel(),rcond=None)[0]).reshape(z.shape)
    neighbors = [np.roll(z,(dy,dx),(0,1)) for dy,dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]]
    tri = np.sqrt(np.mean([(n[1:-1,1:-1]-z[1:-1,1:-1])**2 for n in neighbors],axis=0))
    hist,_ = np.histogram(slopes,bins=[0,1,2,5,10,20,90])
    return dict(min=float(z.min()),max=float(z.max()),mean=float(z.mean()),median=float(np.median(z)),std=float(z.std()),relief=float(np.ptp(z)),slope=float(slopes.mean()),maxSlope=float(slopes.max()),roughness=float(np.sqrt(np.mean((z-plane)**2))),ruggedness=float(tri.mean()),histogram=hist.tolist(),profile=z[z.shape[0]//2].tolist())

def in_ring(lon,lat,ring):
    inside=False
    j=len(ring)-1
    for i in range(len(ring)):
        xi,yi=ring[i][:2]; xj,yj=ring[j][:2]
        if (yi>lat)!=(yj>lat) and lon<(xj-xi)*(lat-yi)/(yj-yi)+xi: inside=not inside
        j=i
    return inside

def run():
    body=download(BASE+'ldem_16.img',RAW/'ldem_16.img')
    assert len(body)==5760*2880*2, 'Unexpected NASA raster size'
    label=download(BASE+'ldem_16.lbl',RAW/'ldem_16.lbl')
    assert b'SCALING_FACTOR        = 0.5' in label and b'LSB_INTEGER' in label
    (DATA/'ldem_16.lbl').write_bytes(label)
    arr=np.frombuffer(body,dtype='<i2').reshape(2880,5760)
    assert arr.min() > -32768, 'Missing-data sentinel detected; investigate before serving'
    (DATA/'lola').mkdir(exist_ok=True)
    for band in range(18):
        (DATA/'lola'/f'{band}.bin.gz').write_bytes(gzip.compress(arr[band*160:(band+1)*160].tobytes(),mtime=0))
    (DATA/'lola-metadata.json').write_text(json.dumps(dict(product='LDEM_16',version='3.1',sha256=hashlib.sha256(body).hexdigest(),bytes=len(body),rows=2880,columns=5760,pixelsPerDegree=16,scale=0.5,radius=1737400,coverage=[-90,0,90,360],acquired=['2009-07-13','2016-11-29'],created='2019-03-15',validCells=int(arr.size),totalCells=int(arr.size),min=float(arr.min()/2),max=float(arr.max()/2),source=BASE+'ldem_16.img')),encoding='utf-8')
    download('https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg',PUBLIC/'moon.jpg')
    download('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',PUBLIC/'earth.jpg')
    countries=json.loads(download('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',RAW/'countries.json'))
    lands=[]
    for f in countries['features']:
        geom=f['geometry']; p=f['properties']
        polygons=geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
        for poly in polygons:
            ring=poly[0]; xs=[x[0] for x in ring]; ys=[x[1] for x in ring]
            lands.append((min(xs),min(ys),max(xs),max(ys),poly,p.get('ADMIN',p.get('NAME','Earth'))))
    candidates=[]
    for lat in range(-65,81,5):
        for lon in np.arange(-177.5,180,5):
            for w,s,e,n,poly,name in lands:
                if w<=lon<=e and s<=lat<=n and in_ring(lon,lat,poly[0]) and not any(in_ring(lon,lat,hole) for hole in poly[1:]):
                    candidates.append(dict(lat=lat,lon=float(lon),name=f'{name} · {abs(lat)}°{"N" if lat>=0 else "S"}, {abs(lon)}°{"E" if lon>=0 else "W"}',catalog=False))
                    break
    # Familiar reference locations augment, but never bound, the global lattice.
    for name,lat,lon in [('Haughton impact structure',75.383,-89.667),('Atacama Desert',-24.5,-69.25),('Mauna Kea',19.82,-155.47),('Lanzarote',29.03,-13.63),('Nördlinger Ries',48.88,10.58),('Lonar crater',19.976,76.509),('Tenerife',28.27,-16.64),('Wolfe Creek',-19.172,127.795),('Iceland · Askja',65.03,-16.75),('Death Valley',36.25,-116.82)]:
        candidates.append(dict(name=name,lat=lat,lon=lon,catalog=True))
    # Fixed 10 km evaluation spacing across both bodies prevents resolution-driven ranking.
    grids={}
    needed=set()
    for radius in [50,100,150]:
        axis=np.arange(-radius*1000,radius*1000+1,10000)
        xx,yy=np.meshgrid(axis,axis)
        for idx,c in enumerate(candidates):
            la,lo=destination(c['lat'],c['lon'],xx,yy,6371008.8)
            px=(lo+180)/360*4096
            py=(1-np.arcsinh(np.tan(np.radians(la)))/np.pi)/2*4096
            tx=np.floor(px/256).astype(int)%16; ty=np.clip(np.floor(py/256).astype(int),0,15)
            needed.update(zip(tx.ravel().tolist(),ty.ravel().tolist()))
            grids[(idx,radius)]=(tx,ty,np.floor(px).astype(int)%256,np.floor(py).astype(int)%256)
    def tile(pair):
        x,y=pair
        blob=download(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/4/{x}/{y}.png',RAW/'earth'/f'{x}_{y}.png')
        rgb=np.asarray(Image.open(io.BytesIO(blob))).astype(float)
        return pair,rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
    with ThreadPoolExecutor(max_workers=12) as pool: tiles=dict(pool.map(tile,sorted(needed)))
    print(f'Downloaded {len(tiles)} tiles; screening {len(candidates)} land regions',flush=True)
    for idx,c in enumerate(candidates):
        c['metrics']={}
        for radius in [50,100,150]:
            tx,ty,px,py=grids[(idx,radius)]
            z=np.array([tiles[(int(a),int(b))][int(d),int(e)] for a,b,e,d in zip(tx.ravel(),ty.ravel(),px.ravel(),py.ravel())]).reshape(tx.shape)
            m=metrics(z,10000)
            c['metrics'][str(radius)]={k:([round(v,3) for v in val] if isinstance(val,list) else round(val,5)) for k,val in m.items()}
        c['resolution']=round(40075016.686/4096*math.cos(math.radians(c['lat'])))
    (DATA/'earth-candidates.json').write_text(json.dumps(candidates,separators=(',',':')),encoding='utf-8')
    (DATA/'earth-metadata.json').write_text(json.dumps(dict(source='Mapzen Terrain Tiles (mixed-source composite)',tileZoom=4,screeningSpacingKm=5*111.2,sampleSpacingM=10000,radiiKm=[50,100,150],regions=len(candidates),tiles=len(tiles),acquisitionDates='Not supplied per tile; mixed source vintages',retrieved='2026-10-29',limits='5-degree land lattice, -65 to 80 latitude; not an exhaustive land search. Coastal windows may include ocean; no environment, access, material or geological validation.',url='https://registry.opendata.aws/terrain-tiles/')),encoding='utf-8')
    print('Prepared genuine NASA lunar coverage and measured Earth terrain index.',flush=True)

if __name__=='__main__': run()
