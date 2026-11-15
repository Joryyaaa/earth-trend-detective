const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),core=require(path.join(base,'data-core.js'));
const window={EarthDataCore:core},document={readyState:'loading',addEventListener(){}};
const context={window,document,Intl,localStorage:{getItem(){return null;}},console};vm.createContext(context);
for(const file of ['forecast-locales.js','planning-locales.js','platform-locales.js','platform-more-locales.js','platform-science-locales.js','platform-i18n.js','selection-locales.js','role-evidence.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
assert.equal(Object.keys(window.PlatformI18n.dictionaries).length,40);
for(const [code,dictionary]of Object.entries(window.PlatformI18n.dictionaries)){
 for(const key of window.PlatformLocaleKeys)assert.equal(typeof dictionary[key],'string',code+': '+key);
 assert(window.PlatformScienceLocales[code]);assert(window.PlatformAllLabels[code]);
}
const data=JSON.parse(fs.readFileSync(path.join(base,'data/tabuk.json'))),region={loc:{name:'Tabuk'},data};
const analysis={start:1981,end:2025,variable:'temperature'},forecast={ok:true,prediction:{year:2026,value:22.346},rmse:.36,naive:.50,holdout:8};
let cases=0;
for(const role of ['public','farmer','engineer','student','scientist','researcher','specialist'])for(const age of ['','child','teen','adult','senior']){
 const result=window.RoleEvidence.evidence(region,analysis,forecast,role,age);cases++;
 assert.equal(result.forecastValue,22.346);assert.equal(result.forecastYear,2026);assert.equal(result.years,45);
 if(role==='farmer'){
  const wet=result.metrics.find(m=>m.key==='wet'),dry=result.metrics.find(m=>m.key==='dry');assert(wet.value>=dry.value);assert.equal(wet.month,1);assert.equal(dry.month,7);
  assert(result.metrics.filter(m=>m.key==='temperature').every(m=>m.unit==='°C'));
 }
 if(role==='engineer'||role==='specialist'){assert.equal(result.metrics.find(m=>m.key==='hotDays').value,146);assert.equal(result.metrics.find(m=>m.key==='peak').value,44.97);}
 if(role==='researcher'||role==='scientist')assert.equal(result.metrics.find(m=>m.key==='error').value,.36);
 if(role==='student'||role==='public'){const comparison=result.metrics.find(m=>m.key==='start');assert.equal(comparison.period[1],age==='child'?1981:1985);}
}
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');assert(html.indexOf('platform-i18n.js')<html.indexOf('role-modes.js'));assert(html.includes('20261115-platform-roles-2'));
console.log('PASS: 40 complete offline vocabularies, 40 scientific disclosures, 35 role/age evidence combinations; role changes never alter model values; real hot-day counts and seasonal extrema checked.');
