/* NASA POWER historical point observations for Earth Trend Detective.
   Research guide: NASA Data Access (Tabuk pilot), 1981–2025.
   Annualized monthly NASA POWER data. Point samples, NOT area means. */
(() => {
  "use strict";
  const START = 1981, END = 2025;
  const source = "https://power.larc.nasa.gov/api/temporal/monthly/point";
  const variables = {
    temperature: { code: "T2M", label: "Near-surface air temperature", unit: "°C" },
    precipitation: { code: "PRECTOTCORR", label: "Corrected precipitation", unit: "mm/year" },
    humidity: { code: "RH2M", label: "Relative humidity", unit: "%" },
    wind: { code: "WS2M", label: "Wind speed at 2 m", unit: "m/s" }
  };
  const regionNames = {
    "28.3838,36.5662": "Tabuk (point)",
    "24.7,46.7": "Riyadh (point)",
    "40.7,-74": "New York (point)",
    "35.7,139.7": "Tokyo (point)",
    "51.5,-0.1": "London (point)",
    "-33.9,151.2": "Sydney (point)"
  };
  const cache = new Map();
  let chart = null;
  let loading = false;
  const $ = id => document.getElementById(id);
  const safe = x => Number.isFinite(x) && x > -900 ? x : null;
  const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  const status = (text, isError=false) => {
    const el = $("nasa-data-status");
    if(el) {
      el.textContent=text;
      el.style.color=isError ? "#ffb2b2" : "#c7b8ff";
    }
  };
  const getLocation = id => {
    const value = $(id).value;
    const pair = value.split(",").map(Number);
    return { key:value, lat:pair[0],lon:pair[1],name:regionNames[value]||value };
  };
  function requestUrl(loc){
    const p=new URLSearchParams({
      parameters: "T2M,PRECTOTCORR,RH2M,WS2M",
      community:"AG", latitude:String(loc.lat),longitude:String(loc.lon),
      start:String(START),end:String(END),format:"JSON"
    });
    return source+"?"+p.toString();
  }
  function annualize(raw){
    const p=raw?.properties?.parameter;
    if(!p || typeof p!=="object" || !p.T2M) throw Error("NASA response has no monthly observations.");
    const yearData={};
    for(const year of Array.from({length:END-START+1},(_,i)=>START+i)){
      yearData[year]={};
      for(const [variable,meta] of Object.entries(variables)){
        const series=p[meta.code];
        if(!series) continue;
        let numerator=0,weight=0,n=0;
        for(let month=1;month<=12;month++){
          const key=String(year)+String(month).padStart(2,"0");
          const val=safe(Number(series[key]));
          if(val===null)continue;
          const d=daysInMonth(year,month);
          numerator+=val*d;
          weight+=d;
          n++;
        }
        // Reject incomplete years rather than implying full annual coverage.
        if(n!==12) continue;
        yearData[year][variable]= variable==="precipitation" ? numerator : numerator/weight;
      }
    }
    return {years:yearData, units:raw?.parameters, sourceUrl:raw?.header?.api_version};
  }
  function fetchRegion(loc) {
    if(cache.has(loc.key))return cache.get(loc.key);
    const p=fetch(requestUrl(loc),{mode:"cors",cache:"default"})
      .then(async r=>{
        if(!r.ok)throw Error("NASA POWER returned HTTP "+r.status);
        const body=await r.json();
        return annualize(body);
      }).catch(err=>{cache.delete(loc.key);throw err;});
    cache.set(loc.key,p);
    return p;
  }
  function populateYears(years){
    for(const id of ["start-year","end-year"]){
      const select=$(id);
      select.innerHTML="";
      years.forEach(y=>{
        const opt=document.createElement("option");
        opt.value=String(y);opt.textContent=String(y);
        select.append(opt);
      });
      select.disabled=false;
    }
    $("start-year").value=String(years[0]);
    $("end-year").value=String(years[years.length-1]);
  }
  function linearSlope(points){
    if(points.length<3)return null;
    const n=points.length, meanX=points.reduce((a,p)=>a+p[0],0)/n;
    const meanY=points.reduce((a,p)=>a+p[1],0)/n;
    const denom=points.reduce((a,p)=>a+(p[0]-meanX)**2,0);
    return denom>0 ? points.reduce((a,p)=>a+(p[0]-meanX)*(p[1]-meanY),0)/denom : null;
  }
  function metric(id,label,text){
    const el=$(id);
    if(el) {el.querySelector(".metric-label").textContent=label;el.querySelector(".metric-value").textContent=text;}
  }
  function showData(regions){
    const v=$("environment-variable").value;
    const meta=variables[v];
    const first=Number($("start-year").value),last=Number($("end-year").value);
    if(first>last){status("Start Year must be before End Year.",true);return;}
    const years=Array.from({length:last-first+1},(_,i)=>first+i);
    const datasets=regions.map((region,i)=>{
      const values=years.map(y=>region.data.years[y]?.[v]??null);
      const pairs=years.flatMap((y,k)=>values[k]===null?[]:[[y,values[k]]]);
      return {
        label:region.loc.name,
        data:values.map(v=>v===null?null:Number(v.toFixed(3))),
        borderColor:i===0?"#b19aff":"#63d5ed",
        backgroundColor:i===0?"#b19aff":"#63d5ed",
        tension:0.15,spanGaps:false,borderWidth:2,pointRadius:2,
        _slope:linearSlope(pairs),_samples:pairs.length
      };
    });
    const slopes=datasets.map(d=>d._slope);
    const slopeText=slopes.map((s,i)=>s===null?"—":(s>=0?"+":"")+s.toFixed(3)).join(" / ");
    metric("rate-metric","RATE OF CHANGE (REGION 01 / 02)",slopeText+" "+meta.unit+"/year");
    metric("significance-metric","STATISTICAL SIGNIFICANCE","Not yet tested");
    metric("forecast-metric","FUTURE PROJECTION","Not yet validated");
    const canvas=$("nasa-trend-chart");
    if(chart){chart.destroy();chart=null;}
    const available= datasets.some(d=>d._samples>0);
    $("chart-empty").hidden=available;
    canvas.hidden=!available;
    if(!available){status("No complete annual observations for this selection.",true);return;}
    if(typeof Chart==="undefined"){status("Chart library unavailable; NASA observations loaded.",true);return;}
    chart=new Chart(canvas,{
      type:"line",
      data:{labels:years,datasets:datasets.map(({_slope,_samples,...rest})=>rest)},
      options:{
        maintainAspectRatio:false,responsive:true,
        interaction:{mode:"index",intersect:false},
        plugins:{legend:{labels:{color:"#d9e1f9",boxWidth:12}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+c.formattedValue+" "+meta.unit}}},
        scales:{
          x:{ticks:{color:"#9caaca",maxTicksLimit:8},grid:{color:"#ffffff0b"}},
          y:{title:{display:true,text:meta.unit,color:"#bbc6da"},ticks:{color:"#9caaca"},grid:{color:"#ffffff16"}}
        }
      }
    });
    $("nasa-source-details").textContent=
      "NASA POWER monthly point data (1981–2025) · "+meta.label+
      " · "+meta.unit+" · Full 12-month years only · Point samples, not administrative-region averages. "+
      (v==="precipitation"?"Monthly mean daily precipitation rates were multiplied by the number of days in each month.":"Annual mean weighted by days in each month.")+
      " Linear slope is descriptive; statistical significance and forecasts are not yet computed.";
    status("NASA POWER · "+datasets.map(d=>d._samples+" yearly values").join(" / "));
  }
  let active=null;
  async function load(){
    if(loading)return;
    loading=true;
    $("load-nasa-data").disabled=true;
    status("Loading historical observations from NASA POWER…");
    const pair=[getLocation("region1"),getLocation("region2")];
    try{
      const loaded=await Promise.all(pair.map(async loc=>({loc,data:await fetchRegion(loc)})));
      if(!loaded.every(x=>Object.keys(x.data.years).length>0))throw Error("No data returned");
      active=loaded;
      const years=Array.from({length:END-START+1},(_,i)=>START+i).filter(y=>
        loaded.some(r=>Object.values(r.data.years[y]||{}).length>0));
      if(!years.length)throw Error("No complete-year observations returned");
      populateYears(years);
      showData(loaded);
    }catch(err){
      active=null;
      status("NASA data unavailable. Retry or check network. "+err.message,true);
      $("nasa-source-details").textContent="No measurements were loaded. Source: "+source+".";
      $("chart-empty").hidden=false;
      $("nasa-trend-chart").hidden=true;
    }finally{
      loading=false;
      $("load-nasa-data").disabled=false;
    }
  }
  function bind(){
    $("load-nasa-data").addEventListener("click",load);
    for(const id of ["region1","region2"]){$(id).addEventListener("change",load);}
    $("environment-variable").addEventListener("change",()=>{
      if(active)showData(active);
    });
    for(const id of ["start-year","end-year"]){
      $(id).addEventListener("change",()=>{if(active)showData(active);});
    }
    load();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();
