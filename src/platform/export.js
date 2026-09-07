import {Capacitor,registerPlugin} from '@capacitor/core';
const NativeExport=registerPlugin('SetkaExport');
export async function exportJson(data,name){
  const text=typeof data==='string'?data:JSON.stringify(data,null,2);
  if(Capacitor.isNativePlatform()){await NativeExport.save({text,name});return;}
  const blob=new Blob([text],{type:'application/json'}),file=new File([blob],name,{type:'application/json'});
  if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file]});return;}catch(e){if(e.name==='AbortError')return;}}
  const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
