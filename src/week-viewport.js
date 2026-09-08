// Keep timetable scaling inside its viewport; never scale the document/WebView.
export function mountWeekViewport(host, slider, output, saved={}) {
  const grid=host.querySelector('.week-grid');
  let scale=1,fit=saved.fit??true,gesture=null;
  const points=new Map();
  const distance=()=>{const [a,b]=[...points.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  const center=()=>{const p=[...points.values()];return {x:p.reduce((n,p)=>n+p.x,0)/p.length,y:p.reduce((n,p)=>n+p.y,0)/p.length};};
  function setScale(value,anchor={x:host.clientWidth/2,y:host.clientHeight/2}) {
    const next=Math.max(0.05,Math.min(2,value));
    const x=(host.scrollLeft+anchor.x)/scale,y=(host.scrollTop+anchor.y)/scale;
    scale=next;grid.style.zoom=String(scale);
    host.scrollLeft=x*scale-anchor.x;host.scrollTop=y*scale-anchor.y;
    slider.value=String(scale);output.value=Math.round(scale*100)+'%';
  }
  function fitAll(){
    grid.style.zoom='1';
    grid.style.width='850px';
    // Match the available landscape aspect ratio instead of leaving a narrow
    // miniature timetable at the left of an otherwise empty screen.
    for(let pass=0;pass<4;pass++)grid.style.width=Math.max(850,grid.offsetHeight*host.clientWidth/Math.max(1,host.clientHeight))+'px';
    const width=grid.offsetWidth,height=grid.offsetHeight;
    scale=1;setScale(Math.min(1,(host.clientWidth-2)/width,(host.clientHeight-2)/height),{x:0,y:0});
    // Fractional CSS zoom can change text wrapping/rounding in WebView.
    // Verify the rendered bounds, rather than assuming exact linear scaling.
    for(let pass=0;pass<4;pass++){
      const bounds=grid.getBoundingClientRect();
      const ratio=Math.min((host.clientWidth-2)/bounds.width,(host.clientHeight-2)/bounds.height);
      if(ratio>=1)break;
      setScale(scale*ratio*0.995,{x:0,y:0});
    }
    host.scrollTo(0,0);
  }
  slider.oninput=()=>{fit=false;setScale(Number(slider.value));};
  host.onpointerdown=e=>{
    if(e.pointerType!=='touch')return;
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    gesture={center:center(),distance:points.size>1?distance():0,scale,left:host.scrollLeft,top:host.scrollTop};
  };
  host.onpointermove=e=>{
    if(!points.has(e.pointerId))return;
    e.preventDefault();points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const c=center();
    if(points.size>1||Math.hypot(c.x-gesture.center.x,c.y-gesture.center.y)>5)host.setPointerCapture(e.pointerId);
    if(points.size>1&&gesture.distance){
      fit=false;const box=host.getBoundingClientRect();
      setScale(gesture.scale*distance()/gesture.distance,{x:c.x-box.left,y:c.y-box.top});
    }else{host.scrollLeft=gesture.left+gesture.center.x-c.x;host.scrollTop=gesture.top+gesture.center.y-c.y;}
  };
  const end=e=>{points.delete(e.pointerId);if(points.size)gesture={center:center(),distance:0,scale,left:host.scrollLeft,top:host.scrollTop};else gesture=null;};
  host.onpointerup=end;host.onpointercancel=end;
  const observer=new ResizeObserver(()=>{if(fit)fitAll();});observer.observe(host);
  if(fit)fitAll();else{setScale(saved.scale);host.scrollTo(saved.left||0,saved.top||0);}
  return ()=>{Object.assign(saved,{fit,scale,left:host.scrollLeft,top:host.scrollTop});observer.disconnect();};
}
