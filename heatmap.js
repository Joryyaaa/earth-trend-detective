/* Sparse spatial NASA POWER point-sample heat layer.
   3x3 grid at approximate native meteorological resolution.
   NOT a contiguous raster or satellite imagery. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const ENDPOINT="https://power.larc.nasa.gov/api/temporal/monthly/point";
const CODES={temperature:"T2M",precipitation:"PRECTOTCORR",humidity:"RH2M",wind:"WS2M"};
const UNITS={temperature:"°C",precipitation:"mm/year",humidity:"%",wind:"m/s"};
const cache=new Map();
let current=null,serial=0;
const days=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
const safe=(v)=>Number.isFinite(v)&&v>-900;
const format=(n)=>Number.isFinite(n)?n.toFixed(2):"no data";
function status(str,error=false){const el=$("heat-status");if(!el)return;el.textContent=str;el.style.color=error?"#ffb5b5":"#b2c6ee";}
function globeFor(id){return id==="region1"?earth1:earth2;}
function marker(id){
  const [lat,lng]=$(id).value.split(",").map(Number);
  return {lat,lng,kind:"selected",color:"#ffe49f"};
}
function clear(){
  serial++;
  if(current?.id){
    const globe=globeFor(current.id);
    globe.pointsData([marker(current.id)]);
    globe.pointRadius(d=>d.kind==="selected"?.65:1.35);
    globe.pointAltitude(d=>d.kind==="selected"?.025:.014);
    globe.pointColor(d=>d.color||"#ffe49f");
    globe.pointLabel(d=>d.kind==="selected"?"Selected point":"");
  }
  current=null;
  $("heat-clear").disabled=true;
  $("heat-legend").hidden=true;
  status("Choose region and year, then generate sampled heatmap.");
}
function annual(raw,year,v){
  const series=raw?.properties?.parameter?.[CODES[v]];
  if(!series)return null;
  let n=0,total=0,weight=0;
  for(let month=1;month<=12;month++){
    const value=Number(series[String(year)+String(month).padStart(2,"0")]);
    if(!safe(value))continue;
    const d=days(year,month);
    total+=value*d;weight+=d;n++;
  }
  return n===12?(v==="precipitation"?total:total/weight):null;
}
function sampleAt(lat,lng,year,variable){
  const key=[lat.toFixed(3),lng.toFixed(3),year,variable].join("|");
  if(cache.has(key))return cache.get(key);
  const params=new URLSearchParams({parameters:CODES[variable],community:"AG",
    longitude:lng.toFixed(4),latitude:lat.toFixed(4),start:String(year),end:String(year),
    format:"JSON"});
  const promise=fetch(ENDPOINT+"?"+params.toString(),{mode:"cors"})
    .then(async r=>{if(!r.ok)throw Error("NASA HTTP "+r.status);return annual(await r.json(),year,variable);})
    .catch(e=>{cache.delete(key);throw e});
  cache.set(key,promise);return promise;
}
function color(t){
  // Cyan -> violet -> magenta -> orange; normalized to this sampled area only.
  const stops=[[0,"#38cfee"],[.33,"#7389ff"],[.68,"#d46cef"],[1,"#ff9c60"]];
  for(let k=1;k<stops.length;k++){
    if(t<=stops[k][0]){
      const a=stops[k-1],b=stops[k],r=(t-a[0])/(b[0]-a[0]);
      const aa=[1,3,5].map(i=>parseInt(a[1].slice(i,i+2),16));
      const bb=[1,3,5].map(i=>parseInt(b[1].slice(i,i+2),16));
      return "#"+aa.map((v,i)=>Math.round(v+r*(bb[i]-v)).toString(16).padStart(2,"0")).join("");
    }
  }
  return stops.at(-1)[1];
}
async function generate(){
  const id=$("heat-region").value;
  const input=$("timeline-year");
  const year=Number(input?.value||$("end-year").value);
  const variable=$("environment-variable").value;
  if(!Number.isInteger(year)||!CODES[variable]||$("start-year").disabled){
    status("Load historical NASA data before generating a heatmap.",true);return;
  }
  const seq=++serial;
  $("heat-run").disabled=true;
  status("Sampling 9 NASA POWER grid locations for "+year+"…");
  const point=marker(id);
  // POWER native meteorological grid is about 0.5° x 0.625°.
  const samples=[];
  for(const dLat of [-.5,0,.5])for(const dLon of [-.625,0,.625]){
    const lat=Math.min(89,Math.max(-89,point.lat+dLat)),lng=Math.min(179,Math.max(-179,point.lng+dLon));
    samples.push({lat,lng});
  }
  try{
    const results=[];
    // Sequential batches avoid flooding a public NASA endpoint.
    for(let start=0;start<samples.length;start+=2){
      if(seq!==serial)return;
      const part=await Promise.allSettled(samples.slice(start,start+2).map(async p=>({
        ...p,value:await sampleAt(p.lat,p.lng,year,variable)
      })));
      part.forEach(r=>{if(r.status==="fulfilled"&&Number.isFinite(r.value.value))results.push(r.value)});
      status("NASA POWER heat layer · "+Math.min(start+2,samples.length)+"/9 samples requested");
    }
    if(seq!==serial)return;
    if(results.length<4)throw Error("Not enough valid nearby point values for a spatial layer.");
    const low=Math.min(...results.map(p=>p.value)),high=Math.max(...results.map(p=>p.value));
    const normalized=v=>(v-low)/Math.max(high-low,.0001);
    const points=results.map(p=>({...p,kind:"heat",color:color(normalized(p.value))}));
    const main={...point,kind:"selected",color:"#ffe49f"};
    const globe=globeFor(id);
    // Keep the other globe untouched. All 9 circles show sampled POWER points.
    globe.pointsData([...points,main]);
    globe.pointRadius(d=>d.kind==="selected"?.6:1.35);
    globe.pointAltitude(d=>d.kind==="selected"?.03:.013);
    globe.pointColor(d=>d.color);
    globe.pointLabel(d=>d.kind==="selected"?"Selected center":
      "NASA POWER point "+d.value.toFixed(2)+" "+UNITS[variable]+" ("+year+")");
    globe.pointOfView({lat:point.lat,lng:point.lng,altitude:1.8},900);
    current={id,year,variable};
    $("heat-clear").disabled=false;
    $("heat-legend").hidden=false;
    $("heat-min").textContent=format(low)+" "+UNITS[variable];
    $("heat-max").textContent=format(high)+" "+UNITS[variable];
    status(results.length+" actual NASA POWER point samples shown on "+(id==="region1"?"Earth 01":"Earth 02")+
      ". Colors are relative to the 9 sampled points, NOT a continuous satellite heatmap.");
  }catch(e){
    if(seq===serial)status("Heatmap unavailable: "+e.message,true);
  }finally{
    if(seq===serial)$("heat-run").disabled=false;
  }
}
function bind(){
  $("heat-run")?.addEventListener("click",generate);
  $("heat-clear")?.addEventListener("click",clear);
  for(const id of ["timeline-year","region1","region2","environment-variable","heat-region","comparison-mode"]){
    $(id)?.addEventListener("change",()=>{
      if(current)clear();
    });
  }
  window.addEventListener("earth:data-updated",()=>{
    // Changes to date range or dataset selection invalidate existing heat layer.
    if(current && ($("environment-variable").value!==current.variable ||
      Number($("timeline-year").value)!==current.year))clear();
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();