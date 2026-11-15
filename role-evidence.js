/* Role/age presentation of measured values. No role changes a scientific prediction. */
(()=>{'use strict';
const core=window.EarthDataCore;
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function mean(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;}
function evidence(region,analysis,forecast,role,age){
 const variable=analysis.variable,years=Object.keys(region.data).filter(y=>/^\d{4}$/.test(y)&&+y>=analysis.start&&+y<=analysis.end&&Number.isFinite(region.data[y][variable])).map(Number).sort((a,b)=>a-b);
 const values=years.map(y=>region.data[y][variable]),lastYear=years.at(-1),season=core.seasonal(region.data,variable,analysis.start,analysis.end).filter(m=>Number.isFinite(m.value));
 const rain=core.seasonal(region.data,'precipitation',analysis.start,analysis.end).filter(m=>Number.isFinite(m.value));
 const temperatures=core.seasonal(region.data,'temperature',analysis.start,analysis.end).filter(m=>Number.isFinite(m.value));
 const metrics=[{key:'count',value:years.length,digits:0},{key:'mean',value:mean(values),unit:core.variables[variable].unit},{key:'range',min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,unit:core.variables[variable].unit}];
 const extreme=(array,maximum)=>array.reduce((best,item)=>!best||(maximum?item.value>best.value:item.value<best.value)?item:best,null);
 if(role==='farmer'){
  for(const [key,maximum]of [['wet',true],['dry',false]]){const month=extreme(rain,maximum);if(month)metrics.push({key,value:month.value,unit:'mm',month:month.month,years:month.years});}
  for(const [key,maximum]of [['maximum',true],['minimum',false]]){const month=extreme(temperatures,maximum);if(month)metrics.push({key:'temperature',extreme:maximum?'↑':'↓',value:month.value,unit:'°C',month:month.month,years:month.years});}
 }
 if(role==='engineer'||role==='specialist'){
  const heat=region.data._quality?.[lastYear]?.maximumTemperature;
  if(heat&&heat.observed===heat.expected){metrics.push({key:'hotDays',value:heat.daysAbove35,digits:0,total:heat.expected,year:lastYear},{key:'peak',value:heat.maximum,unit:'°C',year:lastYear});}
 }
 if(role==='scientist'||role==='researcher'||role==='specialist'){
  if(forecast?.ok)metrics.push({key:'error',value:forecast.rmse,unit:core.variables[variable].unit},{key:'baseline',value:forecast.naive,unit:core.variables[variable].unit},{key:'quality',value:forecast.holdout,digits:0,code:'n(backtest)'});
  const quality=region.data._quality?.[lastYear]?.[variable];if(quality)metrics.push({key:'quality',value:quality.observed,total:quality.expected,digits:0,year:lastYear});
 }
 if(role==='student'||role==='public'){
  const step=age==='child'?1:Math.min(5,Math.floor(years.length/2));
  if(step&&years.length>=step*2){metrics.push({key:'start',value:mean(values.slice(0,step)),unit:core.variables[variable].unit,period:[years[0],years[step-1]]},{key:'end',value:mean(values.slice(-step)),unit:core.variables[variable].unit,period:[years.at(-step),years.at(-1)]});}
 }
 return {role,age,variable,period:[analysis.start,analysis.end],years:years.length,metrics,season,forecastYear:forecast?.ok?forecast.prediction.year:null,forecastValue:forecast?.ok?forecast.prediction.value:null};
}
function render(card,region,analysis,forecast,role,age){
 const i=window.PlatformI18n;if(!i)return null;const t=i.t,n=i.n,p=window.ForecastLocales[i.language],data=evidence(region,analysis,forecast,role,age),digits=['child','teen','senior'].includes(age)?1:2;
 const section=node('section',undefined,'rm-evidence');section.append(node('h5',t('evidence')+' · '+p.roles[role]+(age?' · '+p.ages[['child','teen','adult','senior'].indexOf(age)]:'')));
 const list=node('dl',undefined,'rm-evidence-grid');
 for(const metric of data.metrics){
  if(age==='child'&&['count','range'].includes(metric.key))continue;
  const term=node('dt',t(metric.key)+(metric.extreme?' '+metric.extreme:'')),value=node('dd');
  let text=metric.min!==undefined?n(metric.min,digits)+' … '+n(metric.max,digits):n(metric.value,metric.digits??digits);
  if(metric.total!==undefined)text+=' / '+n(metric.total,0);
  if(metric.unit)text+=' '+metric.unit;if(metric.code)text+=' · '+metric.code;
  if(metric.month)text+=' · '+new Intl.DateTimeFormat(i.language,{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2024,metric.month-1,15)))+' · n='+n(metric.years,0);
  if(metric.period)text+=' · '+metric.period.join('–');if(metric.year)text+=' · '+metric.year;
  value.textContent=text;list.append(term,value);
 }section.append(list);
 section.append(node('h5',t('steps')));
 const advice=t(role+'Detail'),steps=node('ol');
 const sentences=advice.match(/[^.!؟。！？]+[.!؟。！？]?/g)||[advice];
 for(const sentence of sentences.filter(s=>s.trim()))steps.append(node('li',sentence.trim()));section.append(steps);
 if(role==='student'){
  for(const [label,text]of [['question',t('factor')+' · '+t(analysis.variable==='maximumTemperature'?'maximum':analysis.variable==='minimumTemperature'?'minimum':analysis.variable==='solarIrradiance'?'solar':analysis.variable)+' · '+region.loc.name],['method','NASA POWER · '+analysis.start+'–'+analysis.end+' · n='+data.years+' · '+(age==='child'?t('mean'):'AR(2) ridge / rolling origin')],['result',t('estimate')+' · '+(data.forecastYear?data.forecastYear+' · '+n(data.forecastValue,digits)+' '+core.variables[analysis.variable].unit:t('unavailable'))],['limits',age==='child'?p.child:p.text.caution]])section.append(node('h5',t(label)),node('p',text));
 }
 if(age==='child'&&role!=='student')section.append(node('p',p.child,'rm-age-explanation'));
 if(age==='teen')section.append(node('p',t('method')+': Δ = '+t('estimate')+' − '+t('observed')+'. '+p.child,'rm-age-explanation'));
 if(age==='senior')section.append(node('p',p.senior,'rm-age-explanation'));
 card.append(section);return data;
}
window.RoleEvidence={evidence,render};
})();
