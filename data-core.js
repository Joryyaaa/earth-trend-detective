/* One scientific definition for charts, forecasts, heat samples and role explanations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EarthDataCore=api;})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const variables={
    temperature:{code:'T2M',name:'Mean daily near-surface air temperature',unit:'°C'},
    precipitation:{code:'PRECTOTCORR',name:'Annual corrected precipitation total',unit:'mm/year'},
    humidity:{code:'RH2M',name:'Mean daily relative humidity',unit:'%'},
    wind:{code:'WS2M',name:'Mean daily 2 m wind speed',unit:'m/s'},
    maximumTemperature:{code:'T2M_MAX',name:'Annual mean of daily maximum air temperature',unit:'°C'},
    minimumTemperature:{code:'T2M_MIN',name:'Annual mean of daily minimum air temperature',unit:'°C'},
    solarIrradiance:{code:'ALLSKY_SFC_SW_DWN',name:'Mean daily all-sky surface shortwave irradiance',unit:'MJ/m²/day'}
  };
  const days=(year,month)=>new Date(Date.UTC(year,month,0)).getUTCDate();
  const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>-900;
  // FAO-56 equations 21, 23–25 and 52. Ra is converted from MJ/m²/day to mm/day.
  function referenceET0(latitude,julianDay,mean,minimum,maximum){
    if(![latitude,julianDay,mean,minimum,maximum].every(Number.isFinite)||maximum<minimum)return null;
    const phi=latitude*Math.PI/180,angle=2*Math.PI*julianDay/365;
    const dr=1+.033*Math.cos(angle),declination=.409*Math.sin(angle-1.39);
    const sunset=Math.acos(Math.max(-1,Math.min(1,-Math.tan(phi)*Math.tan(declination))));
    const ra=(24*60/Math.PI)*.0820*dr*(sunset*Math.sin(phi)*Math.sin(declination)+Math.cos(phi)*Math.cos(declination)*Math.sin(sunset));
    return Math.max(0,.0023*(mean+17.8)*Math.sqrt(maximum-minimum)*ra*.408);
  }
  function aggregate(raw,start=1981,end=2025){
    const params=raw?.properties?.parameter;
    if(!params?.T2M)throw Error('NASA did not return daily T2M observations.');
    const output={_monthly:{},_quality:{},_source:{header:raw.header,parameters:raw.parameters,coordinates:raw.geometry?.coordinates}};
    for(let year=start;year<=end;year++){
      const months=output._monthly[year]={};output[year]={};output._quality[year]={};
      for(let month=1;month<=12;month++)months[month]={};
      for(const [key,meta]of Object.entries(variables)){
        let total=0,count=0,expected=0,minimum=Infinity,maximum=-Infinity,above35=0;
        for(let month=1;month<=12;month++){
          const n=days(year,month);expected+=n;let sum=0,complete=0;
          for(let day=1;day<=n;day++){
            const date=String(year)+String(month).padStart(2,'0')+String(day).padStart(2,'0');
            const value=params[meta.code]?.[date];
            if(valid(value)){sum+=value;complete++;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);if(value>35)above35++;}
          }
          total+=sum;count+=complete;
          if(complete===n)months[month][key]=key==='precipitation'?sum:sum/n;
        }
        output._quality[year][key]={observed:count,expected,missing:expected-count,minimum:count?minimum:null,maximum:count?maximum:null,...(key==='maximumTemperature'?{daysAbove35:above35}:{})};
        if(count===expected)output[year][key]=key==='precipitation'?total:total/count;
      }
      let dayOfYear=0;
      for(let month=1;month<=12;month++){
        let et=0,complete=0;const n=days(year,month);
        for(let day=1;day<=n;day++){
          dayOfYear++;const date=String(year)+String(month).padStart(2,'0')+String(day).padStart(2,'0');
          const mean=params.T2M?.[date],min=params.T2M_MIN?.[date],max=params.T2M_MAX?.[date];
          if(![mean,min,max].every(valid))continue;
          const value=referenceET0(raw.geometry.coordinates[1],dayOfYear,mean,min,max);
          if(Number.isFinite(value)){et+=value;complete++;}
        }
        if(complete===n)months[month].referenceET0=et;
      }
    }
    return output;
  }
  function seasonal(data,variable,start,end){
    return Array.from({length:12},(_,i)=>{
      const values=[];
      for(let year=start;year<=end;year++){
        const value=data?._monthly?.[year]?.[i+1]?.[variable];if(Number.isFinite(value))values.push(value);
      }
      return {month:i+1,years:values.length,value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};
    });
  }
  function plausible(value,variable){return Number.isFinite(value)&&
    !(variable==='humidity'&&(value<0||value>100))&&
    !(['precipitation','wind','solarIrradiance'].includes(variable)&&value<0);}
  function irrigation(et0,rain,kc,efficiency,effectiveFraction){
    if(![et0,rain,kc,efficiency,effectiveFraction].every(Number.isFinite)||et0<0||rain<0||kc<0||kc>2||efficiency<=0||efficiency>1||effectiveFraction<0||effectiveFraction>1)return null;
    return Math.max(0,et0*kc-rain*effectiveFraction)/efficiency;
  }
  return {variables,days,valid,aggregate,seasonal,plausible,referenceET0,irrigation};
});
