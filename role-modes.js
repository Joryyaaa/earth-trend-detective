/* Deterministic multilingual explanations of the SAME model and observations.
   No LLM, remote translation, crop prescriptions, or unsupported geological predictions. */
(()=>{'use strict';
const $=id=>document.getElementById(id),packs=window.ForecastLocales,core=window.EarthDataCore;
const roles=['public','farmer','engineer','student','scientist','researcher','specialist'];
const ages=['','child','teen','adult','senior'];
let saved={};try{saved=JSON.parse(localStorage.getItem('earth-forecast-preferences')||'{}');}catch{}
const settings={language:packs[saved.language]?saved.language:'ar',role:roles.includes(saved.role)?saved.role:'public',age:ages.includes(saved.age)?saved.age:'',style:['simple','scientific'].includes(saved.style)?saved.style:'simple'};
let speechGeneration=0,voiceList=[],speaking=false,paused=false,reportText='',planningReport='',exportData=null;
const farmInputs={crop:'',minimum:'',maximum:'',kc:'',efficiency:'',effective:''};
const synth=window.speechSynthesis;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function text(key){return packs[settings.language].text[key];}
function number(value,digits=2){return Number.isFinite(value)?new Intl.NumberFormat(settings.language,{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(value):text('unavailable');}
function persist(){try{localStorage.setItem('earth-forecast-preferences',JSON.stringify(settings));}catch{}}
function current(){const c=window.EarthData?.getCurrent?.();return c?.loaded&&c.analyses?c:null;}
function stop(){speechGeneration++;if(synth)synth.cancel();speaking=false;paused=false;audioState();}
function voices(){
 if(!synth)return [];
 return voiceList.filter(v=>v.lang?.split('-')[0].toLowerCase()===(settings.language==='tl'?'fil':settings.language)||v.lang?.split('-')[0].toLowerCase()===settings.language||(settings.language==='no'&&v.lang?.startsWith('nb')));
}
function audioState(){
 const possible=Boolean(synth&&voices().length&&current());
 $('rm-listen').disabled=!possible||speaking;
 $('rm-pause').disabled=!speaking||paused;$('rm-resume').disabled=!speaking||!paused;
 $('rm-replay').disabled=!possible;$('rm-stop').disabled=!speaking;
 const selected=voices()[+$('rm-voice').value]||voices()[0];
 $('rm-voice-note').textContent=possible?selected.name+' · '+selected.lang:!current()?text('unavailable')+' · NASA POWER':text('noVoice');
}
function populateVoice(){const list=voices(),select=$('rm-voice'),before=select.value;select.replaceChildren(...list.map((v,i)=>new Option(v.name,String(i))));if(list[+before])select.value=before;select.disabled=!list.length;audioState();}
function speak(){
 stop();if(!synth||!voices().length||!current())return;
 const generation=speechGeneration;const selected=voices()[+$('rm-voice').value]||voices()[0];
 // Short utterances avoid browser speech engines stalling on long reports.
 const words=(reportText+planningReport).split(/\s+/),chunks=[];let chunk='';
 for(const word of words){if((chunk+' '+word).length>180&&chunk){chunks.push(chunk);chunk='';}chunk+=(chunk?' ':'')+word;}if(chunk)chunks.push(chunk);
 speaking=true;audioState();let index=0;
 const next=()=>{if(generation!==speechGeneration)return;if(index>=chunks.length){speaking=false;paused=false;audioState();return;}
  const u=new SpeechSynthesisUtterance(chunks[index++]);u.lang=selected.lang;u.voice=selected;u.rate=+$('rm-speed').value;
  u.onend=next;u.onerror=()=>{if(generation!==speechGeneration)return;stop();$('rm-voice-note').textContent=text('noVoice');};synth.speak(u);
 };next();
}
function build(){
 const root=el('section','role-modes');root.id='role-modes';root.setAttribute('aria-label','Forecast role modes');
 const top=el('div','rm-top');const title=el('h3');title.id='rm-title';top.append(title);
 const modes=el('div','rm-controls');for(const style of ['simple','scientific']){const b=el('button');b.type='button';b.id='rm-'+style;b.addEventListener('click',()=>{settings.style=style;persist();render();});modes.append(b);}top.append(modes);root.append(top);
 const fields=el('div','rm-fields');for(const key of ['role','age','language']){const label=el('label');const caption=el('span');caption.id='rm-label-'+key;const select=el('select');select.id='rm-'+key;select.addEventListener('change',()=>{settings[key]=select.value;persist();render();});label.append(caption,select);if(key==='language'){label.className='forecast-language';document.querySelector('.topbar').append(label);}else fields.append(label);}root.append(fields);
 const results=el('div','rm-results');results.id='rm-results';results.setAttribute('aria-live','polite');root.append(results);
 const advice=el('div','rm-advice');advice.id='rm-advice';root.append(advice);
 const domain=el('div');domain.id='rm-domain';root.append(domain);
 const caution=el('p','rm-caution');caution.id='rm-caution';root.append(caution);
 const audio=el('div','rm-audio');for(const key of ['listen','pause','resume','replay','stop']){const b=el('button',key==='listen'?'rm-primary':'');b.type='button';b.id='rm-'+key;audio.append(b);}
 const speedLabel=el('label');const speedText=el('span');speedText.id='rm-speed-label';const speed=el('select');speed.id='rm-speed';for(const v of [.7,.85,1,1.15,1.3])speed.add(new Option(v+'×',v));speed.value='1';speedLabel.append(speedText,speed);audio.append(speedLabel);
 const voice=el('select');voice.id='rm-voice';audio.append(voice);root.append(audio);
 const voiceNote=el('p','rm-subtle');voiceNote.id='rm-voice-note';voiceNote.setAttribute('role','status');root.append(voiceNote);
 const exportButton=el('button');exportButton.id='rm-export';exportButton.type='button';exportButton.addEventListener('click',download);root.append(exportButton);
 const source=el('details');source.id='rm-source';const summary=el('summary');summary.id='rm-source-label';const content=el('div');content.id='rm-source-content';source.append(summary,content);root.append(source);
 $('prediction-lab-page').querySelector('.legacy-forecast').after(root);
 $('rm-listen').addEventListener('click',speak);$('rm-replay').addEventListener('click',speak);$('rm-stop').addEventListener('click',stop);
 $('rm-pause').addEventListener('click',()=>{if(synth&&speaking){synth.pause();paused=true;audioState();}});
 $('rm-resume').addEventListener('click',()=>{if(synth&&speaking){synth.resume();paused=false;audioState();}});
 $('rm-speed').addEventListener('change',stop);$('rm-voice').addEventListener('change',stop);
}
function table(headers,rows){const wrap=el('div','rm-table-wrap'),t=el('table'),head=el('thead'),tr=el('tr');for(const h of headers){const th=el('th','',h);th.scope='col';tr.append(th);}head.append(tr);const body=el('tbody');for(const row of rows){const r=el('tr');for(const value of row)r.append(el('td','',String(value)));body.append(r);}t.append(head,body);wrap.append(t);return wrap;}
function planner(c){
 const domain=$('rm-domain');domain.replaceChildren();planningReport='';if(settings.role!=='farmer'||!c)return;
 const details=el('details');details.append(el('summary','',text('planning')));
 details.append(el('p','rm-subtle',text('planningCaution')));
 const form=el('form','rm-farm-fields');
 const labels={crop:text('crop'),minimum:text('minimum')+' · °C',maximum:text('maximum')+' · °C',kc:'Kc · 0–2',efficiency:text('efficiency'),effective:text('effective')};
 for(const [key,labelText]of Object.entries(labels)){
  const label=el('label','',labelText),input=el('input');input.name=key;input.id='rm-farm-'+key;input.type=key==='crop'?'text':'number';input.required=true;input.value=farmInputs[key];input.autocomplete='off';
  if(key==='crop'){input.maxLength=80;}else{input.step='any';input.min=key==='minimum'||key==='maximum'?'-60':key==='efficiency'?'.01':'0';input.max=key==='minimum'||key==='maximum'?'60':key==='kc'?'2':'1';}
  input.addEventListener('input',()=>{farmInputs[key]=input.value;});label.append(input);form.append(label);
 }
 const button=el('button','rm-primary',text('calculate'));button.type='submit';form.append(button);details.append(form);
 const output=el('div');output.id='rm-planning-output';output.setAttribute('aria-live','polite');details.append(output);
 const source=el('a','','FAO-56 · Hargreaves');source.href='https://www.fao.org/4/x0490e/x0490e07.htm';source.target='_blank';source.rel='noreferrer';details.append(source);domain.append(details);
 form.addEventListener('submit',event=>{
  event.preventDefault();stop();output.replaceChildren();planningReport='';
  const low=+farmInputs.minimum,high=+farmInputs.maximum,kc=+farmInputs.kc,eff=+farmInputs.efficiency,effective=+farmInputs.effective;
  if(!form.reportValidity()||low>high){output.append(el('p','',text('unavailable')+' · '+text('minimum')+' ≤ '+text('maximum')));return;}
  const a=c.analyses,regions=a.temporal?[c.locations[0]]:c.locations,plans=[];
  regions.forEach(region=>{
   const rows=[];
   for(let month=1;month<=12;month++){
    const samples=[];
    for(let year=a.start;year<=a.end;year++){
     const m=region.data._monthly?.[year]?.[month];
     if(!m||![m.temperature,m.precipitation,m.referenceET0].every(Number.isFinite))continue;
     const irrigation=core.irrigation(m.referenceET0,m.precipitation,kc,eff,effective);if(irrigation!==null)samples.push({temperature:m.temperature,rain:m.precipitation,et0:m.referenceET0,irrigation});
    }
    const avg=key=>samples.length?samples.reduce((s,r)=>s+r[key],0)/samples.length:null;
    const mean=avg('temperature');rows.push({month,temperature:mean,rain:avg('rain'),et0:avg('et0'),irrigation:avg('irrigation'),years:samples.length,withinInputBand:mean!==null&&mean>=low&&mean<=high});
   }
   output.append(el('h4','',farmInputs.crop+' · '+region.loc.name));
   output.append(table([text('month'),'T2M · °C','P · mm/month','ET₀ · mm/month','I · mm/month','Tmin ≤ T2M ≤ Tmax',text('years')],rows.map(r=>[new Intl.DateTimeFormat(settings.language,{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2024,r.month-1,15))),number(r.temperature),number(r.rain),number(r.et0),number(r.irrigation),r.years?(r.withinInputBand?'✓':'—'):text('unavailable'),r.years])));
   plans.push({location:region.loc,period:[a.start,a.end],months:rows});
  });
  exportData.planning={crop:farmInputs.crop,assumptions:{temperatureBand:[low,high],kc,efficiency:eff,effectiveRainFraction:effective},method:'Daily Hargreaves ET0; I=max(0,Kc*ET0-effectiveFraction*rain)/efficiency; average monthly historical scenarios; no soil storage or crop-stage simulation.',plans};
  planningReport='\n'+text('planning')+' · '+farmInputs.crop+'\n'+text('planningCaution');
 });
}
function stat(title,value,year){const node=el('div');node.append(el('span','',title),el('b','',value),el('small','',String(year)));return node;}
function render(){
 stop();const pack=packs[settings.language],root=$('role-modes');root.lang=settings.language;root.dir=pack.dir;root.dataset.age=settings.age;
 $('rm-title').textContent=text('title');for(const key of ['role','age','language'])$('rm-label-'+key).textContent=text(key)+(key==='language'?' · 40':'');
 document.querySelector('.forecast-language').lang=settings.language;document.querySelector('.forecast-language').dir=pack.dir;
 const horizon=$('forecast-horizon');document.querySelector('label[for="forecast-horizon"]').textContent=text('estimate')+' · '+text('years');
 for(const option of horizon.options)option.textContent=option.value+' '+text('years');
 $('rm-role').replaceChildren(...roles.map(r=>new Option(pack.roles[r],r)));$('rm-role').value=settings.role;
 $('rm-age').replaceChildren(new Option(text('optional'),''),...pack.ages.map((a,i)=>new Option(a,ages[i+1])));$('rm-age').value=settings.age;
 $('rm-language').replaceChildren(...Object.entries(packs).map(([code,p])=>new Option(p.name,code)));$('rm-language').value=settings.language;
 for(const key of ['simple','scientific','listen','pause','resume','replay','stop','export'])$('rm-'+key).textContent=text(key);
 for(const key of ['simple','scientific'])$('rm-'+key).setAttribute('aria-pressed',String(settings.style===key));
 $('rm-speed-label').textContent=text('speed');$('rm-speed').setAttribute('aria-label',text('speed'));$('rm-voice').setAttribute('aria-label',text('listen'));
 $('rm-caution').textContent=text('caution');$('rm-source-label').textContent=text('source');
 const c=current(),results=$('rm-results'),source=$('rm-source-content'),advice=$('rm-advice');results.replaceChildren();source.replaceChildren();advice.replaceChildren();
 advice.append(el('h4','',pack.roles[settings.role]),el('p','',pack.advice[settings.role]));
 if(['child','teen'].includes(settings.age))advice.append(el('p','',pack.child));if(settings.age==='senior')advice.append(el('p','',pack.senior));
 $('rm-export').disabled=!c;exportData=null;planningReport='';$('rm-domain').replaceChildren();reportText=pack.text.title+'\n'+pack.roles[settings.role]+'\n'+pack.advice[settings.role];
 if(!c){results.append(el('p','rm-unavailable',text('unavailable')+' · NASA POWER'));populateVoice();return;}
 const a=c.analyses,meta=core.variables[a.variable],regions=a.temporal?[c.locations[0]]:c.locations;
 const reportSections=[];
 regions.forEach((region,i)=>{
  const card=el('article','rm-region'),heading=el('h4','',region.loc.name);heading.dir='auto';card.append(heading);
  const f=c.forecastResults?.[i]?.result;
  const yearly=Object.keys(region.data).filter(y=>/^\d{4}$/.test(y)&&+y>=a.start&&+y<=a.end&&Number.isFinite(region.data[y][a.variable])).map(Number);
  const lastYear=yearly.at(-1),lastValue=region.data[lastYear]?.[a.variable];
  const numeric=el('div','rm-numbers');numeric.append(stat(text('observed'),number(lastValue)+' '+meta.unit,lastYear||'—'));
  numeric.append(stat(text('estimate'),f?.ok?number(f.prediction.value)+' '+meta.unit:text('unavailable'),f?.ok?f.prediction.year:'—'));card.append(numeric);
  if(f?.ok)card.append(el('p','rm-subtle',text('change')+': '+number(f.prediction.value-lastValue)+' '+meta.unit));
  const quality=el('p','rm-quality',f?.ok?text(f.validated?'passed':'failed'):text('unavailable'));quality.dataset.quality=f?.ok&&f.validated?'passed':'failed';card.append(quality);
  const details=el('details');details.open=settings.style==='scientific';details.append(el('summary','',text('scientific')+' · '+meta.code));
  if(f?.ok){details.append(el('p','rm-subtle','AR(2) ridge · '+a.start+'–'+a.end+' · h='+f.horizon+' · n='+f.holdout),el('p','rm-subtle','RMSE(AR) '+number(f.rmse)+' '+meta.unit+' / RMSE(persistence) '+number(f.naive)+' '+meta.unit));
   details.append(table([text('years'),text('estimate')+' · '+meta.unit],f.predictions.map(p=>[p.year,number(p.value)])));
  }
  details.append(table([text('years'),text('observed')+' · '+meta.unit],yearly.slice(-5).map(y=>[y,number(region.data[y][a.variable])])));card.append(details);
  const season=core.seasonal(region.data,a.variable,a.start,a.end);
  const seasonal=el('details');seasonal.append(el('summary','',text('seasons')+' · '+a.start+'–'+a.end));
  seasonal.append(table([text('month'),meta.code+' · '+(a.variable==='precipitation'?'mm/month':meta.unit),text('years')],season.map(m=>[new Intl.DateTimeFormat(settings.language,{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2024,m.month-1,15))),number(m.value),m.years])));card.append(seasonal);
  const sourceTitle=el('h4','',region.loc.name);sourceTitle.dir='auto';source.append(sourceTitle);
  const provenance=region.data._source;source.append(el('p','rm-subtle','NASA POWER daily UTC · '+region.loc.lat+', '+region.loc.lon+' · '+a.start+'–'+a.end+' · '+provenance.kind+' · '+provenance.retrievedAt));
  const link=el('a','',text('source')+' · NASA');link.href=provenance.url||'https://power.larc.nasa.gov/';link.target='_blank';link.rel='noreferrer';source.append(link);
  const q=region.data._quality?.[lastYear]?.[a.variable];if(q)source.append(el('p','rm-subtle',meta.code+' · '+q.observed+'/'+q.expected+' · '+lastYear));
  if(settings.role==='engineer'){
   const heat=region.data._quality?.[lastYear]?.maximumTemperature;
   if(heat?.observed===heat?.expected){card.append(el('p','rm-subtle',text('observed')+' · '+lastYear+' · T2M_MAX(max) '+number(heat.maximum)+' °C · n(T2M_MAX >35°C) '+heat.daysAbove35+'/'+heat.expected));}
  }
  reportSections.push({location:region.loc,variable:meta,period:[a.start,a.end],lastObservation:{year:lastYear,value:lastValue},forecast:f,seasonal:season,source:provenance});
  reportText+='\n\n'+region.loc.name+'\n'+text('observed')+' '+lastYear+': '+number(lastValue)+' '+meta.unit+'\n'+text('estimate')+': '+(f?.ok?f.prediction.year+' · '+number(f.prediction.value)+' '+meta.unit+'\n'+text(f.validated?'passed':'failed')+' · RMSE '+number(f.rmse):text('unavailable'));
  results.append(card);
 });
 reportText+='\n\n'+text('caution')+'\n'+text('source')+': NASA POWER daily UTC · '+a.start+'–'+a.end;
 if(['child','teen'].includes(settings.age))reportText+='\n'+pack.child;if(settings.age==='senior')reportText+='\n'+pack.senior;
 exportData={generatedAt:new Date().toISOString(),language:settings.language,role:settings.role,age:settings.age,explanation:reportText,sections:reportSections};
 planner(c);populateVoice();window.dispatchEvent(new Event('earth:role-rendered'));
}
function download(){if(!current()||!exportData)return;const research=['researcher','scientist','farmer'].includes(settings.role);const blob=new Blob([research?JSON.stringify(exportData,null,2):reportText+'\n\n'+JSON.stringify(exportData.sections.map(s=>({location:s.location,period:s.period,source:s.source})),null,2)],{type:research?'application/json;charset=utf-8':'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),anchor=el('a');anchor.href=url;anchor.download='earth-forecast-'+settings.role+'-'+settings.language+(research?'.json':'.txt');anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(){
 build();
 const old=$('forecast-output'),details=el('details');details.id='forecast-raw';details.lang='en';details.dir='ltr';details.append(el('summary','','Technical model output · English'));old.before(details);details.append(old);
 const info=$('prediction-lab-page').querySelector('.legacy-forecast');info.hidden=false;
 const metric=$('forecast-metric');if(metric)$('prediction-lab-page').append(metric);
 // Keep the existing forecast controls and disclosures, with the localized accessible layer below.
 window.addEventListener('earth:data-updated',render);
 $('forecast-horizon').addEventListener('change',stop);
 document.querySelectorAll('[data-view],[data-tab]').forEach(b=>b.addEventListener('click',stop));
 if(synth){voiceList=synth.getVoices();synth.addEventListener('voiceschanged',()=>{voiceList=synth.getVoices();populateVoice();});}
 window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
