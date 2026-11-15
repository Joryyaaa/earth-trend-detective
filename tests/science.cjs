const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..'),core=require(path.join(base,'data-core.js'));
const src=fs.readFileSync(path.join(base,'nasa-power.js'),'utf8'),context={window:{EarthDataCore:core},Math,Number};
vm.createContext(context);vm.runInContext(src.slice(src.indexOf('  function solve('),src.indexOf('  function setMetric('))+';this.run=checkedForecast;',context);
let models=0;
for(const name of ['tabuk','new-york','madinah']){
 const raw=fs.readFileSync(path.join(base,'data',name+'-daily.json')),snapshot=JSON.parse(fs.readFileSync(path.join(base,'data',name+'.json')));
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),snapshot._source.sha256);
 const data=core.aggregate(JSON.parse(raw));
 for(const variable of Object.keys(core.variables)){
  const points=Object.keys(data).filter(y=>/^\d{4}$/.test(y)&&Number.isFinite(data[y][variable])).map(y=>[+y,data[y][variable]]);
  for(const horizon of [1,3,5]){const f=context.run(points,horizon,variable);models++;if(!f.ok){assert.match(f.message,/Implausible/);continue;}
   assert.equal(f.prediction.year,points.at(-1)[0]+horizon);assert(f.predictions.every(p=>Number.isFinite(p.value)));
   for(const test of f.backtests)assert.equal(test.targetYear-test.trainingEnd,horizon);
   const rmse=Math.sqrt(f.backtests.reduce((s,t)=>s+(t.predicted-t.actual)**2,0)/f.backtests.length);assert(Math.abs(rmse-f.rmse)<1e-10);
  }
 }
 if(name==='tabuk'){
  assert.equal(data[2025].precipitation.toFixed(2),'13.64');assert.equal(data[2025].temperature.toFixed(2),'22.16');
  const seasonal=core.seasonal(data,'precipitation',2001,2025).reduce((s,m)=>s+m.value,0);
  const mean=Array.from({length:25},(_,i)=>data[2001+i].precipitation).reduce((a,b)=>a+b,0)/25;
  assert(Math.abs(seasonal-mean)<1e-9);
  const damaged=JSON.parse(raw);damaged.properties.parameter.T2M['20240101']=null;assert.equal(core.aggregate(damaged,2024,2024)[2024].temperature,undefined);
 }
}
assert.equal(core.valid(null),false);assert.equal(core.valid(-999),false);assert.equal(core.valid(0),true);
assert.equal(core.irrigation(100,20,1,.8,.5),112.5);assert.equal(core.irrigation(100,20,1,0,.5),null);
assert(Math.abs(core.referenceET0(-20,246,20,15,25)-.0023*37.8*Math.sqrt(10)*32.2*.408)<.01);
global.window=global;require(path.join(base,'forecast-locales.js'));require(path.join(base,'planning-locales.js'));
assert.equal(Object.keys(ForecastLocales).length,40);for(const p of Object.values(ForecastLocales)){assert.equal(Object.keys(p.advice).length,7);assert(Object.values(p.text).every(s=>typeof s==='string'&&s.length));}
console.log('PASS: '+models+' real-data model runs; provenance hashes, chronological horizons, missing-data rejection, monthly/annual consistency, FAO check, irrigation arithmetic and 40 language packs.');
