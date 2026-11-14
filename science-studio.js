/* Earth System Detective prediction / report presentation.
 * Only uses the NASA POWER analyses already computed by nasa-power.js.
 * Forecasts are exploratory model estimates, NOT NASA forecasts. */
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const units={temperature:"°C",precipitation:"mm/year",humidity:"%",wind:"m/s"};
 const names={temperature:"Near-surface temperature",precipitation:"Corrected precipitation",humidity:"Relative humidity",wind:"Wind speed"};
 const fmt=(n,d=2)=>Number.isFinite(n)?Number(n).toFixed(d):"Not available";
 let predictionChart=null;
 function context(){
   const state=window.EarthData?.getCurrent?.();
   if(!state?.loaded||!state.analyses)return null;
   return {state,analysis:state.analyses,unit:units[state.analyses.variable]||"",label:names[state.analyses.variable]||state.analyses.variable};
 }
 function dom(tag,cls,text){
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=text;
   return el;
 }
 function prediction(){
   const root=$("lab-results"),heading=$("lab-message");
   if(!root||!heading)return;
   const c=context();
   root.replaceChildren();
   if(predictionChart){predictionChart.destroy();predictionChart=null;}
   if(!c){heading.textContent="Connect NASA POWER observations to analyze the selected regions.";return;}
   const {state,analysis:a,unit,label}=c;
   heading.textContent=label+" · historical data "+a.start+"–"+a.end+" · "+(a.temporal?"one point":"two point locations");
   const candidates=a.temporal?[state.locations[0]]:state.locations;
   const results=state.forecastResults||[];
   for(let i=0;i<candidates.length;i++){
     const region=candidates[i],f=results[i]?.result;
     const card=dom("article","lab-region-card");
     const title=dom("div","lab-location",region.loc.name);
     const value=dom("div","lab-future-value",f?.ok?fmt(f.prediction.value)+" "+unit:"No validated estimate");
     const year=dom("div","lab-year",f?.ok?"MODEL ESTIMATE · "+f.prediction.year:"MODEL STATUS");
     const flag=dom("div","lab-flag",f?.ok?(f.validated?"Better than baseline":"Below baseline — low confidence"):(f?.message||"Insufficient data"));
     flag.dataset.quality=f?.ok&&f.validated?"good":"caution";
     const scores=dom("div","lab-scores");
     scores.append(dom("span","", "Holdout RMSE "+fmt(f?.rmse)),dom("span","","Naive baseline "+fmt(f?.naive)));
     card.append(title,year,value,flag,scores);root.append(card);
   }
   const canvas=$("lab-chart");
   if(!canvas||typeof Chart==="undefined")return;
   const maximum=Math.max(a.end,...results.flatMap(r=>r?.result?.predictions?.map(p=>p.year)||[]));
   const ys=Array.from({length:Math.max(1,maximum-a.start+1)},(_,i)=>a.start+i);
   const colors=["#b69dff","#65dbed"];
   const series=[];
   candidates.forEach((region,i)=>{
     const f=results[i]?.result;
     series.push({
       label:region.loc.name+" · observed",
       data:ys.map(y=>y<=a.end?region.data[y]?.[a.variable]??null:null),
       borderColor:colors[i],backgroundColor:colors[i],borderWidth:2.5,pointRadius:1,tension:.2,spanGaps:false
     });
     if(f?.ok){
       const predictions=new Map((f.predictions||[]).map(p=>[p.year,p.value]));
       series.push({
         label:region.loc.name+" · experimental model",
         data:ys.map(y=>y===a.end?region.data[y]?.[a.variable]??null:predictions.get(y)??null),
         borderColor:colors[i],borderDash:[7,5],borderWidth:2.5,pointRadius:4,spanGaps:false
       });
     }
   });
   predictionChart=new Chart(canvas,{
     type:"line",data:{labels:ys,datasets:series},
     options:{responsive:true,maintainAspectRatio:false,
       plugins:{legend:{labels:{color:"#dae2fc",boxWidth:12}}},
       scales:{x:{grid:{color:"#ffffff0d"},ticks:{color:"#aab5d2",maxTicksLimit:9}},
       y:{grid:{color:"#ffffff18"},ticks:{color:"#aab5d2"},title:{display:true,text:unit,color:"#b9c9e5"}}}}
   });
 }
 function makeLine(parent,key,value){
   const row=dom("div","report-row");
   row.append(dom("span","",key),dom("strong","",value));
   parent.append(row);
 }
 function report(){
   const root=$("report-preview");if(!root)return;
   const c=context();
   root.replaceChildren();
   if(!c){root.append(dom("p","report-empty","Waiting for verified NASA POWER observations. Choose locations and refresh NASA data."));return;}
   const {state,analysis:a,unit,label}=c;
   root.append(dom("div","report-kicker","NASA SPACE APPS CHALLENGE 2026 · SCIENTIFIC DATA REPORT"));
   root.append(dom("h2","", "EARTH SYSTEM DETECTIVE"));
   root.append(dom("p","report-subtitle",label+" · "+a.start+"–"+a.end+" · "+(a.temporal?"same location across two periods":"two-location comparison")));
   const titles=a.temporal?["Earlier period","Later period"]:state.locations.map((l,i)=>"Earth 0"+(i+1)+" · "+l.loc.name);
   a.groups.forEach((group,i)=>{
     const pane=dom("section","report-location");
     pane.append(dom("h3","",titles[i]));
     makeLine(pane,"Annual observations",String(group.length));
     makeLine(pane,"Mean",fmt(a.means[i])+" "+unit);
     makeLine(pane,"Linear slope",fmt(a.slopes[i],3)+" "+unit+"/year");
     makeLine(pane,"Theil–Sen trend",a.senSlopes?.[i]!=null?fmt(a.senSlopes[i]*10,3)+" "+unit+"/decade":"Not available");
     const test=a.stats[i];
     makeLine(pane,"Mann–Kendall (exploratory)",test?.p!=null?(test.p<0.001?"p < 0.001":"p="+fmt(test.p,3))+" · "+test.label:"Not available");
     if(test?.p!=null)makeLine(pane,"Trend direction",a.senSlopes?.[i]>0?"Increasing":a.senSlopes?.[i]<0?"Decreasing":"No detected slope");
     if(test?.autocorr!=null&&Math.abs(test.autocorr)>0.2)makeLine(pane,"Statistical caution","Serial correlation flagged; unadjusted p-value is not reliable");
     root.append(pane);
   });
   const forecasts=state.forecastResults||[];
   root.append(dom("h3","report-heading","EXPERIMENTAL PREDICTIONS"));
   forecasts.forEach((item,i)=>{
     const f=item?.result;
     makeLine(root,item?.loc?.name||"Point "+(i+1),f?.ok?
       f.prediction.year+": "+fmt(f.prediction.value)+" "+unit+" · "+(f.validated?"beats":"does not beat")+" naive "+(f.horizon||1)+"-year holdout baseline":
       "Unavailable ("+(f?.message||"not computed")+")");
   });
   root.append(dom("h3","report-heading","SOURCE & LIMITATIONS"));
   root.append(dom("p","report-small",
     "NASA POWER monthly meteorological point products, aggregated into complete calendar-year summaries. "+
     "These are point estimates, not administrative-region means. Mann–Kendall significance is exploratory "+
     "and unadjusted for serial correlation. Autoregressive ridge forecasts were evaluated using "+
     "rolling-origin historical holdouts at the selected 1, 3 or 5-year horizon. Prediction "+
     "intervals and future accuracy are not guaranteed. No historical Earth image or spatial interpolation is a direct "+
     "satellite measurement. Source: https://power.larc.nasa.gov/"));
 }
 function printReport(){
   report();
   if(!context())return;
   window.print();
 }
 function exportReport(){
   report();if(!context())return;
   const root=$("report-preview");
   const stylesheet="<style>body{font:15px Arial;background:#fff;color:#18213d;margin:35px;line-height:1.7}h2{font-size:28px}section{border-top:1px solid #dce4f0;margin:20px 0;padding:8px}.report-row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e8e9f1;padding:6px 0}.report-kicker{color:#6358a2}.report-small{font-size:12px;color:#4f5b78}</style>";
   const payload='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Earth System Detective Report</title>'+stylesheet+'</head><body>'+root.innerHTML+'</body></html>';
   const blob=new Blob([payload],{type:"text/html;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const anchor=document.createElement("a");
   anchor.href=url;anchor.download="earth-system-detective-report.html";
   anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 function bind(){
   $("report-generate")?.addEventListener("click",report);
   $("report-print")?.addEventListener("click",printReport);
   $("report-export")?.addEventListener("click",exportReport);
   $("forecast-horizon")?.addEventListener("change",()=>{prediction();report();});
   window.addEventListener("earth:data-updated",()=>{prediction();report();});
   document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{
     if(b.dataset.view==="prediction-lab")prediction();
     if(b.dataset.view==="reports")report();
   }));
   prediction();report();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();