// Keep the native dialog's focus trap, Escape handling and focus restoration.
// Lock the actual document; a backdrop alone does not stop mobile viewport gestures.
export function bindModalInteraction(dialog){
  let locked=false,scroll={x:0,y:0},previous={};
  function sync(){
    if(dialog.open&&!locked){
      locked=true;scroll={x:scrollX,y:scrollY};
      for(const key of ['position','top','left','width','overflow'])previous[key]=document.body.style[key];
      Object.assign(document.body.style,{position:'fixed',top:`-${scroll.y}px`,left:`-${scroll.x}px`,width:'100%',overflow:'hidden'});
      document.documentElement.classList.add('modal-open');
    }else if(!dialog.open&&locked){
      locked=false;Object.assign(document.body.style,previous);document.documentElement.classList.remove('modal-open');window.scrollTo(scroll.x,scroll.y);
      document.body.classList.remove('onboarding');dialog.classList.remove('onboarding-flow');
    }
  }
  new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});dialog.addEventListener('close',sync);
  document.addEventListener('touchmove',e=>{if(dialog.open&&(!dialog.contains(e.target)||e.touches.length>1))e.preventDefault();},{passive:false});
  document.addEventListener('wheel',e=>{if(dialog.open&&(!dialog.contains(e.target)||e.ctrlKey))e.preventDefault();},{passive:false});
}
