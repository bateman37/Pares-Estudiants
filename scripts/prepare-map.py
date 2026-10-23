import json,pathlib,math,unicodedata
root=pathlib.Path(__file__).resolve().parents[1];d=root/'data'
def load(name):return json.loads((d/(name+'.geojson')).read_text())['features']
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
def coords(g):
 if g['type']=='Polygon':return g['coordinates']
 if g['type']=='MultiPolygon':return [r for p in g['coordinates'] for r in p]
 if g['type']=='LineString':return [g['coordinates']]
 if g['type']=='MultiLineString':return g['coordinates']
 if g['type']=='Point':return [[g['coordinates']]]
 return []
def simplify(points,eps=.025):
 if len(points)<4:return points
 a,b=points[0],points[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
 best=-1;idx=0
 for i,p in enumerate(points[1:-1],1):
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  dst=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2
  if dst>best:best=dst;idx=i
 if best>eps*eps:return simplify(points[:idx+1],eps)[:-1]+simplify(points[idx:],eps)
 return [a,b]
def clip(poly,box):
 pts=poly[:-1] if poly and poly[0]==poly[-1] else poly
 for axis,value,sign in [(0,box[0],1),(0,box[2],-1),(1,box[1],1),(1,box[3],-1)]:
  result=[]
  if not pts:return []
  prev=pts[-1];inside_prev=(prev[axis]-value)*sign>=0
  for cur in pts:
   inside_cur=(cur[axis]-value)*sign>=0
   if inside_cur!=inside_prev:
    t=(value-prev[axis])/(cur[axis]-prev[axis]);result.append([prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])])
   if inside_cur:result.append(cur)
   prev=cur;inside_prev=inside_cur
  pts=result
 return pts+[pts[0]] if len(pts)>2 else []
def tidy(p):return [[round(x,3),round(y,3)] for x,y,*_ in simplify(p)]
box=[-190,-60,-15,85];land=[]
for f in load('ne_10m_land'):
 g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 for poly in polys:
  for shift in [0,-360]:
   outer=[[x+shift,y] for x,y,*_ in poly[0]]
   if max(p[0] for p in outer)<box[0] or min(p[0] for p in outer)>box[2] or max(p[1] for p in outer)<box[1]:continue
   rings=[]
   for ring in poly:
    r=clip([[x+shift,y] for x,y,*_ in ring],box)
    if r:rings.append(tidy(r))
   if rings:land.append(rings)
places=json.loads((d/'places.json').read_text())
for p in places:
 if 'fixAnchor' in p:p['anchor']=p.pop('fixAnchor')
fixes={
 'rockies':['ROCKY MOUNTAINS'],'appalachians':['APPALACHIAN MTS.'],'guiana':['GUIANA HIGHLANDS'],'chihuahua':['CHIHUAHUAN DESERT'],'atacama':['DESIERTO DE ATACAMA'],
 'labrador':['LABRADOR'],'yucatan':['PEN. DE YUCATÁN'],'bahamas':['BAHAMA ISLANDS'],'falklands':['West Falkland','East Falkland'],
 'california-gulf':['Golfo de California'],'maracaibo':['Lago de Maracaibo']}
regions=load('ne_10m_geography_regions_polys');marine=load('ne_10m_geography_marine_polys');lakes=load('ne_10m_lakes');rivers=load('ne_10m_rivers_lake_centerlines')
report=[]
for p in places:
 names={norm(n) for n in fixes.get(p['id'],p.get('ne',[]))}
 sources=rivers if p['kind']=='river' else lakes+marine if p['kind']=='lake' else marine if p['kind'] in ['sea','strait'] else regions
 found=[]
 for f in sources:
  pr=f['properties'];name=pr.get('name') or pr.get('NAME') or ''
  if norm(name) not in names:continue
  cc=coords(f['geometry'])
  # Rivers with the same name exist elsewhere. Retain only the requested continent/region.
  points=[v for line in cc for v in line];meanx=sum(v[0] for v in points)/len(points);meany=sum(v[1] for v in points)/len(points)
  if not(-185<meanx<-20 and -58<meany<85):continue
  if p['region']=='north' and meany<5:continue
  if p['region']=='south' and meany>14:continue
  found.append(f)
 if found:
  geometries=[]
  for f in found:
   g=f['geometry'];lines=[tidy(c) for c in coords(g)];geometries.append({'type':g['type'],'parts':lines})
  p['geometry']=geometries
  p['source']='Natural Earth 1:10m'
 else:p['source']='Coordenada de referència / extensió escolar esquemàtica'
 report.append({'id':p['id'],'name':p['name'],'matches':[f['properties'].get('name',f['properties'].get('NAME')) for f in found],'anchor':p['anchor']})
# Only inland water in the Americas; background rivers from the syllabus.
background_lakes=[]
for f in lakes:
 cc=coords(f['geometry']);points=[v for line in cc for v in line]
 if points and -172<points[0][0]<-35 and -56<points[0][1]<83:
  background_lakes.extend([tidy(c) for c in cc])
# Maracaibo is represented as a coastal lagoon in the marine layer.
for f in marine:
 if f['properties']['name']=='Lago de Maracaibo':background_lakes.extend([tidy(c) for c in coords(f['geometry'])])
result={'land':land,'lakes':background_lakes,'places':places,'version':'1.0.0','source':'Natural Earth 1:10m — public domain'}
(root/'src/map-data.js').write_text('const ATLAS_DATA = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
(d/'places.json').write_text(json.dumps(places,ensure_ascii=False,indent=2)+'\n')
(d/'geography-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('places',len(places),'land polygons',len(land),'lake rings',len(background_lakes),'bytes',(root/'src/map-data.js').stat().st_size)
for r in report:print(r['id'],':',','.join(r['matches']) or 'coordinate / schematic extent')
