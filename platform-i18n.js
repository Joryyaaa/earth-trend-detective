/* Global offline localization, including live data, exports and canvas chart labels.
   Never changes observations, model inputs, coordinates or calculation precision. */
(()=>{'use strict';
const packs=window.ForecastLocales,keys=window.PlatformLocaleKeys,rows=window.PlatformLocaleRows;
const dictionaries={};for(const [language,pack] of Object.entries(packs)){
 const values=rows[language]?.split('|');if(!values||values.length<61)throw Error('Incomplete platform vocabulary: '+language);
 const dictionary=Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
 for(const role of ['public','farmer','engineer','student','scientist','researcher','specialist'])dictionary[role+'Detail'] ||= pack.advice[role];
 Object.assign(dictionary,{evidence:dictionary.evidence||pack.text.observed,steps:dictionary.steps||pack.text.role,quality:dictionary.quality||dictionary.count,season:dictionary.season||pack.text.seasons,wet:dictionary.wet||dictionary.precipitation+' ↑',dry:dictionary.dry||dictionary.precipitation+' ↓',hotDays:dictionary.hotDays||dictionary.count+' · T2M_MAX >35°C',peak:dictionary.peak||dictionary.maximum+' ↑',range:dictionary.range||dictionary.history+' · min…max',method:dictionary.method||pack.text.scientific,result:dictionary.result||pack.text.estimate,limits:dictionary.limits||pack.text.technical});
 dictionaries[language]=dictionary;
}
let language='ar',busy=false;try{const saved=JSON.parse(localStorage.getItem('earth-forecast-preferences')||'{}');if(packs[saved.language])language=saved.language;}catch{}
const $=id=>document.getElementById(id),originals=new WeakMap(),attributes=new WeakMap();
const t=key=>dictionaries[language][key]??packs[language].text[key]??key;
const pvalue=value=>Number.isFinite(value)?value<.0001?'<0.0001':n(value,4):t('unavailable');
const n=(value,digits=2)=>Number.isFinite(value)?new Intl.NumberFormat(language,{maximumFractionDigits:digits}).format(value):t('unavailable');
const englishAliases={
 'overview':'overview','trends':'trends','insights':'insights','prediction lab':'lab','ai prediction lab':'lab','report studio':'reports','ask ai':'assistant','comparison mode':'compare','what to compare?':'compare','data explorer':'factor','environmental factor':'factor','start year':'start','end year':'end','↻ refresh nasa observations':'refresh','◉ spatial heat layer':'heat','globe to color':'earth','✦ show spatial data':'heat','remove heat layer':'remove','both earths · compare':'both','earth 01 only':'earth','earth 02 only':'earth','original earth':'normal','thermal · nasa air temperature':'thermal','geology · usgs earthquakes':'geology','tectonics · published plate boundaries':'plates','◉ apply to both earths':'apply','reset visualizer':'reset','drag to rotate · scroll to zoom':'rotate','historical frame':'history','▶ play history':'play','▶ play':'play','Ⅱ pause':'pause','time travel':'timeline','/ earth in motion':'history','rate of change':'rate','trend significance':'significance','future projection':'projection','environmental intelligence':'analysis','regional analysis':'analysis','historical trend comparison':'trends','scientific insights':'insights','send':'send','↶ undo':'undo','delete last':'delete','clear chat':'clear','compare':'compare','future':'projection','sources':'source','↻ generate report':'report','▤ print / save pdf':'print','↓ export html':'export','environmental report studio':'reports','model evaluation':'quality','research output':'reports','experimental predictions':'projection','source & limitations':'limits','annual observations':'count','mean':'mean','linear slope':'slope','trend direction':'direction','increasing':'increasing','decreasing':'decreasing','no detected slope':'stable','not available':'unavailable','awaiting data':'loading','awaiting analysis':'loading','awaiting model':'loading','forecast horizon':'estimate','model status':'quality','no validated estimate':'unavailable','better than baseline':'passed','below baseline — low confidence':'failed','insufficient data':'unavailable','temperature (°c)':'temperature','precipitation (mm)':'precipitation','relative humidity (%)':'humidity','wind speed (m/s)':'wind','maximum temperature (°c)':'maximum','minimum temperature (°c)':'minimum','solar irradiance (mj/m²/day)':'solar','mann–kendall (exploratory)':'significance','theil–sen trend':'slope','statistical caution':'limits','technical model output · english':'technical',
 'two locations · same years':'compareRegions','same location · two periods':'comparePeriods','low':'minimum','high':'maximum','◈ earth change visualizer':'earth','visualization on both earths':'both','earthquake observation window':'history','● interactive earth':'earth','◉ temporal observatory · nasa power':'timeline','nasa data':'source','drag the year · watch the two regions':'timeline','earth intelligence platform':'analysis','mission console · build 03':'overview','ask ai · scientific data copilot':'assistant','◉ predictive intelligence / science lab':'lab','◉ earth observation / results export':'reports','nasa space apps 2026 · earth system intelligence':'analysis','nasa space apps challenge 2026 · scientific data report':'reports','earlier period':'start','later period':'end','earlier years':'start','later years':'end','same-site temporal comparison':'compare','regional comparison':'compare','earlier / later slope':'slope','region 01 / 02 slope':'slope'
};
Object.assign(englishAliases,{temperature:'temperature',precipitation:'precipitation',humidity:'humidity',wind:'wind',maximumtemperature:'maximum',minimumtemperature:'minimum',solarirradiance:'solar','start year must precede end year.':'compare','no verified data loaded.':'unavailable','data request failed; no observations shown.':'unavailable','mann–kendall (exploratory)':'significance'});
const verbose={
 'mode-description':'compare','nasa-data-status':'loading','heat-status':'heat','earth-layer-status':'source','timeline-context':'history','nasa-source-details':'source','lab-message':'history'
};
function keyFor(source,element){

 const lower=source.trim().toLowerCase();if(englishAliases[lower])return englishAliases[lower];
 if(/^(model estimate|experimental forecast)\s*·/.test(lower))return 'estimateNumber';
 if(/^holdout rmse/.test(lower))return 'errorNumber';
 if(/^naive baseline/.test(lower))return 'baselineNumber';
 if(/locations? passed backtest/.test(lower))return 'passedNumber';
 if(/no forecasts passed/.test(lower))return 'failed';
 if(/^◉ nasa power · point data/.test(lower))return 'source';
 if(/^earth system intelligence|^✦ nasa space apps/.test(lower))return 'analysis';
 if(/\(point\)$/.test(source))return 'location';
 if(/^region 0[12]$|^earth 0[12]$/i.test(source))return 'earth';
 if(/last (30|365) days/.test(lower))return 'history';
 if(element?.classList.contains('brand')||element?.closest('.page-title h1'))return null;
 if(element?.id==='mode-description')return 'compareInstruction';
 if(element?.closest('.globe-heat-trigger'))return 'heat';
 if(element?.id==='globe-inspect-1'||element?.id==='globe-inspect-2')return 'inspection';
 if(element?.id==='timeline-context')return 'timelineContext';
 if(element?.id==='heat-status')return 'heatStatus';
 if(element?.id==='earth-layer-status')return 'layerStatus';
 if(source.length>55){
  if(element?.closest('.assistant-disclosure'))return 'assistantDisclosure';
  if(/model|forecast|autoregress|prediction|confidence/.test(lower))return 'caution';
  if(/correlation|p-value|statistical/.test(lower))return 'scientistDetail';
  if(/nasa|point|satellite|spheres|source|layer/.test(lower))return 'sourceNote';
  if(/report|summary|summaries/.test(lower))return 'reports';
 }
 if(/waiting|awaiting|loading|not loaded/.test(lower))return 'loading';
 return null;
}
function localized(key,source,element){
 if(language==='en')return source;
 if(key==='compareRegions')return t('earth')+' 01 ↔ 02 · '+t('years');
 if(key==='comparePeriods')return t('earth')+' 01 · '+t('start')+' ↔ '+t('end');
 if(key==='compareInstruction')return localized($('comparison-mode')?.value==='periods'?'comparePeriods':'compareRegions','',element);
 if(key==='location')return source.replace('(point)','· NASA POWER');
 if(key==='inspection'){const c=window.EarthData?.getCurrent?.(),a=c?.analyses,idx=element?.id==='globe-inspect-2'?1:0,meta=a&&window.EarthDataCore.variables[a.variable];return a?t('history')+' '+(a.temporal?(idx===0?a.start+'–'+Math.floor((a.start+a.end)/2):(Math.floor((a.start+a.end)/2)+1)+'–'+a.end):a.start+'–'+a.end)+' · n='+a.groups[idx].length+' · '+t('mean')+' '+n(a.means[idx])+' '+meta.unit+' · '+t('slope')+' '+n(a.slopes[idx],3)+' '+meta.unit+'/'+t('years'):t('loading');}
 if(key==='timelineContext')return t('history')+' · NASA POWER · '+($('timeline-year')?.value||'')+' · '+window.PlatformScienceLocales[language];
 if(key==='heatStatus'||key==='layerStatus')return t(/could not|unavailable|failed|too few|error/i.test(source)?'unavailable':/loading|starting|fetch|sampling/i.test(source)?'loading':key==='heatStatus'?'heat':'earth')+' · '+(/USGS/.test(source)?'USGS':/PB2002|plate/i.test(source)?'Bird PB2002':'NASA POWER')+' · '+(source.match(/[-+]?\d+(?:\.\d+)?/g)||[]).join(' / ');
 if(key==='sourceNote')return 'NASA POWER · '+window.PlatformScienceLocales[language];
 if(key==='assistantDisclosure')return t('assistant')+' · '+t('analysis')+' · NASA POWER. '+packs[language].text.caution;
 if(key.endsWith('Number'))return t({estimateNumber:'estimate',errorNumber:'error',baselineNumber:'baseline',passedNumber:'passed'}[key])+' · '+(source.match(/[-+]?\d+(?:\.\d+)?/g)||[]).join(' / ');
 const result=t(key),match=source.match(/0[12]|30|365/);return key==='earth'&&match?result+' '+match[0]:key==='history'&&match?result+' · '+match[0]:result;
}
function walk(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement;if(!parent||parent.closest('script,style,#role-modes,.forecast-language,.assistant-bubble,#report-preview,#insight-content,#forecast-output,#nasa-data-status,#nasa-source-details,#lab-message,canvas,svg'))continue;
  const previous=originals.get(node);let source=previous&&node.data===previous.rendered?previous.source:node.data;
  if(!source.trim())continue;const key=keyFor(source,parent);if(!key)continue;
  const value=localized(key,source,parent);if(node.data!==value)node.data=value;originals.set(node,{source,rendered:value});
 }
 for(const element of root.querySelectorAll('[aria-label],[title],[placeholder]')){
  if(element.closest('#role-modes,.forecast-language'))continue;
  const record=attributes.get(element)||{};
  for(const attribute of ['aria-label','title','placeholder']){
   if(!element.hasAttribute(attribute))continue;const current=element.getAttribute(attribute),old=record[attribute];const source=old&&current===old.rendered?old.source:current;
   const key=attribute==='placeholder'?'question':keyFor(source,element)||(/globe|earth|region/i.test(source)?'earth':/timeline|historical/i.test(source)?'timeline':/chat|assistant/i.test(source)?'assistant':/data|heat/i.test(source)?'factor':null);
   if(key){const value=localized(key,source);if(current!==value)element.setAttribute(attribute,value);record[attribute]={source,rendered:value};}
  }attributes.set(element,record);
 }
}
function line(key,value){const p=document.createElement('p');p.textContent=t(key)+': '+value;return p;}
function replace(id,values){const target=$(id);if(target)target.replaceChildren(...values);}
function live(){
 const c=window.EarthData?.getCurrent?.();if(!c?.loaded||!c.analyses)return;
 const a=c.analyses,variable=window.EarthDataCore.variables[a.variable],unit=variable.unit;
 const target=$('rm-target')?.value||'region1',indices=a.temporal?[0]:target==='both'?[0,1]:[target==='region2'?1:0],rows=indices.map(index=>c.locations[index]);
 const accepted=indices.filter(index=>c.forecastResults?.[index]?.result?.validated).length;const metric=$('forecast-metric')?.querySelector('.metric-value');if(metric)metric.textContent=n(accepted,0)+' / '+n(indices.length,0)+' · '+t('passed');
 if($('lab-message'))$('lab-message').textContent=t('factor')+' · '+variable.code+' · '+t('observed')+' / '+t('estimate')+' · '+a.start+'–'+a.end;
 {
  report(c);
  replace('insight-content',[line('compare',a.start+'–'+a.end),...a.groups.map((group,i)=>line('earth',(i+1)+' · '+t('count')+' '+n(group.length,0)+' · '+t('mean')+' '+n(a.means[i])+' '+unit+' · '+t('slope')+' '+n(a.slopes[i],3)+' '+unit+'/'+t('years')+' · Theil–Sen '+n(a.senSlopes?.[i]*10,3)+' /10 '+t('years')+' · p='+pvalue(a.stats[i]?.p)+' · r₁='+n(a.stats[i]?.autocorr,3))),line('limits',t('scientistDetail'))]);
  replace('forecast-output',rows.map((region,i)=>{const f=c.forecastResults?.[indices[i]]?.result;return line('estimate',region.loc.name+' · '+(f?.ok?f.prediction.year+' · '+n(f.prediction.value)+' '+unit+' · RMSE '+n(f.rmse)+' / '+t('baseline')+' '+n(f.naive)+' · '+t(f.validated?'passed':'failed'):t('unavailable')));}));
  const status=$('nasa-data-status');if(status)status.textContent='NASA POWER · '+t('count')+' '+a.groups.map(g=>n(g.length,0)).join(' / ')+' · '+t('source');
  const source=$('nasa-source-details');if(source)source.textContent='NASA POWER · UTC · '+variable.code+' · '+unit+' · '+a.start+'–'+a.end+' · '+packs[language].advice.researcher;
 }
}
function report(c){
 const a=c.analyses,root=$('report-preview');if(!root)return;
 const meta=window.EarthDataCore.variables[a.variable],parts=[line('reports','Earth System Detective · NASA POWER'),line('history',a.start+'–'+a.end+' · '+meta.code+' · '+meta.unit)];
 a.groups.forEach((group,i)=>{
  parts.push(line('earth',(i+1)+' · '+(c.locations[a.temporal?0:i]?.loc.name||'')),line('count',n(group.length,0)),line('mean',n(a.means[i])+' '+meta.unit),line('slope',n(a.slopes[i],3)+' '+meta.unit+'/'+t('years')),line('slope','Theil–Sen · '+n(a.senSlopes?.[i]*10,3)+' '+meta.unit+'/10 '+t('years')),line('significance','Mann–Kendall · p='+pvalue(a.stats[i]?.p)+' · r₁='+n(a.stats[i]?.autocorr,3)));
 });
 (c.forecastResults||[]).forEach(({loc,result:f})=>parts.push(line('estimate',loc.name+' · '+(f?.ok?f.prediction.year+' · '+n(f.prediction.value)+' '+meta.unit+' · '+t('error')+' '+n(f.rmse)+' / '+t('baseline')+' '+n(f.naive)+' · n='+f.holdout+' · '+t(f.validated?'passed':'failed'):t('unavailable')))));
 c.locations.slice(0,a.temporal?1:2).forEach(({loc,data})=>{
  parts.push(line('source','NASA POWER · UTC · '+loc.lat+', '+loc.lon+' · '+data._source.retrievedAt));
  const anchor=document.createElement('a');anchor.textContent=t('source')+' · NASA POWER';anchor.href=data._source.url||'https://power.larc.nasa.gov/';anchor.target='_blank';anchor.rel='noreferrer';parts.push(anchor);
 });
 parts.push(line('method','AR(2) ridge · h='+($('forecast-horizon')?.value||1)),line('limits',t('scientistDetail')+' '+packs[language].text.caution));root.replaceChildren(...parts);
}
function charts(){
 if(!window.Chart?.instances)return;
 for(const chart of Object.values(Chart.instances)){
  let changed=false;
  for(const dataset of chart.data.datasets||[]){
   if(!dataset.label)continue;const before=dataset._earthLabel||dataset.label;dataset._earthLabel=before;
   let label=before.replace(/observed/g,t('observed')).replace(/experimental model/g,t('estimate')).replace(/Earlier years/g,t('start')).replace(/Later years/g,t('end'));
   if(dataset.label!==label){dataset.label=label;changed=true;}
  }
  if(chart.options.locale!==language){chart.options.locale=language;changed=true;}
  if(chart.options.plugins?.legend)chart.options.plugins.legend.rtl=packs[language].dir==='rtl';
  if(changed)chart.update('none');
 }
}
function apply(includeLive=false){
 if(busy)return;busy=true;observer?.disconnect();
 try{
  document.documentElement.lang=language;document.documentElement.dir=packs[language].dir;
  walk(document.body);if(includeLive)live();charts();
 }finally{busy=false;observer?.observe(document.body,{subtree:true,childList:true,characterData:true});}
}
let observer=null,pending=false;
function schedule(){if(pending||busy)return;pending=true;queueMicrotask(()=>{pending=false;apply();});}
function setLanguage(next){if(!packs[next])return;const changed=language!==next;language=next;apply(true);if(changed)document.querySelectorAll('.assistant-bubble.assistant').forEach(message=>{const question=message.previousElementSibling;if(question?.classList.contains('user'))message.textContent=answer(question.dataset.intent||question.textContent);});if(changed)window.dispatchEvent(new CustomEvent('earth:language-changed',{detail:{language}}));}
function answer(q){
 const c=window.EarthData?.getCurrent?.();if(!c?.loaded)return t('loading');const a=c.analyses;
 const sourceQuestion=q.includes(t('source').toLowerCase())||/source|nasa|مصدر|بيانات|donn|fuente|quelle|источ|来源|出典|출처/.test(q);
 const forecastQuestion=q.includes(t('projection').toLowerCase())||q.includes(t('estimate').toLowerCase())||/predict|future|forecast|تنب|توقع|مستقبل|prévi|futur|progn|予測|预测|예측/.test(q);
 const lines=[t(sourceQuestion?'source':forecastQuestion?'projection':'analysis')+' · NASA POWER · '+a.start+'–'+a.end];
 c.locations.slice(0,a.temporal?1:2).forEach((region,i)=>{
  const f=c.forecastResults?.[i]?.result,meta=window.EarthDataCore.variables[a.variable];
  lines.push(region.loc.name+' · '+t('mean')+': '+n(a.means[i])+' '+meta.unit+' · '+t('slope')+': '+n(a.slopes[i],3)+' '+meta.unit+'/'+t('years'));
  if(forecastQuestion)lines.push(t('estimate')+': '+(f?.ok?f.prediction.year+' · '+n(f.prediction.value)+' '+meta.unit+' · RMSE '+n(f.rmse)+' / '+n(f.naive)+' · '+t(f.validated?'passed':'failed'):t('unavailable')));
 });
 lines.push(sourceQuestion?t('researcherDetail'):forecastQuestion?packs[language].text.caution:t('scientistDetail'));
 return lines.join('\n\n');
}
window.PlatformI18n={t,n,get language(){return language;},setLanguage,apply:()=>apply(true),answer,dictionaries};
function bind(){
 observer=new MutationObserver(schedule);apply(true);
 window.addEventListener('earth:data-updated',()=>apply(true));window.addEventListener('earth:role-rendered',()=>setLanguage($('rm-language').value));
 window.addEventListener('earth:forecast-selection',()=>apply(true));
 document.addEventListener('click',event=>{if(event.target.closest('[data-view=reports],[data-view=prediction-lab],#report-generate'))apply(true);});
 document.addEventListener('change',event=>{if(event.target.id==='rm-language')setLanguage(event.target.value);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
