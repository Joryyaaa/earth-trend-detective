/* Earth Trend Detective: NASA POWER daily UTC point data.
   Exploratory Mann–Kendall and ML forecasts; not regional averages or NASA forecasts. */
(() => {
  "use strict";
  const START=1981, END=2025;
  const SOURCE="https://power.larc.nasa.gov/api/temporal/daily/point";
  const vars=window.EarthDataCore.variables;
  const names={
    "28.3838,36.5662":"Tabuk (point)",
    "24.4709,39.6122":"Madinah (point)",
    "24.7,46.7":"Riyadh (point)",
    "40.7,-74":"New York (point)",
    "35.7,139.7":"Tokyo (point)",
    "51.5,-0.1":"London (point)",
    "-33.9,151.2":"Sydney (point)"
  };
  const $=id=>document.getElementById(id);
  const cache=new Map();
  let chart=null, active=null, requestSequence=0;
  const yearsAll=Array.from({length:END-START+1},(_,i)=>START+i);
  const good=x=>Number.isFinite(x)&&x>-900;
  const days=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
  const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):"—";
  const sign=(n,d=3)=>(n>=0?"+":"")+fmt(n,d);
  function message(str,error=false){
    const e=$("nasa-data-status");if(e){e.textContent=str;e.style.color=error?"#ffb5b5":"#c9b9ff";}
  }
  function location(id){
    const key=$(id).value;
    const [lat,lon]=key.split(",").map(Number);
    return {key,lat,lon,name:names[key]||key};
  }
  const snapshots={"28.3838,36.5662":"tabuk","40.7,-74":"new-york","24.4709,39.6122":"madinah"};
  function annualize(raw){return window.EarthDataCore.aggregate(raw,START,END);}
  async function loadLocation(loc,force=false){
    if(force)cache.delete(loc.key);
    if(cache.has(loc.key))return cache.get(loc.key);
    const query=new URLSearchParams({parameters:Object.values(vars).map(v=>v.code).join(","),community:"AG",
      latitude:String(loc.lat),longitude:String(loc.lon),start:START+"0101",end:END+"1231",format:"JSON","time-standard":"UTC"});
    const promise=(async()=>{
      let raw,kind="live",url=SOURCE+"?"+query;
      // Historical snapshots are real, archived NASA responses. Show them immediately
      // at the three verified sites; Refresh explicitly requests a new live response.
      if(snapshots[loc.key]&&!force){
        try{
          const saved=await fetch("data/"+snapshots[loc.key]+".json");
          if(saved.ok){const result=await saved.json();if(result._source?.locationKey===loc.key)return result;}
        }catch{}
      }
      try{
        const response=await fetch(url,{mode:"cors",signal:AbortSignal.timeout(45000)});
        if(!response.ok)throw Error("NASA HTTP "+response.status);
        raw=await response.json();
        const result=annualize(raw);result._source={...result._source,kind,url,retrievedAt:new Date().toISOString()};return result;
      }catch(error){
        if(!snapshots[loc.key])throw error;
        const response=await fetch("data/"+snapshots[loc.key]+".json");
        if(!response.ok)throw error;
        const result=await response.json();
        if(result._source?.locationKey!==loc.key)throw Error("Snapshot coordinate mismatch.");
        result._source={...result._source,kind:"verified-snapshot",liveError:error.message};
        return result;
      }
    })().catch(error=>{cache.delete(loc.key);throw error;});
    cache.set(loc.key,promise);return promise;
  }
  function fillYears(){
    const v=$("environment-variable").value;
    const available=yearsAll.filter(y=>active.some(a=>Number.isFinite(a.data[y]?.[v])));
    for(const id of ["start-year","end-year"]){
      const el=$(id),prev=Number(el.value);
      el.replaceChildren(...available.map(y=>new Option(String(y),String(y))));
      el.disabled=!available.length;
      if(available.length)el.value=String(available.includes(prev)?prev:(id==="start-year"?available[0]:available[available.length-1]));
    }
  }
  function sample(region,v,a,b){
    return yearsAll.filter(y=>y>=a&&y<=b&&Number.isFinite(region.data[y]?.[v]))
      .map(y=>[y,region.data[y][v]]);
  }
  function slope(points){
    const n=points.length;
    if(n<3)return null;
    const mx=points.reduce((s,p)=>s+p[0],0)/n,my=points.reduce((s,p)=>s+p[1],0)/n;
    const dx=points.reduce((s,p)=>s+(p[0]-mx)**2,0);
    return dx>0?points.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/dx:null;
  }
  // Median of all pairwise annual slopes (Theil–Sen), using observed values only.
  function theilSen(points){
    if(points.length<3)return null;
    const slopes=[];
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const dt=points[j][0]-points[i][0];
      if(dt>0)slopes.push((points[j][1]-points[i][1])/dt);
    }
    if(!slopes.length)return null;
    slopes.sort((a,b)=>a-b);
    const mid=Math.floor(slopes.length/2);
    return slopes.length%2?slopes[mid]:(slopes[mid-1]+slopes[mid])/2;
  }
  function pText(p){return p<0.001?"p < 0.001":"p="+fmt(p,3);}
  // Normal approximation of Mann–Kendall S with tie correction, without continuity correction.
  function erf(x){
    const sg=Math.sign(x);x=Math.abs(x);
    const t=1/(1+0.3275911*x);
    const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
    return sg*y;
  }
  function mk(points){
    const n=points.length;if(n<10)return {label:"Need ≥10 annual values",p:null,autocorr:null};
    let S=0;const ys=points.map(p=>p[1]);
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)S+=Math.sign(ys[j]-ys[i]);
    const counts=new Map();for(const v of ys)counts.set(v,(counts.get(v)||0)+1);
    let ties=0;for(const t of counts.values())if(t>1)ties+=t*(t-1)*(2*t+5);
    const variance=(n*(n-1)*(2*n+5)-ties)/18;
    if(variance<=0)return {label:"No measurable variation",p:null,autocorr:null};
    const z=S/Math.sqrt(variance); // no continuity correction; matches SciPy kendalltau asymptotic p
    const p=Math.max(0,Math.min(1,1-erf(Math.abs(z)/Math.SQRT2)));
    const m=slope(points),intercept=ys[0]-(m??0)*points[0][0];
    const detrended=points.map(t=>t[1]-((m??0)*t[0]+intercept));
    const mu=detrended.reduce((a,b)=>a+b,0)/n;
    const denom=detrended.reduce((s,v)=>s+(v-mu)**2,0);
    const cov=detrended.slice(1).reduce((s,v,i)=>s+(v-mu)*(detrended[i]-mu),0);
    const autocorr=denom?cov/denom:0;
    // Significance is withheld for possible serial dependence.
    const label=Math.abs(autocorr)>.2
      ?"Serial correlation: p not reliable"
      :p<.05?"Significant (exploratory)":"Not significant (exploratory)";
    return {label,p,autocorr};
  }
  function solve(A,b){
    if(!b.every(Number.isFinite)||!A.every(row=>row.every(Number.isFinite)))return null;
    const n=b.length,M=A.map((row,i)=>[...row,b[i]]);
    for(let i=0;i<n;i++){
      let k=i;for(let j=i+1;j<n;j++)if(Math.abs(M[j][i])>Math.abs(M[k][i]))k=j;
      if(Math.abs(M[k][i])<1e-12)return null;
      [M[i],M[k]]=[M[k],M[i]];
      let div=M[i][i];for(let c=i;c<=n;c++)M[i][c]/=div;
      for(let j=0;j<n;j++){if(j===i)continue;const factor=M[j][i];for(let c=i;c<=n;c++)M[j][c]-=factor*M[i][c];}
    }
    const result=M.map(row=>row[n]);return result.every(Number.isFinite)?result:null;
  }
  function fitAR(series){
    if(!Array.isArray(series)||series.length<6||!series.every(Number.isFinite))return null;
    const vals=series,mu=vals.reduce((s,v)=>s+v,0)/vals.length;
    const sigma=Math.sqrt(vals.reduce((s,v)=>s+(v-mu)**2,0)/vals.length)||1;
    const x=[],y=[];
    for(let i=2;i<vals.length;i++){
      x.push([1,i/40,(vals[i-1]-mu)/sigma,(vals[i-2]-mu)/sigma]);
      y.push((vals[i]-mu)/sigma);
    }
    const n=4,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
    for(let i=0;i<x.length;i++)for(let j=0;j<n;j++){
      b[j]+=x[i][j]*y[i];for(let k=0;k<n;k++)A[j][k]+=x[i][j]*x[i][k];
    }
    for(let i=1;i<n;i++)A[i][i]+=.25; // ridge penalty reduces overfitting
    const w=solve(A,b);
    if(!w)return null;
    const predict=(index,lag1,lag2)=>{
      const features=[1,index/40,(lag1-mu)/sigma,(lag2-mu)/sigma];
      return mu+sigma*features.reduce((s,v,j)=>s+v*w[j],0);
    };
    return {predict};
  }
  function forecast(points,horizon){
    if(!points.every(p=>Array.isArray(p)&&Number.isInteger(p[0])&&Number.isFinite(p[1])))return {ok:false,message:"Invalid observations."};
    // Rolling-origin, strictly out-of-sample h-step evaluation. No future observations
    // are used as model inputs; refit at each historical origin.
    if(points.length<30)return {ok:false,message:"Need at least 30 complete annual observations for forecast validation."};
    for(let i=1;i<points.length;i++)if(points[i][0]!==points[i-1][0]+1)
      return {ok:false,message:"Missing years prevent forecast validation."};
    if(![1,3,5].includes(horizon))return {ok:false,message:"Unsupported forecast horizon."};
    const values=points.map(p=>p[1]);
    const holdout=Math.min(8,Math.max(5,Math.floor(values.length*.2)));
    const start=values.length-holdout;
    const errors=[],baseErrors=[],backtests=[];
    for(let target=start;target<values.length;target++){
      const origin=target-horizon+1;
      if(origin<22)continue;
      const history=values.slice(0,origin);
      const model=fitAR(history);
      if(!model)return {ok:false,message:"Model fitting failed during validation."};
      for(let step=0;step<horizon;step++){
        const n=history.length;
        const next=model.predict(n,history[n-1],history[n-2]);
        if(!Number.isFinite(next))return {ok:false,message:"Non-finite historical prediction."};
        history.push(next);
      }
      const predicted=history[history.length-1],actual=values[target];
      backtests.push({trainingEnd:points[origin-1][0],targetYear:points[target][0],predicted,actual,baseline:values[origin-1]});
      errors.push((predicted-actual)**2);
      baseErrors.push((values[origin-1]-actual)**2);
    }
    if(errors.length<5)return {ok:false,message:"Insufficient held-out historical predictions."};
    const rmse=Math.sqrt(errors.reduce((a,b)=>a+b,0)/errors.length);
    const naive=Math.sqrt(baseErrors.reduce((a,b)=>a+b,0)/baseErrors.length);
    const validated=rmse<naive;
    const full=fitAR(values);
    if(!full)return {ok:false,message:"Model could not be fitted."};
    const history=values.slice(),predictions=[];
    for(let h=1;h<=horizon;h++){
      const n=history.length;
      const value=full.predict(n,history[n-1],history[n-2]);
      if(!Number.isFinite(value))return {ok:false,message:"Non-finite future projection."};
      history.push(value);
      predictions.push({year:points[points.length-1][0]+h,value});
    }
    return {ok:true,prediction:predictions[predictions.length-1],predictions,rmse,naive,validated,holdout:errors.length,horizon,backtests};
  }
  function checkedForecast(points,horizon,variable){
    const result=forecast(points,horizon);
    if(result.ok&&!result.predictions.every(p=>window.EarthDataCore.plausible(p.value,variable)))return {ok:false,message:"Implausible forecast withheld."};
    return result;
  }
  function invalidate(reason){
    window.__earthForecast=null;window.__earthForecastResults=[];window.__earthAnalyses=null;
    for(const id of ["rate-metric","significance-metric","forecast-metric"])setMetric(id,id==="rate-metric"?"RATE OF CHANGE":id==="significance-metric"?"TREND SIGNIFICANCE":"FUTURE PROJECTION","Awaiting data");
    $("forecast-output").textContent=reason;
    $("insight-content").textContent=reason;
    $("nasa-source-details").textContent=reason;
    $("chart-empty").hidden=false;$("nasa-trend-chart").hidden=true;
    if(chart){chart.destroy();chart=null;}
    window.dispatchEvent(new Event("earth:data-updated"));
  }
  function setMetric(id,label,value){
    const node=$(id);if(!node)return;
    node.querySelector(".metric-label").textContent=label;
    node.querySelector(".metric-value").textContent=value;
  }
  function setModeUI(){
    const temporal=$("comparison-mode").value==="periods";
    $("mode-description").textContent=temporal
      ?"Compare earlier and later years at one point. Globe textures are NOT historical snapshots."
      :"Compare two different point locations over identical years.";
    $("region2").disabled=temporal;
    $("globe-title-1").textContent=temporal?"Same site · Earlier":"Region 01";
    $("globe-title-2").textContent=temporal?"Same site · Later":"Region 02";
    if(temporal){
      $("region2").value=$("region1").value;
      $("region2").dispatchEvent(new Event("change"));
    }
  }
  function plot(rows,periodMode,mid,meta){
    if(chart){chart.destroy();chart=null;}
    const years=yearsAll.filter(y=>y>=Number($("start-year").value)&&y<=Number($("end-year").value));
    const lines=rows.map((r,i)=>{
      const values=years.map(y=>{
        if(periodMode&&(i===0?y>mid:y<=mid))return null;
        return r.data[y]?.[$("environment-variable").value]??null;
      });
      return {label:periodMode?(i===0?"Earlier years":"Later years"):r.loc.name,
        data:values,borderColor:i===0?"#b19aff":"#63d5ed",
        backgroundColor:i===0?"#b19aff":"#63d5ed",pointRadius:2,
        spanGaps:false,borderWidth:2,tension:.2};
    });
    const ok=lines.some(l=>l.data.some(Number.isFinite));
    $("chart-empty").hidden=ok;$("nasa-trend-chart").hidden=!ok;
    if(!ok||typeof Chart==="undefined")return;
    chart=new Chart($("nasa-trend-chart"),{
      type:"line",data:{labels:years,datasets:lines},
      options:{responsive:true,maintainAspectRatio:false,
        interaction:{mode:"index",intersect:false},
        plugins:{legend:{labels:{color:"#d9e1f9",boxWidth:11}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+c.formattedValue+" "+meta.unit}}},
        scales:{x:{ticks:{color:"#9caaca",maxTicksLimit:8},grid:{color:"#ffffff0b"}},
          y:{title:{display:true,text:meta.unit,color:"#bbc6da"},ticks:{color:"#9caaca"},grid:{color:"#ffffff16"}}}
      }
    });
  }
  function display(){
    if(!active)return;
    const v=$("environment-variable").value,meta=vars[v];
    const start=Number($("start-year").value),end=Number($("end-year").value);
    if(start>end){invalidate("Start year must precede end year.");return;}
    const temporal=$("comparison-mode").value==="periods";
    const mid=Math.floor((start+end)/2);
    const p1=sample(active[0],v,start,temporal?mid:end);
    const p2=sample(active[temporal?0:1],v,temporal?mid+1:start,end);
    const groups=[p1,p2];
    const slopes=groups.map(slope),senSlopes=groups.map(theilSen),stats=groups.map(mk);
    const slopesText=slopes.map(n=>n===null?"—":sign(n)).join(" / ");
    setMetric("rate-metric",temporal?"EARLIER / LATER SLOPE":"REGION 01 / 02 SLOPE",slopesText+" "+meta.unit+"/yr");
    setMetric("significance-metric","MANN–KENDALL (EXPLORATORY)",
      stats.map(st=>st.p===null?"—":Math.abs(st.autocorr)>.2?"Correlation warning ("+pText(st.p)+")":pText(st.p)).join(" / "));
    const means=groups.map(g=>g.length?g.reduce((s,p)=>s+p[1],0)/g.length:null);
    let interpretation=temporal?
      "Earlier window: "+start+"–"+mid+"; later window: "+(mid+1)+"–"+end+". "+
      "Difference in period means: "+(means.every(Number.isFinite)?sign(means[1]-means[0],2)+" "+meta.unit:"not available")+". "
      :"Matched calendar years allow location-to-location comparison. ";
    const descriptions=groups.map((g,i)=>{
      const s=stats[i],trend=slopes[i];
      return (temporal?(i===0?"Earlier":"Later"):active[i].loc.name)+": "+g.length+" yearly values, slope "+
        (trend===null?"unavailable":sign(trend)+" "+meta.unit+"/year")+
        "; Theil–Sen "+(senSlopes[i]===null?"unavailable":sign(senSlopes[i]*10,3)+" "+meta.unit+"/decade")+"; "+s.label+(s.p===null?"":" (unadjusted "+pText(s.p)+", lag-1 autocorr="+fmt(s.autocorr,2)+")")+".";
    });
    $("insight-content").textContent="";
    const strong=document.createElement("strong");strong.textContent=temporal?"Same-site temporal comparison":"Regional comparison";$("insight-content").append(strong);
    for(const line of [interpretation,...descriptions,
      "These are NASA POWER grid-point products, not administrative area means. Differences alone do not establish causation.",
      "Mann–Kendall p-values assume independent annual observations; serial correlation can invalidate them."]) {
      const p=document.createElement("p");p.textContent=line;$("insight-content").append(p);
    }
    const horizon=Number($("forecast-horizon").value);
    // In two-location mode forecast BOTH selected points. In temporal
    // mode forecast the full series for the selected shared point.
    const predictionRegions=temporal?[active[0]]:active;
    const forecastResults=predictionRegions.map(r=>({
      loc:r.loc,
      result:checkedForecast(sample(r,v,start,end),horizon,v)
    }));
    const future=forecastResults[0].result;
    window.__earthForecast=future;
    window.__earthForecastResults=forecastResults;
    window.__earthAnalyses={groups,slopes,senSlopes,stats,means,variable:v,start,end,temporal};
    const output=forecastResults.map(({loc,result:r})=>{
      if(!r.ok)return loc.name+": forecast unavailable ("+r.message+").";
      const physical=(v==="humidity"&&(r.prediction.value<0||r.prediction.value>100))||
        ((v==="precipitation"||v==="wind"||v==="solarIrradiance")&&r.prediction.value<0);
      if(physical)return loc.name+": model produced an implausible value; forecast withheld.";
      return loc.name+" · "+r.prediction.year+": "+
        fmt(r.prediction.value,2)+" "+meta.unit+
        " · held-out "+horizon+"-year RMSE "+fmt(r.rmse,2)+" vs naive "+fmt(r.naive,2)+
        " · "+(r.validated?"beat":"FAILED")+" baseline.";
    });
    $("forecast-output").textContent=
      output.join("\n\n")+
      "\n\nModel: autoregressive ridge regression. Evaluation uses rolling-origin, held-out forecasts at the selected 1, 3 or 5-year horizon (at least five historical predictions). These are scenario-free statistical estimates, not NASA forecasts.";
    const valid=forecastResults.filter(({result:r})=>r.ok&&r.validated&&Number.isFinite(r.prediction?.value));
    setMetric("forecast-metric", "EXPERIMENTAL FORECAST · "+horizon+"Y",
      valid.length?valid.length+" location"+(valid.length===1?"":"s")+" passed backtest · see Prediction Lab":"No forecasts passed the baseline check");
    plot(temporal?[active[0],active[0]]:active,temporal,mid,meta);
    $("nasa-source-details").textContent=
      "NASA POWER daily UTC point data · annual complete-year summaries · "+meta.name+
      " · "+meta.unit+" · "+start+"–"+end+". "+
      (v==="precipitation"?"Daily precipitation summed across the year.":"Daily values averaged across the complete year.")+
      " No historical satellite imagery or regional area averages are implied. "+
      "Statistical p-values are exploratory; forecasting uses an autoregressive ridge model with chronological holdout.";
    message("NASA POWER loaded · "+p1.length+" / "+p2.length+" yearly values · "+(active.some(r=>r.data._source.kind==="verified-snapshot")?"verified saved snapshot · retrieval date in Source":"daily UTC"));
    window.dispatchEvent(new Event("earth:data-updated"));
  }
  window.EarthData={getCurrent:()=>({loaded:Boolean(active)&&Boolean(window.__earthAnalyses),locations:active,forecast:window.__earthForecast,forecastResults:window.__earthForecastResults,analyses:window.__earthAnalyses})};
  async function load(force=false){
    const seq=++requestSequence;
    $("load-nasa-data").disabled=true;
    active=null;invalidate("Loading verified NASA POWER daily observations…");
    $("start-year").disabled=true;$("end-year").disabled=true;
    message("Requesting NASA POWER daily point data…");
    const temporal=$("comparison-mode").value==="periods";
    const locs=[location("region1"),location(temporal?"region1":"region2")];
    try{
      const latest=await Promise.all(locs.map(async loc=>({loc,data:await loadLocation(loc,force===true)})));
      if(seq!==requestSequence)return;
      active=latest;
      fillYears();
      display();
    }catch(e){
      if(seq!==requestSequence)return;
      active=null;invalidate("NASA POWER unavailable: "+e.message);
      message("NASA POWER unavailable: "+e.message,true);
      $("nasa-source-details").textContent="Data request failed; no observations shown.";
      $("forecast-output").textContent="No verified data loaded.";
      setMetric("significance-metric","TREND SIGNIFICANCE","Awaiting data");
      setMetric("forecast-metric","FUTURE PROJECTION","Awaiting data");
      $("chart-empty").hidden=false;$("nasa-trend-chart").hidden=true;
      if(chart){chart.destroy();chart=null;}
    }finally{if(seq===requestSequence)$("load-nasa-data").disabled=false;}
  }
  function attach(){
    $("comparison-mode").addEventListener("change",()=>{setModeUI();load();});
    $("load-nasa-data").addEventListener("click",()=>load(true));
    $("region1").addEventListener("change",()=>{
      if($("comparison-mode").value==="periods"){
        $("region2").value=$("region1").value;
        $("region2").dispatchEvent(new Event("change"));
      }
      load();
    });
    $("region2").addEventListener("change",load);
    $("environment-variable").addEventListener("change",()=>{if(active){fillYears();display();}});
    for(const id of ["start-year","end-year","forecast-horizon"]){
      $(id).addEventListener("change",display);
    }
    setModeUI();load();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",attach);
  else attach();
})();
