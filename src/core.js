/* Pure game rules. No network or browser dependencies. */
const AtlasCore = (() => {
  const articles = /^(?:el|la|els|les|l|los|las|the)\s+/;
  function normalize(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’`·–—\-]/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim().replace(articles,'');
  }
  function accepts(place, answer) {
    const n=normalize(answer);return !!n && [place.name,...(place.aliases||[])].some(a=>normalize(a)===n);
  }
  function shuffle(values, random=Math.random) {
    const a=[...values];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
  }
  function pool(places,region='all',category='all') {
    return places.filter(p=>(region==='all'||p.region===region||p.region==='both')&&(category==='all'||p.category===category));
  }
  function questions(places,count,previous='',random=Math.random) {
    const a=shuffle(places,random).slice(0,Math.min(count,places.length));
    if(a.length>1&&a.map(p=>p.id).join(',')===previous) [a[0],a[1]]=[a[1],a[0]];
    return a;
  }
  function points(correct,hints=0){return correct?Math.max(1,10-3*hints):0;}
  function time(ms){const s=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
  function rank(a,b,mode='exam') {
    if(mode==='contest'&&a.score!==b.score)return b.score-a.score;
    if(a.correct!==b.correct)return b.correct-a.correct;
    if(mode==='contest'&&(a.hints||0)!==(b.hints||0))return (a.hints||0)-(b.hints||0);
    return a.elapsed-b.elapsed || String(a.date).localeCompare(String(b.date));
  }
  function boardKey(config){return [config.region,config.category,config.count,config.answerMode||'write',config.strict?'perfect':'normal'].join('|');}
  function evaluate(places,answers){return places.map(p=>({id:p.id,name:p.name,answer:answers[p.id]||'',correct:accepts(p,answers[p.id]||'')}));}
  return {normalize,accepts,shuffle,pool,questions,points,time,rank,boardKey,evaluate};
})();
if(typeof module!=='undefined') module.exports=AtlasCore;
