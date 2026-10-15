'use strict';
let busy=false;
const send=(type,message,extra={})=>self.postMessage({type,message,...extra});
self.onmessage=async({data})=>{
 if(data?.cmd!=='compress'||busy)return;
 busy=true;
 let ff=null;
 try{
  send('stage','Cargando motor FFmpeg…');
  importScripts('/vendor/ffmpeg-core.js','/video-layout.js');
  if(typeof self.createFFmpegCore!=='function')throw Error('No se pudo cargar ffmpeg-core.js');
  ff=await self.createFFmpegCore({wasmBinary:new Uint8Array(data.wasmBuffer),print:msg=>send('log',String(msg)),printErr:msg=>{const s=String(msg);if(/time=|frame=|error|failed/i.test(s)){send('log',s);const m=s.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);if(m)send('progress','', {seconds:Number(m[1])*3600+Number(m[2])*60+Number(m[3])})}}});
  if(ff.setLogger)ff.setLogger(({message})=>{const m=String(message).match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);if(m)send('progress','',{seconds:Number(m[1])*3600+Number(m[2])*60+Number(m[3])});});
  if(ff.setProgress)ff.setProgress(({time})=>send('progress','',{seconds:Number(time)/1000000}));
  send('stage','Motor listo. Preparando archivo…');
  const input='entrada.'+(data.extension||'mp4');
  ff.FS.writeFile(input,new Uint8Array(data.fileBuffer));
  const layout=self.AluARTVideoLayout.forOrientation(data.orientation);
  send('stage',`Adaptando a ${data.orientation} · conservando todo el vídeo…`);
  send('stage','Comprimiendo a 720p · 30 FPS · H.264 + AAC 128 kbps…');
  // Single-threaded ffmpeg-core. Keep audio and avoid timestamps becoming unsynchronized.
  const args=['-hide_banner','-y','-i',input,'-filter_complex',layout.filter,'-map','[video]','-map','0:a:0?','-c:v','libx264','-preset','veryfast','-b:v',String(data.bitrate||950000),'-maxrate',String(Math.floor((data.bitrate||950000)*1.2)),'-bufsize',String((data.bitrate||950000)*2),'-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-movflags','+faststart','salida.mp4'];
  const code=ff.exec(...args);
  if(code!==0)throw Error('FFmpeg terminó con código '+code+' (revisa el registro técnico).');
  const out=ff.FS.readFile('salida.mp4');
  if(out.byteLength<1024)throw Error('Archivo de salida vacío o demasiado pequeño');
  const result=out.slice().buffer;
  send('done','Compresión terminada', {bytes:result.byteLength});
  self.postMessage({type:'file',buffer:result},[result]);
 }catch(e){send('error',String(e?.stack||e))}finally{busy=false}
};

