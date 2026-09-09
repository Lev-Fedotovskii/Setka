import {Capacitor,registerPlugin} from '@capacitor/core';
const Picker=registerPlugin('SetkaTime');
export function bindTimePickers(){
  const native=Capacitor.isNativePlatform();
  function enhance(){
    for(const input of document.querySelectorAll('input[type=time]:not([data-time-enhanced])')){
      input.dataset.timeEnhanced='true';
      const button=document.createElement('button');button.type='button';button.className='subtle time-picker-button';button.textContent=native?'Выбрать колёсиками':'Выбрать время';button.setAttribute('aria-label','Выбрать время');
      button.onclick=async()=>{
        if(native){try{const result=await Picker.pick({value:input.value||'09:00'});if(result.value){input.value=result.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}input.focus();}catch{input.focus();}}
        else{input.focus();try{input.showPicker?.();}catch{ /* Keyboard editing always remains available. */ }}
      };input.after(button);
    }
  }
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
}
