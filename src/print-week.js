// Print an isolated document so mobile fullscreen/scroll containment cannot
// clip the timetable to the phone's current viewport.
export async function printWeek(grid,onReturn) {
  const frame=document.createElement('iframe');
  frame.title='Печать расписания';
  Object.assign(frame.style,{position:'fixed',left:'-2000px',top:'0',width:'1123px',height:'794px',border:'0'});
  const ready=new Promise(resolve=>frame.onload=resolve);
  frame.srcdoc=`<!doctype html><html lang="ru"><head><meta name="viewport" content="width=1123"><link rel="stylesheet" href="${new URL('./src/styles.css',document.baseURI).href}"><style>@media print{html,body{width:auto!important;overflow:visible!important}.grid-scroll{margin:6mm!important}body>.grid-scroll{display:block!important}}</style></head><body><div class="grid-scroll">${grid.outerHTML}</div></body></html>`;
  document.body.append(frame);await ready;await frame.contentDocument.fonts.ready;
  let returned=false;
  const restore=()=>{if(returned)return;returned=true;onReturn();setTimeout(()=>frame.remove(),1000);};
  frame.contentWindow.addEventListener('afterprint',restore,{once:true});
  frame.contentWindow.focus();frame.contentWindow.print();
}
