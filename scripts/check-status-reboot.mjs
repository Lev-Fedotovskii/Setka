import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
// Observe Android's active notification map without starting/force-stopping the app
// through a new instrumentation process. Never inspect a normal user's device.
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:20000});
const end=Date.now()+60000;
let last='';
while(Date.now()<end){
  last=adb('shell','cmd','notification','list');
  const key=last.split(/\r?\n/).map(x=>x.trim()).find(x=>{const p=x.split('|');return p[1]==='io.setka.app.unstable'&&p[2]==='2000000001';});
  if(key){
    const record=adb('shell',`cmd notification get '${key.replaceAll("'","'\\''")}'`);
    writeFileSync('/tmp/setka-status-reboot.txt',record);
    if(!record.includes('Status after transition'))throw Error('Restored status has unexpected contents: '+record);
    console.log('PASS: active Unstable status restored after reboot without opening or instrumenting the app.');
    process.exit(0);
  }
  await new Promise(resolve=>setTimeout(resolve,1000));
}
writeFileSync('/tmp/setka-status-reboot.txt',last+'\n'+adb('shell','dumpsys','package','io.setka.app.unstable'));
writeFileSync('/tmp/setka-status-logcat.txt',adb('logcat','-d','-t','2000'));
throw Error('No active Unstable status within 60 seconds of boot/unlock. See captured package/notification state and logcat.');
