export interface ChartPoint {label:string;value:number;}
export interface SignedScale {min:number;max:number;zero:number;map:(value:number)=>number;ticks:number[];}
export interface PieItem extends ChartPoint {colorIndex:number;}
export function createSignedScale(values:readonly number[],start:number,end:number):SignedScale;
export function categoryCenter(index:number,count:number,start:number,end:number):number;
export function barGeometry(value:number,scale:SignedScale):{start:number;size:number};
export function chartNumber(value:unknown):number|null;
export function collectChartRows(range:{r1:number;r2:number;c1:number;c2:number},readValue:(row:number,col:number)=>unknown,readLabel:(row:number,col:number)=>string):ChartPoint[];
export function buildPieGroups(data:readonly ChartPoint[],ofPie?:boolean):{error:string;main:PieItem[];secondary:PieItem[]};
export function pieSlices(items:readonly PieItem[],cx:number,cy:number,radius:number):(PieItem & {fraction:number;path:string})[];
