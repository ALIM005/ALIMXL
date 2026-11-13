export function createSignedScale(values,start,end) {
  let min=0,max=0;
  for(const value of values) {if(!Number.isFinite(value))continue;min=Math.min(min,value);max=Math.max(max,value);}
  if(min===0&&max===0)max=1;
  const magnitude=Math.max(Math.abs(min),Math.abs(max)),lo=min/magnitude,hi=max/magnitude;
  const map=value=>{const safe=Number.isFinite(value)?value:0;const ratio=Math.max(0,Math.min(1,(safe/magnitude-lo)/(hi-lo)));return start+ratio*(end-start);};
  const ticks=Array.from({length:5},(_,i)=>{const v=lo*(1-i/4)+hi*(i/4);return v===0?0:v*magnitude;});
  if(!ticks.includes(0))ticks.push(0);
  return {min,max,zero:map(0),map,ticks:ticks.sort((a,b)=>a-b)};
}
export function categoryCenter(index,count,start,end){return start+(index+0.5)/Math.max(1,count)*(end-start);}
export function barGeometry(value,scale){const position=scale.map(value);return {start:Math.min(position,scale.zero),size:Math.abs(position-scale.zero)};}
export function chartNumber(value){
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value!=='string')return null;
  const text=value.trim();
  if(!/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))return null;
  const number=Number(text.replace(/,/g,''));return Number.isFinite(number)?number:null;
}
export function collectChartRows(range,readValue,readLabel){
  const count=range.r2-range.r1+1;if(!Number.isSafeInteger(count)||count<1||count>100000)return [];
  const points=[],valueColumn=Math.min(range.c1+1,range.c2),labelColumn=range.c1===range.c2?Math.max(0,range.c1-1):range.c1;
  for(let row=range.r1;row<=range.r2;row++){const value=chartNumber(readValue(row,valueColumn));if(value===null)continue;points.push({label:readLabel(row,labelColumn)||`Row ${row+1}`,value});}
  return points;
}
export function buildPieGroups(data,ofPie=false){
  if(data.some(item=>Number.isFinite(item.value)&&item.value<0))return {error:'Pie charts require non-negative values. Use a column or bar chart for signed data.',main:[],secondary:[]};
  const positive=data.filter(item=>Number.isFinite(item.value)&&item.value>0).map((item,index)=>({...item,colorIndex:index}));
  if(!positive.length)return {error:'No positive values available for a pie chart.',main:[],secondary:[]};
  if(!ofPie||positive.length<3)return {error:'',main:positive,secondary:[]};
  const selected=[...positive].sort((a,b)=>a.value-b.value||a.colorIndex-b.colorIndex).slice(0,2),ids=new Set(selected.map(item=>item.colorIndex));
  const total=selected.reduce((sum,item)=>sum+item.value,0);
  if(!Number.isFinite(total))return {error:'Values are too large to aggregate in an Of-Pie chart.',main:[],secondary:[]};
  return {error:'',main:[...positive.filter(item=>!ids.has(item.colorIndex)),{label:'Other (2 categories)',value:total,colorIndex:selected[0].colorIndex}],secondary:selected};
}
export function pieSlices(items,cx,cy,radius){
  const largest=items.reduce((max,item)=>Math.max(max,item.value),0);if(!(largest>0))return [];
  const weights=items.map(item=>item.value/largest),total=weights.reduce((sum,value)=>sum+value,0);let cumulative=0;
  return items.map((item,index)=>{const fraction=weights[index]/total,start=cumulative/total*Math.PI*2-Math.PI/2;cumulative+=weights[index];const end=cumulative/total*Math.PI*2-Math.PI/2;
    const x1=cx+radius*Math.cos(start),y1=cy+radius*Math.sin(start),x2=cx+radius*Math.cos(end),y2=cy+radius*Math.sin(end);
    const path=fraction>=1-Number.EPSILON?`M ${cx} ${cy-radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy+radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy-radius} Z`:`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${fraction>0.5?1:0} 1 ${x2} ${y2} Z`;
    return {...item,fraction,path};});
}
