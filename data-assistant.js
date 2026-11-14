/* Earth Trend Detective guided data assistant and globe inspection.
   Responses are deterministic summaries of loaded NASA POWER results,
   not generative AI or autonomous scientific interpretation. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let inspectTarget = "region1";
  const variables = {
    temperature: {label:"near-surface air temperature",unit:"°C"},
    precipitation:{label:"annual precipitation",unit:"mm/year"},
    humidity:{label:"relative humidity",unit:"%"},
    wind:{label:"wind speed",unit:"m/s"}
  };
  const regionName = n => n?.loc?.name || "selected point";
  const fmt = (x,p=2) => Number.isFinite(x)?x.toFixed(p):"not available";
  const years = (v,a,b) => Array.from({length:Math.max(0,b-a+1)},(_,i)=>a+i)
    .filter(y=>Number.isFinite(v?.[y]?.[$("environment-variable").value]))
    .map(y=>[y,v[y][$("environment-variable").value]]);
  const avg = rows => rows.length?rows.reduce((s,r)=>s+r[1],0)/rows.length:null;
  const trend = rows => {
    if(rows.length<3)return null;
    const mx=rows.reduce((s,x)=>s+x[0],0)/rows.length;
    const my=avg(rows);
    const den=rows.reduce((s,x)=>s+(x[0]-mx)**2,0);
    return den?rows.reduce((s,x)=>s+(x[0]-mx)*(x[1]-my),0)/den:null;
  };
  function report(q) {
    const context=window.EarthData?.getCurrent?.();
    if(!context || !context.loaded) return "I need verified NASA POWER observations first. Select two points and use Refresh NASA observations. I won't invent values.";
    const v=$("environment-variable").value;
    const u=variables[v].unit;
    const a=Number($("start-year").value),b=Number($("end-year").value);
    const mode=$("comparison-mode").value;
    if(!(a<=b))return "Choose a valid Start Year and End Year first.";
    const mid=Math.floor((a+b)/2);
    const d1=context.locations[0], d2=context.locations[mode==="periods"?0:1];
    const r1=years(d1.data,a,mode==="periods"?mid:b);
    const r2=years(d2.data,mode==="periods"?mid+1:a,b);
    const label1=mode==="periods"?"earlier period ("+a+"–"+mid+")":regionName(d1);
    const label2=mode==="periods"?"later period ("+(mid+1)+"–"+b+")":regionName(d2);
    const slope1=trend(r1),slope2=trend(r2);
    if(/source|nasa|data|quality|where|موثوق|مصدر|البيانات/.test(q)) {
      return "Source: NASA POWER monthly point API, summarized to complete annual values. This is modeled/reanalysis-informed meteorological point data, not an administrative regional average. Exact dataset, version, grid resolution and error need verification before publication. The globe image is a static visual background, not a historical satellite layer.";
    }
    if(/predict|future|forecast|توقع|المستقبل|next|2026|2030/.test(q)) {
      const fc=context.forecast;
      if(!fc?.ok)return "Forecast is not available for these observations. Select a longer, continuous historical period and open AI Forecast for the model's validation details.";
      const quality=fc.validated?"passed":"did not beat";
      return "Exploratory autoregressive ML estimate for "+fc.prediction.year+" at "+regionName(d1)+": "+fmt(fc.prediction.value)+" "+u+". The model "+quality+" the naive persistence baseline on "+fc.holdout+" held-out one-year predictions (RMSE "+fmt(fc.rmse)+" vs "+fmt(fc.naive)+"). This does NOT predict specific disasters or weather events; projections beyond one year are not separately validated.";
    }
    if(/signif|p.value|mann|statist|دلال|احصائ|إحصائ/.test(q)) {
      return "The Trends / Insights area shows exploratory Mann–Kendall p-values for the selected annual series. Its usual independence assumption matters: if serial correlation is appreciable, p-values should not be interpreted as reliable evidence. This is a preliminary trend diagnostic, not proof of climate causation.";
    }
    if(/why|cause|reason|السبب|ليش|لماذا/.test(q)) {
      return "NASA POWER point trends alone cannot identify the cause of a difference. Potential hypotheses include geography, elevation, land cover, coastal influence and circulation, but testing them needs additional covariates and independent references. I won't claim a cause from correlation.";
    }
    if(/compare|difference|region|فرق|قارن|مقارنه|مقارنة/.test(q)) {
      const delta=avg(r1)!==null&&avg(r2)!==null?avg(r2)-avg(r1):null;
      return "For "+variables[v].label+" over your chosen years: "+label1+" mean "+fmt(avg(r1))+" "+u+" ("+r1.length+" years), "+label2+" mean "+fmt(avg(r2))+" "+u+" ("+r2.length+" years). Difference (second minus first): "+fmt(delta)+" "+u+". The series may use different windows if same-site mode is selected.";
    }
    const dir = s => s===null?"unavailable":s>0?"increasing":s<0?"decreasing":"stable";
    return "Selected variable: "+variables[v].label+". "+label1+" trend is "+dir(slope1)+" at "+fmt(slope1,3)+" "+u+"/year; "+label2+" trend is "+dir(slope2)+" at "+fmt(slope2,3)+" "+u+"/year. This is a descriptive linear rate; check statistical significance and uncertainty separately.";
  }
  // One-step undo restores the exact pre-edit chat messages in memory.
  let previousChat = null;
  function chatLog(){return $("assistant-log");}
  function snapshot(){return [...chatLog().children].map(node=>({text:node.textContent,kind:node.classList.contains("user")?"user":"assistant"}));}
  function restore(items){
    const log=chatLog();log.replaceChildren();
    for(const item of items)addMessage(item.text,item.kind);
  }
  function rememberAction(){
    previousChat=snapshot();
    $("assistant-undo").disabled=false;
  }
  function undo(){
    if(!previousChat)return;
    const old=previousChat;previousChat=null;
    restore(old);
    $("assistant-undo").disabled=true;
  }
  function deleteLast(){
    const log=chatLog(),messages=[...log.children];
    const lastUserIndex=messages.map(e=>e.classList.contains("user")).lastIndexOf(true);
    if(lastUserIndex===-1)return;
    rememberAction();
    messages.slice(lastUserIndex).forEach(e=>e.remove());
  }
  function clearChat(){
    if(!chatLog().children.length)return;
    rememberAction();
    chatLog().replaceChildren();
  }
  function addMessage(text,kind){
    const log=$("assistant-log");
    if(!log)return;
    const p=document.createElement("div");
    p.className="assistant-bubble "+kind;
    p.textContent=text;log.appendChild(p);
    log.scrollTop=log.scrollHeight;
  }
  function ask(input) {
    const query=String(input||"").trim();
    if(!query)return;
    addMessage(query,"user");
    addMessage(report(query.toLowerCase()),"assistant");
  }
  function binding() {
    $("assistant-clear")?.addEventListener("click",clearChat);
    $("assistant-delete-last")?.addEventListener("click",deleteLast);
    $("assistant-undo")?.addEventListener("click",undo);
    const form=$("assistant-form");
    if(form){
      form.addEventListener("submit",e=>{
        e.preventDefault(); const input=$("assistant-input");
        const q=input.value;input.value="";ask(q);
      });
      document.querySelectorAll("[data-question]").forEach(btn=>btn.addEventListener("click",()=>ask(btn.dataset.question)));
    }
    document.querySelectorAll("[data-view],[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
      const view=btn.dataset.view||btn.dataset.tab;
      if(view==="assistant")window.setTimeout(()=>$("assistant-input")?.focus(),30);
    }));
    // Clicking either globe selects its data point (not a pixel-level historical map).
    [
      ["globe1","region1",typeof earth1!=="undefined"?earth1:null],
      ["globe2","region2",typeof earth2!=="undefined"?earth2:null]
    ].forEach(([id,selectId,globe])=>{
      if(!globe || !globe.onGlobeClick)return;
      globe.onGlobeClick(({lat,lng})=>{
        const select=$(selectId);
        const key=lat.toFixed(4)+","+lng.toFixed(4);
        let option=[...select.options].find(o=>o.value===key);
        if(!option){option=new Option("Custom point "+lat.toFixed(2)+"°, "+lng.toFixed(2)+"°",key);select.add(option);}
        select.value=key;
        select.dispatchEvent(new Event("change"));
        const marker=$(id==="globe1"?"globe-inspect-1":"globe-inspect-2");
        if(marker)marker.textContent="Selected "+lat.toFixed(3)+"°, "+lng.toFixed(3)+"° · Loading NASA observations for this point";
      });
    });
    window.addEventListener("earth:data-updated",()=>{
      const c=window.EarthData?.getCurrent?.();
      if(!c?.loaded)return;
      const variable=$("environment-variable").value;
      const mode=$("comparison-mode").value;
      const startYear=Number($("start-year").value),endYear=Number($("end-year").value);
      const middle=Math.floor((startYear+endYear)/2);
      [1,2].forEach(i=>{
        const marker=$("globe-inspect-"+i);
        const target=c.locations[mode==="periods"?0:i-1];
        if(!marker||!target)return;
        const a=mode==="periods"?(i===1?startYear:middle+1):startYear;
        const b=mode==="periods"?(i===1?middle:endYear):endYear;
        const series=years(target.data,a,b);
        const mean=avg(series),sl=trend(series);
        const label=mode==="periods"?(i===1?"EARLIER YEARS":"LATER YEARS"):"SELECTED NASA POINT";
        marker.textContent=label+" · "+a+"–"+b+
          " · "+series.length+" values · mean "+fmt(mean)+" "+variables[variable].unit+
          " · slope "+fmt(sl,3)+" "+variables[variable].unit+"/yr";
        const globe=i===1?earth1:earth2;
        if(globe&&globe.pointColor)globe.pointColor(()=>mode==="periods"?(i===1?"#c1a8ff":"#63d5ed"):"#ffd57a");
      });
    });
    addMessage("Choose a suggested question, or ask about the current location, trends, statistics or experimental forecast. Answers use the observations shown in this dashboard.","assistant");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",binding);
  else binding();
})();
