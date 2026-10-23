import urllib.request,json,pathlib,concurrent.futures,time
base=pathlib.Path(__file__).resolve().parents[1]/'data'
names=['ne_10m_land','ne_10m_rivers_lake_centerlines','ne_10m_lakes','ne_10m_geography_regions_polys','ne_10m_geography_regions_points','ne_10m_geography_marine_polys']
def get(name):
 p=base/(name+'.geojson')
 if p.exists(): return name,p.stat().st_size
 url='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'+name+'.geojson'
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=45) as r: data=r.read()
   json.loads(data);p.write_bytes(data);return name,len(data)
  except Exception as e:
   if attempt==2:return name,str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for out in pool.map(get,names):print(out,flush=True)
