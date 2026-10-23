(() => {
'use strict';
const C=AtlasCore,D=ATLAS_DATA,places=D.places,byId=Object.fromEntries(places.map(p=>[p.id,p]));
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='atles-america-v1',categories=[...new Set(places.map(p=>p.category))];
let saved={},storageOK=true;
try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};}catch{saved={};storageOK=false;}
let records=Array.isArray(saved.records)?saved.records.filter(r=>r&&['exam','contest'].includes(r.mode)&&Number.isFinite(r.elapsed)&&typeof r.name==='string'&&r.config&&typeof r.key==='string').slice(-500):[];
let learned=new Set(Array.isArray(saved.learned)?saved.learned.filter(id=>byId[id]):[]),alias=typeof saved.alias==='string'?saved.alias.slice(0,24):'Exploradora';
let mode='explore',selected='rockies',studyRegion='all',studyCategory='all',studySearch='',view='north',zoom=1,center=null,game=null,lastResults=null,rankMode='exam',rankKey='',toastTimer;
const previousOrders={};
const VIEWS={
 all:{label:'Tota Amèrica',box:[-190,-58,-15,84]},
 north:{label:'Nord i Centre',box:[-180,5,-17,84]},
 south:{label:'Sud',box:[-95,-58,-28,14]},
 caribbean:{label:'Carib',box:[-92,7,-57,29]},
 arctic:{label:'Àrtic canadenc',box:[-135,65,-75,81]},
 alaska:{label:'Alaska i Aleutianes',box:[-188,48,-128,72]},
 galapagos:{label:'Galápagos',box:[-94,-4,-86,3]},
 pacific:{label:'Pascua · Pacífic',box:[-116,-38,-67,-16]}
};
const svgCache={};
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({records,learned:[...learned],alias,lastConfig:saved.lastConfig}));storageOK=true;}catch{storageOK=false;}return storageOK;}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function modal(html){$('#dialog-content').innerHTML=`<button class="dialog-close" aria-label="Tanca">×</button><div class="dialog-body">${html}</div>`;$('#dialog').showModal();$('.dialog-close').onclick=()=>$('#dialog').close();}
function setView(id){view=id;zoom=1;center=null;renderMap();}
function defaultView(p){return p.view||(p.region==='south'?'south':'north');}
function anchor(p,v=view){
 if(p.id==='atlantic')return v==='south'?[-36,-23]:v==='all'?[-37,5]:[-38,37];
 if(p.id==='pacific')return v==='south'?[-88,-26]:v==='all'?[-122,1]:[-140,26];
 return p.anchor;
}
function projection(v=view){
 const box=VIEWS[v].box,cos=Math.cos((box[1]+box[3])/2*Math.PI/180),pad=37,w=1000,h=760;
 const s=Math.min((w-pad*2)/((box[2]-box[0])*cos),(h-pad*2)/(box[3]-box[1]));
 const ox=(w-(box[2]-box[0])*cos*s)/2,oy=(h-(box[3]-box[1])*s)/2;
 return xy=>[ox+(xy[0]-box[0])*cos*s,oy+(box[3]-xy[1])*s];
}
function path(coords,project,closed=false){return coords.map((xy,i)=>{const p=project(xy);return `${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;}).join('')+(closed?'Z':'');}
function geom(p,project){
 if(p.geometry)return p.geometry.map(g=>({closed:!g.type.includes('Line'),parts:g.parts}));
 if(p.lines)return [{closed:false,parts:p.lines}];
 if(p.shape)return [{closed:['area','island','lake','sea'].includes(p.kind),parts:[p.shape,...(p.extraLines||[])]}];
 return [];
}
function feature(p,project,active=true){
 const cls=['river'].includes(p.kind)?'river':['strait','line','mountain'].includes(p.kind)&&!p.geometry?'linear':['sea','lake','strait'].includes(p.kind)?'water':'terrestrial';
 const landClip=['area','island','mountain'].includes(p.kind)?' clip-path="url(#land-clip)"':'';
 if(p.kind==='point'||['arctic','atlantic','pacific'].includes(p.id))return '';
 return geom(p,project).map(g=>`<path d="${g.parts.map(part=>path(part,project,g.closed)).join('')}" class="feature-path ${cls}"${landClip}/>`).join('');
}
function buildBase(v){
 if(svgCache[v])return svgCache[v];
 const pr=projection(v);let land=D.land.map(poly=>poly.map(r=>path(r,pr,true)).join('')).join('');
 let s=`<defs><path id="land-shape" d="${land}" fill-rule="evenodd"/><clipPath id="land-clip"><use href="#land-shape"/></clipPath><clipPath id="scene-clip"><rect width="1000" height="760"/></clipPath></defs><rect class="ocean" width="1000" height="760"/>`;
 let grid='';for(let lon=-180;lon<=-20;lon+=20)grid+=path([[lon,-60],[lon,85]],pr);for(let lat=-60;lat<=80;lat+=20)grid+=path([[-190,lat],[-15,lat]],pr);
 s+=`<path class="graticule" d="${grid}"/><use href="#land-shape" class="land-path" fill-rule="evenodd"/>`;
 s+=`<g clip-path="url(#land-clip)">${places.filter(p=>['mountain','area'].includes(p.kind)&&p.geometry&&['Serralades i massissos','Deserts','Planes'].includes(p.category)).map(p=>geom(p,pr).map(g=>`<path class="${p.category==='Deserts'?'desert-bg':'relief-bg'}" d="${g.parts.map(r=>path(r,pr,true)).join('')}"/>`).join('')).join('')}</g>`;
 s+=`<path class="lake-path" d="${D.lakes.map(r=>path(r,pr,true)).join('')}"/>`;
 s+=places.filter(p=>p.kind==='river').map(p=>geom(p,pr).map(g=>`<path class="river-bg" d="${g.parts.map(r=>path(r,pr)).join('')}"/>`).join('')).join('');
 if(v==='all'||v==='south'||v==='galapagos'){const y=pr([-50,0])[1];s+=`<path d="M0,${y}H1000" stroke="#a6beb4" stroke-dasharray="6 7" stroke-width="1"/><text x="22" y="${y-8}" fill="#8ca398" font-size="11">0°</text>`;}
 svgCache[v]=s;return s;
}
function mapShell(){return `<section class="map-card" aria-label="Mapa interactiu d'Amèrica"><div class="map-toolbar"><div class="view-tabs" aria-label="Vista del mapa">${['all','north','south'].map(v=>`<button data-view="${v}">${VIEWS[v].label}</button>`).join('')}</div><div class="map-tools"><button id="zoom-out" aria-label="Allunya el mapa">−</button><button id="zoom-in" aria-label="Apropa el mapa">+</button><button id="zoom-reset" aria-label="Restableix el mapa">⌖</button></div></div><div class="subviews" aria-label="Ampliacions">${['caribbean','arctic','alaska','galapagos','pacific'].map(v=>`<button data-view="${v}">${VIEWS[v].label}</button>`).join('')}</div><div class="map-scene" id="map-scene"></div><div class="map-legend"><span><i class="legend-dot"></i><span id="marker-legend">Element seleccionat</span></span><span><i class="legend-line"></i>Rius del temari</span><span>Costes i illes · Natural Earth</span></div></section>`;}
function mapEvents(){
 $$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
 $('#zoom-in').onclick=()=>{zoom=Math.min(6,zoom*1.4);renderMap();};
 $('#zoom-out').onclick=()=>{zoom=Math.max(1,zoom/1.4);if(zoom===1)center=null;renderMap();};
 $('#zoom-reset').onclick=()=>{zoom=1;center=null;renderMap();};
 renderMap();
}
function visible(p){const b=VIEWS[view].box,a=anchor(p);return a[0]>=b[0]&&a[0]<=b[2]&&a[1]>=b[1]&&a[1]<=b[3];}
function activePlace(){return mode==='explore'?byId[selected]:game?game.questions[mode==='exam'?game.active:game.index]:null;}
function renderMap(){
 const node=$('#map-scene');if(!node)return;
 const pr=projection(),active=activePlace(),exam=mode==='exam',finding=mode==='contest'&&game.config.answerMode==='locate'&&!game.feedback;
 const centerPoint=center||((zoom>1&&active&&visible(active))?pr(anchor(active)):[500,380]);
 const vb=[centerPoint[0]-500/zoom,centerPoint[1]-380/zoom,1000/zoom,760/zoom];
 let s=`<svg viewBox="${vb.join(' ')}" role="group" aria-label="${esc(VIEWS[view].label)}. ${exam?'Llocs numerats de l’examen':mode==='explore'?'Selecciona un lloc per explorar-lo':'Identifica el lloc assenyalat'}" id="atlas-map">${buildBase(view)}<g clip-path="url(#scene-clip)">`;
 if(active&&!finding)s+=feature(active,pr);
 const pins=exam?game.questions:mode==='explore'?C.pool(places,studyRegion,studyCategory):finding?game.options:active?[active]:[];
 const used=[];
 pins.forEach((p,i)=>{
  if(!visible(p))return;const a=pr(anchor(p)),isActive=p.id===active?.id;
  if(mode==='explore'&&!isActive){s+=`<g class="map-marker study-pin" role="button" tabindex="0" data-place="${p.id}" aria-label="${esc(p.name)}"><title>${esc(p.name)}</title><circle cx="${a[0]}" cy="${a[1]}" r="5" style="fill:#a6ba9b;stroke-width:1.5"/></g>`;return;}
  let label=exam?i+1:finding?String.fromCharCode(65+i):mode==='explore'?'':game.index+1;
  let x=a[0],y=a[1]-24;
  if(exam||finding){for(let attempts=0;attempts<18&&used.some(q=>Math.hypot(q[0]-x,q[1]-y)<35);attempts++){y+=attempts%2?30:-45;x+=attempts%2?23:-10;}}
  x=Math.max(24,Math.min(976,x));y=Math.max(24,Math.min(734,y));used.push([x,y]);
  const canName=mode==='explore',aria=exam?`Lloc ${i+1}`:finding?`Punt ${label}`:canName?p.name:`Lloc ${game.index+1}`;
  s+=`<g class="map-marker ${isActive&&!finding?'active':''}" role="button" tabindex="0" data-place="${p.id}"${exam?` data-exam="${i}"`:''}${finding?` data-option="${p.id}"`:''} aria-label="${esc(aria)}"><title>${esc(aria)}</title><path class="marker-stem" d="M${a[0]},${a[1]}L${x},${y}"/><circle cx="${x}" cy="${y}" r="${mode==='explore'?10:17}"/><text x="${x}" y="${y}">${label}</text><circle cx="${a[0]}" cy="${a[1]}" r="4" class="map-target"/></g>`;
 });
 if(finding&&game.picked){const a=pr(anchor(byId[game.picked]));s+=`<circle cx="${a[0]}" cy="${a[1]}" r="23" fill="none" stroke="#e46e48" stroke-width="3"/>`;}
 if(!finding&&active&&visible(active)){const a=pr(anchor(active));s+=`<circle class="map-target-ring" cx="${a[0]}" cy="${a[1]}" r="15"/>`;}
 if(mode==='explore'&&['all','north','south'].includes(view)){
 const names=view==='south'?[[[-89,-26],'PACÍFIC'],[[-37,-23],'ATLÀNTIC']]:view==='north'?[[[-142,28],'PACÍFIC'],[[-40,37],'ATLÀNTIC']]:[[[-135,0],'PACÍFIC'],[[-40,8],'ATLÀNTIC']];
 names.forEach(([xy,name])=>{let a=pr(xy);s+=`<text class="map-label" x="${a[0]}" y="${a[1]}" text-anchor="middle">${name}</text>`;});
 }
 s+=`</g><g class="compass" transform="translate(${vb[0]+vb[2]-42/zoom} ${vb[1]+48/zoom}) scale(${1/zoom})"><text text-anchor="middle" y="-15">N</text><path d="M0,-8 L-6,12 L0,8 L6,12Z"/></g></svg><div class="map-note">${esc(VIEWS[view].label)} · Projecció cilíndrica equidistant<br>Les zones de relleu tenen límits orientatius.</div>`;
 node.innerHTML=s;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $('#marker-legend').textContent=exam?'Toca un número per respondre':finding?'Tria el punt correcte':mode==='explore'?'Toca un punt per descobrir-lo':'Identifica el lloc destacat';
 $$('#map-scene [data-place]').forEach(b=>{
  const fn=()=>{if(exam)selectExam(+b.dataset.exam);else if(finding)chooseLocation(b.dataset.option);else if(mode==='explore')chooseStudy(b.dataset.place);};
  b.addEventListener('click',fn);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});
 });
 // Drag to pan when zoomed. All selection remains available through the lists and keyboard.
 const svg=$('#atlas-map');let drag=null,dragged=false;
 svg.addEventListener('pointerdown',e=>{if(zoom<=1||e.target.closest('[data-place]'))return;drag={x:e.clientX,y:e.clientY,c:[...centerPoint]};dragged=false;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect();const dx=(e.clientX-drag.x)*vb[2]/r.width,dy=(e.clientY-drag.y)*vb[3]/r.height;if(Math.abs(dx)+Math.abs(dy)>3)dragged=true;center=[drag.c[0]-dx,drag.c[1]-dy];svg.setAttribute('viewBox',`${center[0]-500/zoom} ${center[1]-380/zoom} ${1000/zoom} ${760/zoom}`);});
 svg.addEventListener('pointerup',()=>{if(drag){drag=null;renderMap();}});
}
function navHighlight(){ $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(mode==='results'?lastResults.mode:mode))); }
function renderExplore(){
 mode='explore';game=null;navHighlight();
 $('#app').className='explore-page';$('#app').innerHTML=`<section class="hero"><div><div class="eyebrow">Geografia · 1r d’ESO</div><h1>Amèrica, <em>punt a punt.</em></h1><p>Descobreix el mapa. Posa’t a prova. Supera la teva millor marca.</p></div><div class="hero-aside"><span class="round-icon">◎</span><div class="hero-count">61<span>llocs per descobrir</span></div><span class="round-icon">↗</span><div class="hero-count">15<span>reptes a cada examen</span></div></div></section><div class="workspace">${mapShell()}<aside class="side-card"><div class="side-title"><h3>El teu atles</h3><span class="tag">Explora</span></div><div class="search-wrap"><span aria-hidden="true">⌕</span><input id="place-search" type="search" aria-label="Cerca un lloc" placeholder="Quin lloc vols descobrir?" value="${esc(studySearch)}"></div><select id="study-region" class="study-category" aria-label="Zona d'estudi"><option value="all">Tota Amèrica</option><option value="north">Nord, Centre i Carib</option><option value="south">Amèrica del Sud</option></select><select id="study-category" class="study-category" aria-label="Tipus d'element"><option value="all">Tots els elements</option>${categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select><div class="place-list" id="place-list"></div><div id="feature-info"></div><div class="learning-progress" id="learning-progress"></div></aside></div><div class="start-banner"><div><h3>El següent destí? La teva millor marca.</h3><p>Preguntes aleatòries, tres pistes i molt per descobrir.</p></div><button class="btn primary" id="banner-start">Comença el concurs <span>↗</span></button></div>`;
 $('#study-region').value=studyRegion;$('#study-category').value=studyCategory;
 $('#place-search').oninput=e=>{studySearch=e.target.value;renderStudyList();};
 $('#study-region').onchange=e=>{studyRegion=e.target.value;setView(studyRegion==='all'?'all':studyRegion);renderStudyList();};
 $('#study-category').onchange=e=>{studyCategory=e.target.value;renderStudyList();renderMap();};
 $('#banner-start').onclick=()=>setup('contest');renderStudyList();renderInfo();mapEvents();
}
function renderStudyList(){
 const list=C.pool(places,studyRegion,studyCategory).filter(p=>C.normalize(p.name+' '+p.aliases.join(' ')).includes(C.normalize(studySearch)));
 $('#place-list').innerHTML=list.length?list.map(p=>`<button class="place-item ${p.id===selected?'active':''}" data-study="${p.id}"><span class="place-index">${p.sheet}${p.id==='aconcagua'?'b':''}</span><span>${esc(p.name)}</span>${learned.has(p.id)?'<span class="done" aria-label="Repasat">✓</span>':''}</button>`).join(''):'<p class="no-results">No hi ha cap lloc amb aquest nom.</p>';
 $$('[data-study]').forEach(b=>b.onclick=()=>chooseStudy(b.dataset.study));
}
function chooseStudy(id){selected=id;view=defaultView(byId[id]);zoom=1;center=null;renderStudyList();renderInfo();renderMap();}
function renderInfo(){const p=byId[selected];$('#feature-info').innerHTML=`<div class="feature-info"><span class="tag">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.memory)}</p><div class="feature-actions"><button class="tiny-btn primary" id="learn-btn">${learned.has(p.id)?'✓ Repasat':'Marca com a repassat'}</button><button class="tiny-btn" id="focus-btn">⌖ Apropa</button></div></div>`;$('#learn-btn').onclick=()=>{learned.has(p.id)?learned.delete(p.id):learned.add(p.id);persist();renderInfo();renderStudyList();};$('#focus-btn').onclick=()=>{view=defaultView(p);center=projection()(anchor(p));zoom=p.view?1:2;renderMap();};$('#learning-progress').textContent=`${learned.size} de 61 llocs repassats en aquest dispositiu`;}
function setup(which){
 const conf=saved.lastConfig&&typeof saved.lastConfig==='object'?saved.lastConfig:{};
 modal(`<div class="eyebrow">${which==='exam'?'El teu simulacre':'Una nova expedició'}</div><h2>${which==='exam'?'15 llocs. Tot per descobrir.':'Preparada per al repte?'}</h2><p>${which==='exam'?'Un mapa mut, quinze noms de memòria. La nota es corregeix quan entregues.':'Cada partida canvia: nous llocs, nou ordre i tres pistes per ajudar-te.'}</p><form id="setup-form"><div class="form-field"><label for="player-name">Nom de l’exploradora o explorador</label><input id="player-name" name="player" maxlength="24" required value="${esc(alias)}" autocomplete="nickname"></div><div class="form-grid"><div class="form-field"><label for="setup-region">Zona</label><select id="setup-region"><option value="all">Tota Amèrica</option><option value="north">Nord, Centre i Carib</option><option value="south">Amèrica del Sud</option></select></div><div class="form-field"><label for="setup-category">Elements</label><select id="setup-category"><option value="all">Tots els elements</option>${categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div></div>${which==='contest'?`<div class="form-grid"><div class="form-field"><label for="setup-count">Preguntes</label><select id="setup-count"><option value="15">15 preguntes</option><option value="30">30 preguntes</option><option value="61">Tot el temari</option></select></div><div class="form-field"><label for="setup-answer">Com vols respondre?</label><select id="setup-answer"><option value="write">Escriure el nom</option><option value="choice">Triar entre 4 noms</option><option value="locate">Localitzar al mapa</option></select></div></div><label class="check-line"><input type="checkbox" id="setup-strict"><span><strong>Repte perfecte</strong><br>Un error acaba la partida. Pots tornar a començar amb un ordre nou.</span></label>`:''}<div class="setup-description" id="setup-description"></div><button class="btn dark wide setup-submit" type="submit">${which==='exam'?'Comença l’examen':'Comença el concurs'} <span>↗</span></button></form>`);
 if(['all','north','south'].includes(conf.region))$('#setup-region').value=conf.region;if(categories.includes(conf.category))$('#setup-category').value=conf.category;
 const update=()=>{const n=C.pool(places,$('#setup-region').value,$('#setup-category').value).length,requested=which==='exam'?15:+$('#setup-count').value,count=Math.min(n,requested);$('#setup-description').innerHTML=which==='exam'?`${n} llocs disponibles. <strong>${n>=15?'15 preguntes aleatòries · sense pistes.':'Tria una zona o categoria amb almenys 15 llocs.'}</strong><br>Rànquing: més encerts i, en cas d’empat, menys temps.`:`${n} llocs disponibles. Partida de <strong>${count} preguntes sense repetir</strong>.<br>10 punts per encert; cada pista resta 3 punts a aquella resposta. Tres pistes per partida.`;$('#setup-form button[type="submit"]').disabled=n<1||(which==='exam'&&n<15);};
 $('#setup-region').onchange=update;$('#setup-category').onchange=update;if(which==='contest')$('#setup-count').onchange=update;update();
 $('#setup-form').onsubmit=e=>{e.preventDefault();alias=$('#player-name').value.trim().slice(0,24)||'Exploradora';const config={region:$('#setup-region').value,category:$('#setup-category').value,count:which==='exam'?15:Math.min(+$('#setup-count').value,C.pool(places,$('#setup-region').value,$('#setup-category').value).length),answerMode:which==='exam'?'write':$('#setup-answer').value,strict:which==='contest'&&$('#setup-strict').checked};saved.lastConfig=config;$('#dialog').close();startGame(which,config);};
}
function startGame(which,config,customPool=null){
 const eligible=customPool||C.pool(places,config.region,config.category),key=which+'|'+C.boardKey(config),q=C.questions(eligible,config.count,previousOrders[key]);previousOrders[key]=q.map(p=>p.id).join(',');
 mode=which;game={mode:which,config:{...config,count:q.length},questions:q,index:0,active:0,answers:{},attempts:[],started:performance.now(),date:new Date().toISOString(),score:0,correct:0,hints:0,qHints:0,feedback:null,options:[],picked:null,practice:!!customPool};
 persist();view=config.region==='south'?'south':config.region==='north'?'north':'all';zoom=1;center=null;navHighlight();
 if(which==='contest')prepareQuestion();renderGame();
}
function prepareQuestion(){
 const p=game.questions[game.index];game.qHints=0;game.feedback=null;game.picked=null;
 let eligible=C.pool(places,game.config.region,'all').filter(x=>x.id!==p.id);
 if(game.config.answerMode==='locate'){
  let preferred=defaultView(p);
  if(['galapagos','arctic'].includes(preferred))preferred=p.region==='south'?'south':'north';
  // Show all four choices in one real geographic view. Nearby choices remain useful distractors.
  const b=VIEWS[preferred].box,inView=x=>{const a=anchor(x,preferred);return a[0]>b[0]&&a[0]<b[2]&&a[1]>b[1]&&a[1]<b[3];};
  eligible=places.filter(x=>x.id!==p.id&&inView(x));
  const same=eligible.filter(x=>x.category===p.category);eligible=[...C.shuffle(same),...C.shuffle(eligible.filter(x=>x.category!==p.category))];
  game.options=C.shuffle([p,...eligible.slice(0,3)]);view=preferred;
 }else{const same=eligible.filter(x=>x.category===p.category);eligible=[...C.shuffle(same),...C.shuffle(eligible.filter(x=>x.category!==p.category))];game.options=C.shuffle([p,...eligible.slice(0,3)]);view=defaultView(p);}
 zoom=1;center=null;
}
function gameHero(){return `<section class="hero"><div class="game-header"><button class="back-btn" id="exit-game" aria-label="Surt de la partida">←</button><div><div class="eyebrow">${mode==='exam'?'Simulacre · 15 llocs':game.practice?'Repàs dels errors':game.config.strict?'Concurs · repte perfecte':'Concurs · nova expedició'}</div><h1>${mode==='exam'?'Demostra què saps.':'Un lloc, un descobriment.'}</h1></div></div><div class="hero-controls"><span class="tag">${esc(alias)}</span></div></section>`;}
function renderGame(){
 $('#app').className='game-page';$('#app').innerHTML=`${gameHero()}<div class="workspace">${mapShell()}<aside class="side-card" id="game-sidebar"></aside></div>`;
 $('#exit-game').onclick=()=>leaveGame(renderExplore);mapEvents();renderGameSidebar();
}
function elapsed(){return game?performance.now()-game.started:0;}
function renderGameSidebar(){if(!game)return;mode==='exam'?renderExamSidebar():renderContestSidebar();}
function renderContestSidebar(){
 const p=game.questions[game.index],f=game.feedback,answerMode=game.config.answerMode;
 $('#game-sidebar').innerHTML=`<div class="stat-row"><div class="stat"><strong>${game.score}</strong><span>punts</span></div><div class="stat"><strong id="timer">${C.time(elapsed())}</strong><span>temps</span></div><div class="stat"><strong>${3-game.hints}</strong><span>pistes</span></div></div><div class="question-count"><span>Pregunta ${game.index+1} de ${game.questions.length}</span><span>${game.correct} ${game.correct===1?'encert':'encerts'}</span></div><div class="progress"><span style="width:${game.index/game.questions.length*100}%"></span></div><div class="question-number">${esc(p.category)}</div><h2 class="question-title">${answerMode==='locate'?`On és ${esc(p.name)}?`:'Quin lloc està assenyalat?'}</h2><p class="question-sub">${answerMode==='locate'?'Tria la lletra del mapa que correspon a aquest lloc.':answerMode==='choice'?'Mira el lloc destacat i tria el nom correcte.':'Escriu el nom del lloc destacat. Pots ometre les tildes.'}</p>${!f?(answerMode==='write'?`<form id="answer-form"><label class="question-sub" for="contest-answer">La teva resposta</label><input id="contest-answer" class="answer-input" placeholder="Escriu el nom…" autocomplete="off" autocapitalize="off" spellcheck="false" required><button class="btn dark wide" type="submit">Comprova <span>→</span></button></form>`:answerMode==='choice'?`<div class="option-list">${game.options.map((x,i)=>`<button class="option-btn" data-choice="${x.id}">${String.fromCharCode(65+i)}. ${esc(x.name)}</button>`).join('')}</div>`:`<div class="map-find-message">Toca una lletra al mapa o fes servir aquests botons.</div><div class="option-list">${game.options.map((x,i)=>`<button class="option-btn" data-location="${x.id}">Punt ${String.fromCharCode(65+i)}</button>`).join('')}</div>`)+`<button id="hint-btn" class="hint-btn" ${game.hints>=3?'disabled':''}>✧ Demana una pista · ${3-game.hints} disponibles</button>${game.qHints?`<div class="hint-box">${esc(hintText(p,game.qHints))}</div>`:''}<button class="skip-btn" id="skip-btn">No ho sé · mostra la resposta</button>`:`<div class="feedback ${f.correct?'':'error'}" role="status"><strong>${f.correct?`Molt bé! +${f.points} ${f.points===1?'punt':'punts'}`:'Aquest lloc era…'}</strong><div class="correct-name">${esc(p.name)}</div><span>${esc(p.memory)}</span>${!f.correct&&f.answer?`<small><br>Has respost: ${esc(f.answer)}</small>`:''}</div><button class="btn ${!f.correct&&game.config.strict?'orange':'dark'} wide" id="next-btn">${!f.correct&&game.config.strict?'Veure resultat':game.index===game.questions.length-1?'Acaba i mira el resultat':'Següent lloc →'}</button>`}`;
 if(!f){
  if($('#answer-form'))$('#answer-form').onsubmit=e=>{e.preventDefault();submitContest($('#contest-answer').value);};
  $$('[data-choice]').forEach(b=>b.onclick=()=>submitContest(byId[b.dataset.choice].name,b.dataset.choice));
  $$('[data-location]').forEach(b=>b.onclick=()=>chooseLocation(b.dataset.location));
  $('#hint-btn').onclick=()=>{const current=$('#contest-answer')?.value||'';if(game.hints>=3)return;game.hints++;game.qHints++;renderContestSidebar();if($('#contest-answer'))$('#contest-answer').value=current;};
  $('#skip-btn').onclick=()=>submitContest('');
 }else $('#next-btn').onclick=()=>{if((!f.correct&&game.config.strict)||game.index===game.questions.length-1)finishContest();else{game.index++;prepareQuestion();renderContestSidebar();renderMap();}};
}
function hintText(p,n){
 if(game.config.answerMode==='locate'){
  if(n===1)return p.hint;
  if(n===2){const a=anchor(p);return `${p.hint} Referència: ${Math.abs(a[1]).toFixed(0)}° ${a[1]>=0?'N':'S'} i ${Math.abs(a[0]).toFixed(0)}° O.`;}
  return `El punt correcte és ${String.fromCharCode(65+game.options.findIndex(x=>x.id===p.id))}. ${p.hint}`;
 }
 if(n===1)return p.hint;if(n===2)return `${p.hint} El nom comença per «${p.name.split(' ')[0]}».`;return `${p.hint} El nom és: ${p.name}.`;
}
function chooseLocation(id){if(mode!=='contest'||game.feedback)return;const index=game.options.findIndex(p=>p.id===id);submitContest(`Punt ${String.fromCharCode(65+index)}`,id);}
function submitContest(answer,picked=null){
 if(!game||game.feedback)return;const p=game.questions[game.index],correct=picked?picked===p.id:C.accepts(p,answer),points=C.points(correct,game.qHints);
 game.score+=points;if(correct)game.correct++;
 game.feedback={correct,answer,points};game.picked=picked;game.answers[p.id]=answer;
 game.attempts.push({id:p.id,name:p.name,answer,correct,hints:game.qHints,points});renderContestSidebar();renderMap();
}
function renderExamSidebar(){
 const filled=game.questions.filter(p=>(game.answers[p.id]||'').trim()).length;
 $('#game-sidebar').innerHTML=`<div class="side-title"><h3>Les teves respostes</h3><span class="tag">Examen</span></div><div class="stat-row"><div class="stat"><strong>${filled}/15</strong><span>respostes</span></div><div class="stat"><strong id="timer">${C.time(elapsed())}</strong><span>temps</span></div></div><p class="exam-help">Cada número correspon al punt indicat per la seva línia. Toca’l per destacar l’element. Pots canviar de vista i rectificar fins que entreguis.</p><div class="exam-list">${game.questions.map((p,i)=>`<div class="exam-row ${i===game.active?'active':''}"><button data-number="${i}" aria-label="Situa el lloc ${i+1}">${i+1}</button><input data-answer="${p.id}" data-index="${i}" aria-label="Resposta ${i+1}" placeholder="Lloc ${i+1}" value="${esc(game.answers[p.id]||'')}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>`).join('')}</div><div class="exam-bottom"><p>15 llocs aleatoris · Sense pistes<br>Més encerts i menys temps = millor posició.</p><button class="btn dark wide" id="finish-exam">Entrega l’examen <span>↗</span></button></div>`;
 $$('[data-number]').forEach(b=>b.onclick=()=>selectExam(+b.dataset.number));
 $$('[data-answer]').forEach(input=>{
  input.oninput=()=>{game.answers[input.dataset.answer]=input.value;const n=game.questions.filter(p=>(game.answers[p.id]||'').trim()).length;$('#game-sidebar .stat strong').textContent=`${n}/15`;};
  input.onfocus=()=>{game.active=+input.dataset.index;$$('.exam-row').forEach((r,i)=>r.classList.toggle('active',i===game.active));renderMap();};
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const next=+input.dataset.index+1;if(next<game.questions.length)selectExam(next);else $('#finish-exam').focus();}};
 });
 $('#finish-exam').onclick=()=>{
 const missing=game.questions.filter(p=>!(game.answers[p.id]||'').trim()).length;
 if(missing){modal(`<div class="eyebrow">Abans d’entregar</div><h2>Et queden ${missing} ${missing===1?'lloc':'llocs'}.</h2><p>Les respostes en blanc comptaran com a error. El temps continua corrent mentre decideixes.</p><div class="result-actions"><button id="keep-exam" class="btn dark wide">Continua l’examen</button><button id="submit-anyway" class="btn outline wide">Entrega igualment</button></div>`);$('#keep-exam').onclick=()=>$('#dialog').close();$('#submit-anyway').onclick=()=>{$('#dialog').close();finishExam();};}else finishExam();};
}
function selectExam(index){game.active=index;view=defaultView(game.questions[index]);zoom=1;center=null;$$('.exam-row').forEach((r,i)=>r.classList.toggle('active',i===index));const input=$(`[data-answer="${game.questions[index].id}"]`);input.focus({preventScroll:true});input.scrollIntoView({block:'nearest',behavior:'smooth'});renderMap();}
function finishExam(){const review=C.evaluate(game.questions,game.answers),correct=review.filter(r=>r.correct).length;finish({review,correct,score:correct,hints:0,completed:true});}
function finishContest(){finish({review:game.attempts,correct:game.correct,score:game.score,hints:game.hints,completed:game.attempts.length===game.questions.length});}
function finish(result){
 const record={...result,mode:game.mode,name:alias,config:{...game.config},key:C.boardKey(game.config),total:game.questions.length,elapsed:elapsed(),date:new Date().toISOString(),id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),practice:game.practice};
 // Only completed runs and explicitly finished perfect challenges qualify. Practice has no ranking.
 if(!record.practice){records.push(record);records=records.slice(-500);persist();}
 lastResults=record;game=null;mode='results';renderResults();
}
function renderResults(){
 mode='results';navHighlight();const r=lastResults,exam=r.mode==='exam',wrong=r.review.filter(x=>!x.correct),board=records.filter(x=>x.mode===r.mode&&x.key===r.key).sort((a,b)=>C.rank(a,b,r.mode)),position=board.findIndex(x=>x.id===r.id)+1;
 $('#app').className='results-page';$('#app').innerHTML=`<div class="result-hero"><div class="result-icon">${r.correct===r.total?'✦':exam?'✓':'↗'}</div><div class="eyebrow">${r.practice?'Repàs completat':exam?'Examen entregat':r.completed?'Expedició completada':'Repte perfecte finalitzat'}</div><h1>${r.correct===r.total?'Tot el mapa és teu.':r.correct>=r.total*.6?'Cada cop més a prop.':'Cada error és un nou destí.'}</h1><p>${esc(r.name)}, ${exam?'has identificat':'has encertat'} <strong>${r.correct} de ${r.total}</strong> llocs en ${C.time(r.elapsed)}.${!r.practice?` Posició #${position} en aquesta modalitat.`:''}</p></div><div class="results-grid"><section class="result-review" aria-label="Correcció de les respostes">${r.review.map((q,i)=>`<div class="review-row"><span class="${q.correct?'ok':'bad'}">${q.correct?'✓':'×'}</span><div><strong>${esc(q.name)}</strong><small>${q.correct?'Resposta correcta':q.answer?'La teva resposta: '+esc(q.answer):'Sense resposta'}${q.hints?` · ${q.hints} ${q.hints===1?'pista':'pistes'}`:''}</small></div><button data-review="${q.id}">Veure al mapa ↗</button></div>`).join('')}${r.review.length<r.total?`<div class="review-row"><span>—</span><div>${r.total-r.review.length} llocs pendents en acabar el repte.</div></div>`:''}</section><aside class="side-card"><span class="tag">${exam?'La teva nota':'La teva marca'}</span><div class="summary-score">${exam?(r.correct/r.total*10).toFixed(1).replace('.',','):r.score}<span> / ${exam?'10':r.total*10}</span></div><p class="result-details">${r.correct} ${r.correct===1?'encert':'encerts'} · ${C.time(r.elapsed)}<br>${exam?'Sense pistes':r.hints+(r.hints===1?' pista utilitzada':' pistes utilitzades')}<br>${esc(regionLabel(r.config.region))}</p><div class="result-actions"><button class="btn dark wide" id="play-again">${exam?'Un altre examen aleatori':'Torna a jugar · ordre nou'}</button>${wrong.length?'<button class="btn primary wide" id="retry-wrong">Repassa només els errors</button>':''}<button class="btn outline wide" id="see-ranking">Veure el rànquing</button><button class="return-link" id="back-atlas">Torna a explorar el mapa</button></div><p class="storage-note">${storageOK?'Marca guardada en aquest navegador.':'No s’ha pogut guardar la marca en aquest navegador.'}${r.practice?' El repàs no entra al rànquing.':''}</p></aside></div>`;
 $$('[data-review]').forEach(b=>b.onclick=()=>{chooseStudyFromResults(b.dataset.review);});
 $('#play-again').onclick=()=>startGame(r.mode,r.config);
 if($('#retry-wrong'))$('#retry-wrong').onclick=()=>startGame('contest',{...r.config,count:wrong.length,strict:false,answerMode:'write'},wrong.map(x=>byId[x.id]));
 $('#see-ranking').onclick=()=>{rankMode=r.mode;rankKey=r.key;renderRanking();};$('#back-atlas').onclick=renderExplore;
}
function chooseStudyFromResults(id){selected=id;view=defaultView(byId[id]);zoom=1;center=null;studyRegion='all';studyCategory='all';studySearch='';renderExplore();}
function regionLabel(r){return r==='north'?'Nord, Centre i Carib':r==='south'?'Amèrica del Sud':'Tota Amèrica';}
function configLabel(c){return `${regionLabel(c.region)} · ${c.count} · ${c.category==='all'?'Tots els elements':c.category}${c.answerMode==='choice'?' · 4 noms':c.answerMode==='locate'?' · Localitzar':''}${c.strict?' · Perfecte':''}`;}
function renderRanking(){
 mode='ranking';game=null;navHighlight();const options=[...new Map(records.filter(r=>r.mode===rankMode).map(r=>[r.key,r.config])).entries()];
 if(!options.some(([k])=>k===rankKey))rankKey=options[0]?.[0]||'';
 const rows=records.filter(r=>r.mode===rankMode&&r.key===rankKey).sort((a,b)=>C.rank(a,b,rankMode)).slice(0,50);
 $('#app').className='ranking-page';$('#app').innerHTML=`<section class="hero"><div><div class="eyebrow">La teva propera marca t’espera</div><h1>El mapa dels <em>millors.</em></h1><p>Cada intent és una oportunitat per arribar una mica més lluny.</p></div><button class="btn dark" id="ranking-play">Nova partida ↗</button></section><div class="ranking-layout"><section class="ranking-panel"><div class="filter-tabs" aria-label="Tipus de rànquing"><button data-rank-mode="exam" class="${rankMode==='exam'?'active':''}">Examen</button><button data-rank-mode="contest" class="${rankMode==='contest'?'active':''}">Concurs</button></div><div class="ranking-filter"><select id="ranking-config" aria-label="Modalitat de classificació">${options.length?options.map(([k,c])=>`<option value="${esc(k)}">${esc(configLabel(c))}</option>`).join(''):'<option>Encara no hi ha partides</option>'}</select></div>${rows.length?`<table class="rank-table"><thead><tr><th>Pos.</th><th>Explorador/a</th><th>${rankMode==='exam'?'Encerts':'Punts'}</th><th>Temps</th><th>Data</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td><strong>${esc(r.name)}</strong><small>${r.completed?'Partida completada':'Repte interromput per un error'}${rankMode==='contest'?' · '+r.correct+(r.correct===1?' encert':' encerts')+' · '+r.hints+(r.hints===1?' pista':' pistes'):''}</small></td><td><strong>${rankMode==='exam'?`${r.correct}/${r.total}`:r.score}</strong></td><td>${C.time(r.elapsed)}</td><td>${new Date(r.date).toLocaleDateString('ca-ES',{day:'2-digit',month:'short'})}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><span class="empty-icon">♜</span><h3>La primera marca pot ser teva.</h3><p>Completa una partida i inaugura el rànquing.</p></div>'}</section><aside class="side-card rank-side"><h3>Com es puja al podi?</h3><div class="rule-line"><span class="rule-number">1</span><span>${rankMode==='exam'?'Primer compten els encerts. Un 15/15 sempre supera un 14/15.':'Primer compten els punts: 10 per encert, menys 3 per cada pista utilitzada en aquella pregunta.'}</span></div><div class="rule-line"><span class="rule-number">2</span><span>${rankMode==='exam'?'A igualtat d’encerts, guanya qui ha trigat menys temps.':'A igualtat de punts, compten els encerts, menys pistes i, després, el temps.'}</span></div><div class="rule-line"><span class="rule-number">3</span><span>Només es comparen partides amb la mateixa zona, nombre de preguntes i modalitat.</span></div><p class="storage-note">Les marques són locals: es guarden en aquest navegador i dispositiu, sense compte. Pots jugar amb noms diferents. No se sincronitzen entre mòbil i ordinador.</p><button class="tiny-btn" id="export-records">Descarrega les meves marques ↓</button><label class="tiny-btn" style="display:inline-block;cursor:pointer;margin-top:8px">Importa marques ↑<input id="import-records" type="file" accept="application/json,.json" hidden></label><p class="storage-note" id="record-status">${storageOK?'':'El navegador no permet desar dades; les marques només duraran aquesta sessió.'}</p></aside></div>`;
 $('#ranking-config').value=rankKey;$('#ranking-config').onchange=e=>{rankKey=e.target.value;renderRanking();};
 $$('[data-rank-mode]').forEach(b=>b.onclick=()=>{rankMode=b.dataset.rankMode;rankKey='';renderRanking();});
 $('#ranking-play').onclick=()=>setup(rankMode);
 $('#export-records').onclick=()=>{const blob=new Blob([JSON.stringify({app:STORAGE,version:1,records,learned:[...learned]},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='atles-les-meves-marques.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 $('#import-records').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>3e6){toast('El fitxer és massa gran.');return;}try{const data=JSON.parse(await file.text());if(data.app!==STORAGE||!Array.isArray(data.records))throw Error();const valid=data.records.filter(r=>r&&['contest','exam'].includes(r.mode)&&typeof r.id==='string'&&typeof r.name==='string'&&r.name.length<=24&&Number.isFinite(r.elapsed)&&r.elapsed>=0&&Number.isInteger(r.correct)&&r.correct>=0&&Number.isInteger(r.total)&&r.total>=1&&r.total<=61&&r.correct<=r.total&&Number.isFinite(r.score)&&r.score>=0&&r.score<=r.total*10&&Number.isInteger(r.hints)&&r.hints>=0&&r.hints<=3&&r.config&&r.key===C.boardKey(r.config)&&!Number.isNaN(Date.parse(r.date)));const ids=new Set(records.map(r=>r.id));let added=0;valid.forEach(r=>{if(!ids.has(r.id)){records.push(r);ids.add(r.id);added++;}});records=records.slice(-500);if(Array.isArray(data.learned))data.learned.filter(id=>byId[id]).forEach(id=>learned.add(id));persist();renderRanking();toast(`${added} marques importades.`);}catch{toast('Aquest fitxer no és una còpia vàlida de les marques.');}};
}
function leaveGame(next){if(!game){next();return;}modal(`<div class="eyebrow">Partida en curs</div><h2>Vols sortir?</h2><p>Aquesta partida no es guardarà al rànquing. El temps continua corrent mentre decideixes.</p><div class="result-actions"><button id="continue-game" class="btn dark wide">Continua jugant</button><button id="leave-game" class="btn outline wide">Surt de la partida</button></div>`);$('#continue-game').onclick=()=>$('#dialog').close();$('#leave-game').onclick=()=>{$('#dialog').close();game=null;renderExplore();next();};}
function help(){modal(`<div class="eyebrow">El teu atles de butxaca</div><h2>Aprèn. Juga. Descobreix.</h2><ol class="help-list"><li><strong>Explorar:</strong> tria un lloc de la llista o toca un punt. Descobreix on és i marca’l com a repassat.</li><li><strong>Concurs:</strong> escriu, tria un nom o localitza un punt. Tens tres pistes per partida. Cada pista resta tres punts a aquella pregunta.</li><li><strong>Repte perfecte:</strong> un error acaba el concurs. Llegeix la correcció i torna a provar-ho amb un ordre nou.</li><li><strong>Examen:</strong> 15 llocs a l’atzar. Escriu els noms de memòria, canvia de vista i entrega quan hagis acabat.</li><li><strong>Rànquing:</strong> en l’examen compten primer els encerts i després el temps.</li></ol><p>Les tildes, majúscules i guionets no penalitzen. S’accepten els noms equivalents previstos en català i castellà. Les marques es guarden en aquest navegador.</p><button class="btn dark wide setup-submit" id="help-ok">Som-hi!</button>`);$('#help-ok').onclick=()=>$('#dialog').close();}
function credits(){modal(`<div class="eyebrow">Un mapa amb fonaments</div><h2>Fonts i criteris</h2><ul class="credits-list"><li>Costes, illes, llacs, rius i grans regions: <a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/" target="_blank" rel="noopener">Natural Earth 1:10m</a>, domini públic. Cartografia simplificada per a ús escolar.</li><li>61 elements seleccionats de la fitxa «Amèrica físic»: només els subratllats, Aconcagua i l’afegit «Pascua». «Bravo o Grande» s’hi inclou una sola vegada.</li><li>Els rius tenen recorreguts cartogràfics; els límits dels deserts, massissos i serralades són orientatius. Els caps es representen amb una coordenada de referència.</li><li>La fitxa diu «Grenlàndia», «Galápagos» i «Pascua». Es conserven aquestes formes i també s’accepten «Groenlàndia», «Galàpags» i «Pasqua / Rapa Nui».</li><li>«Sierra Madre» agrupa els sistemes mexicans occidental, oriental i del sud. No s’hi associa el McKinley que apareix al costat a la fitxa.</li><li>La península d’Alaska és la franja del sud-oest, i Vancouver es pregunta com a illa. El Riu de la Plata es tracta com a estuari.</li><li>Les ampliacions del Carib, l’Àrtic, Galápagos i el Pacífic fan visibles els llocs petits. La ubicació de Pascua es mostra respecte de la costa sud-americana.</li></ul><div class="credits-note">Atles · Amèrica en joc · v${D.version}<br>Funciona sense serveis externs ni connexió quan l’HTML ja és al dispositiu. Dades i rànquing locals.</div>`);}
$$('[data-nav]').forEach(b=>b.onclick=()=>{const target=b.dataset.nav,go=()=>target==='explore'?renderExplore():target==='ranking'?renderRanking():setup(target);if(game)leaveGame(go);else go();});
$('.brand').onclick=e=>{e.preventDefault();leaveGame(renderExplore);};$('#help-btn').onclick=help;$('#credits-btn').onclick=credits;
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#dialog').close();}});
setInterval(()=>{const t=$('#timer');if(t&&game)t.textContent=C.time(elapsed());},250);
window.addEventListener('beforeunload',e=>{if(game){e.preventDefault();e.returnValue='';}});
renderExplore();
})();
