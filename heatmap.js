/* Two independent sampled spatial displays for NASA POWER point observations.
   Color-filled comparison cells use NASA point samples, not raster measurements
   of cell interiors, administrative averages or historical satellite imagery. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const API="https://power.larc.nasa.gov/api/temporal/monthly/point";
const CODES={temperature:"T2M",precipitation:"PRECTOTCORR",humidity:"RH2M",wind:"WS2M"};
const UNITS={temperature:"°C",precipitation:"mm/year",humidity:"%",wind:"m/s"};
const cache=new Map();
let activeToken=0,overlays={};
const days=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
const valid=x=>Number.isFinite(x)&&x>-900;
const fmt=x=>Number.isFinite(x)?x.toFixed(2):"—";
const globes={region1:()=>earth1,region2:()=>earth2};
function status(text,error=false){
 const e=$("heat-status");
 if(e){e.textContent=text;e.style.color=error?"#ffb2c0":"#aee6ed";}
}
function point(id){
 const pair=$(id).value.split(",").map(Number);
 return {lat:pair[0],lng:pair[1]};
}
function baseMarker(id){
 return {...point(id),kind:"selected",color:"#ffe7a8"};
}
function cleanGlobe(id){
 const g=globes[id]();
 g.polygonsData([]);
 g.pointsData([baseMarker(id)]);
 g.pointColor(() => "#ffe7a8");
 g.pointRadius(.55);
 g.pointAltitude(.022);
 g.pointOfView({...point(id),altitude:2.3},450);
}
function clearHeat(){
 activeToken++;
 for(const id of ["region1","region2"]){
   if(overlays[id])cleanGlobe(id);
   delete overlays[id];
   const box=$(id==="region1"?"heat-card-1":"heat-card-2");
   if(box)box.hidden=true;
 }
 $("heat-clear").disabled=true;
 $("heat-legend").hidden=true;
 $("heat-run").disabled=false;
 status("Heat layers cleared. Choose Earth 01, Earth 02 or BOTH.");
}
function getAnnual(raw,year,v){
 const monthly=raw?.properties?.parameter?.[CODES[v]];
 if(!monthly)return null;
 let sum=0,daysTotal=0,count=0;
 for(let m=1;m<=12;m++){
   const x=monthly[year+String(m).padStart(2,"0")];
   if(!valid(x))continue;
   const d=days(year,m);sum+=x*d;daysTotal+=d;count++;
 }
 if(count!==12)return null;
 return v==="precipitation"?sum:sum/daysTotal;
}
async function sample(lat,lng,year,variable){
 const key=[lat.toFixed(4),lng.toFixed(4),year,variable].join("|");
 if(cache.has(key))return cache.get(key);
 const p=new URLSearchParams({parameters:CODES[variable],community:"AG",latitude:String(lat),longitude:String(lng),start:String(year),end:String(year),format:"JSON"});
 const promise=fetch(API+"?"+p,{mode:"cors",signal:AbortSignal.timeout(10000)}).then(async response=>{
   if(!response.ok)throw new Error("NASA HTTP "+response.status);
   return getAnnual(await response.json(),year,variable);
 }).catch(err=>{cache.delete(key);throw err;});
 cache.set(key,promise);
 return promise;
}
function palette(t){
 const stops=[[0,[38,197,234]],[.35,[98,126,244]],[.68,[194,92,229]],[1,[255,155,97]]];
 const v=Math.min(1,Math.max(0,t));
 for(let i=1;i<stops.length;i++){
   const a=stops[i-1],b=stops[i];
   if(v<=b[0]){
    const k=(v-a[0])/(b[0]-a[0]);
    return "rgb("+a[1].map((n,j)=>Math.round(n+(b[1][j]-n)*k)).join(",")+")";
   }
 }
 return "rgb(255,155,97)";
}
function bounds(lat,lng,latHalf=.25,lonHalf=.3125){
 // Each translucent patch represents a point sample only, not measured polygon.
 return [
   [lng-lonHalf,lat-latHalf],[lng+lonHalf,lat-latHalf],
   [lng+lonHalf,lat+latHalf],[lng-lonHalf,lat+latHalf],
   [lng-lonHalf,lat-latHalf]
 ];
}
async function collect(id,year,variable,token){
 const origin=point(id);
 const samplePoints=[];
 // Nine distinct grid-center samples, spaced to prevent overlapping markers.
 for(const dy of [-.5,0,.5])for(const dx of [-.625,0,.625]){
   const lat=Math.max(-88,Math.min(88,origin.lat+dy));
   let lng=origin.lng+dx;
   lng=((lng+180)%360+360)%360-180;
   samplePoints.push({lat,lng});
 }
 const output=[];
 // Batches of three to reduce load on the public NASA service.
 for(let i=0;i<samplePoints.length;i+=3){
  if(token!==activeToken)return null;
  const batch=await Promise.allSettled(samplePoints.slice(i,i+3).map(async p=>({...p,value:await sample(p.lat,p.lng,year,variable)})));
  if(token!==activeToken)return null;
  for(const entry of batch)if(entry.status==="fulfilled"&&valid(entry.value.value))output.push(entry.value);
  status("Retrieving NASA "+(id==="region1"?"Earth 01":"Earth 02")+" observations: "+Math.min(i+3,9)+"/9 points…");
 }
 return output;
}
function draw(id,data,year,variable,low,high){
 const globe=globes[id](),center=point(id);
 const range=high-low;
 // Draw only the nine sampled patches, close to the globe surface.
 const patches=data.map(p=>{
   const color=palette(high===low ? .5 : (p.value-low)/range);
   return {
     geometry:{type:"Polygon",coordinates:[bounds(p.lat,p.lng,.22,.28)]},
     color:color.replace("rgb(","rgba(").replace(")",",0.8)"),
     label:fmt(p.value)+" "+UNITS[variable]
   };
 });
 globe.controls().autoRotate=false;
 globe.polygonAltitude(.002);
 globe.polygonCapColor("color");
 globe.polygonSideColor(()=>"rgba(0,0,0,0)");
 globe.polygonLabel("label");
 globe.polygonsTransitionDuration(0);
 globe.polygonsData(patches);
 globe.pointsData([{...center,kind:"selected"}]);
 globe.pointRadius(.12);
 globe.pointColor(() => "#ffffff");
 globe.pointAltitude(.025);
 globe.pointLabel(() => "Selected NASA POWER point");
 globe.pointOfView({lat:center.lat,lng:center.lng,altitude:.19},650);
 const card=$(id==="region1"?"heat-card-1":"heat-card-2");
 if(card){
   card.hidden=false;
   card.querySelector(".heat-card-title").textContent=$(id).selectedOptions[0]?.textContent+" · "+year;
   card.querySelector(".heat-card-range").textContent=
     "Nearby NASA values: "+fmt(Math.min(...data.map(d=>d.value)))+
     "–"+fmt(Math.max(...data.map(d=>d.value)))+" "+UNITS[variable];

 }
 overlays[id]={year,variable};
}
async function render(){
 const value=$("heat-region").value;
 const ids=value==="both"?["region1","region2"]:[value];
 const year=Number($("timeline-year").value);
 const variable=$("environment-variable").value;
 if(!Number.isInteger(year)||year<1981||year>2025||$("timeline-year").disabled){
   status("Load NASA observations and select a valid year first.",true);return;
 }
 const token=++activeToken;
 $("heat-run").disabled=true;
 status("Starting "+ids.length+" independent NASA point-sampled heat layers…");
 try{
   const panels=[];
   for(const id of ids){
     const points=await collect(id,year,variable,token);
     if(token!==activeToken)return;
     if(!points||points.length<4)throw new Error("Too few NASA observations for "+(id==="region1"?"Earth 01":"Earth 02")+". Try again or select another year.");
     panels.push({id,points});
   }
   if(token!==activeToken)return;
   // One consistent global color scale across BOTH Earths, so the comparison
   // is not misleading from separately normalized scales.
   const values=panels.flatMap(p=>p.points.map(v=>v.value));
   const low=Math.min(...values),high=Math.max(...values);
   for(const id of ["region1","region2"]){
     if(!ids.includes(id)&&overlays[id]){cleanGlobe(id);delete overlays[id];$(id==="region1"?"heat-card-1":"heat-card-2").hidden=true;}
   }
   panels.forEach(({id,points})=>draw(id,points,year,variable,low,high));
   $("heat-clear").disabled=false;
   $("heat-legend").hidden=false;
   $("heat-min").textContent=fmt(low)+" "+UNITS[variable];
   $("heat-max").textContent=fmt(high)+" "+UNITS[variable];
   status(panels.map(p=>(p.id==="region1"?"Earth 01":"Earth 02")+": "+p.points.length+" valid samples").join(" · ")+
     ". Colors show sampled values on one scale.");
 }catch(e){
   if(token===activeToken)status("NASA heat layer could not load: "+e.message,true);
 }finally{if(token===activeToken)$("heat-run").disabled=false;}
}
function bind(){
 $("heat-run")?.addEventListener("click",render);
 document.querySelectorAll("[data-heat-target]").forEach(button=>{
   button.addEventListener("click",()=>{
     $("heat-region").value=button.dataset.heatTarget;
     render();
   });
 });
 $("heat-clear")?.addEventListener("click",clearHeat);
 // Avoid showing the wrong year or location after a selection changes.
 for(const id of ["region1","region2","comparison-mode","environment-variable","timeline-year","heat-region","start-year","end-year"]){
   $(id)?.addEventListener("change",()=>{if($("heat-run").disabled || Object.keys(overlays).length)clearHeat();});
 }
 // During playback, mark any spatial layer as out of date instead of
 // pretending it animates historic gridded surfaces.
 $("timeline-year")?.addEventListener("input",()=>{if($("heat-run").disabled || Object.keys(overlays).length)clearHeat();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();