/* Historical point-data timeline, no fabricated maps or historical imagery. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const units={temperature:"°C",precipitation:"mm/year",humidity:"%",wind:"m/s"};
  let timer=null, activeYear=null, lastKey="";
  const format=(n)=>Number.isFinite(n)?n.toLocaleString("en-US",{maximumFractionDigits:2}):"No observation";
  function stop(){
    if(timer!==null){clearInterval(timer);timer=null;}
    const btn=$("timeline-play");
    if(btn){btn.textContent="▶ Play";btn.setAttribute("aria-label","Play timeline");}
  }
  function read(){
    const data=window.EarthData?.getCurrent?.();
    if(!data?.loaded||!data.locations?.length)return null;
    const variable=$("environment-variable").value;
    const start=Number($("start-year").value),end=Number($("end-year").value);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start>end)return null;
    return {data,variable,start,end,mode:$("comparison-mode").value};
  }
  function draw(){
    const state=read(),slider=$("timeline-year"),label=$("timeline-current-year");
    if(!slider||!label)return;
    if(!state){
      stop();slider.disabled=true;$("timeline-play").disabled=true;
      label.textContent="—";
      $("timeline-reading-1").textContent="Waiting for NASA data";
      $("timeline-reading-2").textContent="Waiting for NASA data";
      $("timeline-context").textContent="Yearly NASA POWER point observations will appear after loading.";
      return;
    }
    const {data,variable,start,end,mode}=state;
    const key=[start,end,variable,mode,data.locations.map(r=>r.loc.key).join("|")].join(":");
    if(key!==lastKey){
      stop();lastKey=key;
      activeYear=Math.min(end,Math.max(start,activeYear===null?end:activeYear));
    }
    slider.min=String(start);slider.max=String(end);slider.step="1";
    slider.disabled=start===end;
    $("timeline-play").disabled=start===end;
    if(!Number.isInteger(activeYear)||activeYear<start||activeYear>end)activeYear=end;
    slider.value=String(activeYear);
    label.textContent=String(activeYear);
    $("timeline-first-year").textContent=String(start);
    $("timeline-last-year").textContent=String(end);
    const val1=data.locations[0].data?.[activeYear]?.[variable];
    const val2=data.locations[mode==="periods"?0:1]?.data?.[activeYear]?.[variable];
    const unit=units[variable]||"";
    const a=Number.isFinite(val1)?format(val1)+" "+unit:"No observation";
    const b=Number.isFinite(val2)?format(val2)+" "+unit:"No observation";
    $("timeline-reading-1").textContent=a;
    $("timeline-reading-2").textContent=b;
    const mid=Math.floor((start+end)/2);
    const same=mode==="periods";
    $("timeline-reading-1-label").textContent=same?"Earlier years":"Region 01";
    $("timeline-reading-2-label").textContent=same?"Later years":"Region 02";
    // In same-site comparison the other-period readout is intentionally blank.
    if(same){
      if(activeYear<=mid)$("timeline-reading-2").textContent="Later: "+(mid+1)+"–"+end;
      else $("timeline-reading-1").textContent="Earlier: "+start+"–"+mid;
    }
    const delta=Number.isFinite(val1)&&Number.isFinite(val2)&&!same
      ? " · Difference (02 − 01): "+format(val2-val1)+" "+unit : "";
    $("timeline-context").textContent=
      (same?"Same geographic point · "+(activeYear<=mid?"earlier":"later")+" comparison period":
       data.locations[0].loc.name+" versus "+data.locations[1].loc.name)+
      " · "+activeYear+delta+". The Earth texture is a visual basemap, not a historical image.";
  }
  function bind(){
    const slider=$("timeline-year"),play=$("timeline-play");
    if(!slider||!play)return;
    slider.addEventListener("input",()=>{
      stop();activeYear=Number(slider.value);draw();
    });
    play.addEventListener("click",()=>{
      if(timer!==null){stop();return;}
      const state=read();if(!state||state.end<=state.start)return;
      if(activeYear>=state.end)activeYear=state.start;
      play.textContent="Ⅱ Pause";play.setAttribute("aria-label","Pause timeline");
      draw(); // draw only stops when selection changes
      timer=setInterval(()=>{
        const c=read();if(!c){stop();draw();return;}
        if(activeYear>=c.end){stop();return;}
        activeYear+=1;draw();
      },850);
    });
    window.addEventListener("earth:data-updated",draw);
    ["comparison-mode","environment-variable","start-year","end-year","region1","region2"]
      .forEach(id=>$(id)?.addEventListener("change",()=>{
        stop();
        if(id==="region1"||id==="region2")lastKey="";
        draw();
      }));
    document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
    draw();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);
  else bind();
})();