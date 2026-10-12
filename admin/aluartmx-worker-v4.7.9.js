'use strict';
let busy=false;
const send=(type,message,extra={})=>self.postMessage({type,message,...extra});
self.onmessage=async({data})=>{
 if(data?.cmd!=='compress'||busy)return;
 busy=true;
 let ff=null;
 try{
  send('stage','Cargando motor FFmpeg…');
  importScripts('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js');
  if(typeof self.createFFmpegCore!=='function')throw Error('No se pudo cargar ffmpeg-core.js');
  ff=await self.createFFmpegCore({wasmBinary:new Uint8Array(data.wasmBuffer),print:msg=>send('log',String(msg)),printErr:msg=>{const s=String(msg);if(/time=|frame=|error|failed/i.test(s))send('log',s)}});
  send('stage','Motor listo. Preparando archivo…');
  const input='entrada.'+(data.extension||'mp4');
  ff.FS.writeFile(input,new Uint8Array(data.fileBuffer));
  send('stage','Comprimiendo a 720p · 30 FPS · H.264 + AAC…');
  // Single-threaded ffmpeg-core. Keep audio and avoid timestamps becoming unsynchronized.
  const args=['-hide_banner','-y','-i',input,'-map','0:v:0','-map','0:a:0?','-vf','scale=w=1280:h=720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30','-c:v','libx264','-preset','ultrafast','-b:v','1100k','-maxrate','1300k','-bufsize','2600k','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-ar','44100','-ac','2','-movflags','+faststart','salida.mp4'];
  const code=ff.exec(...args);
  if(code!==0)throw Error('FFmpeg terminó con código '+code+' (revisa el registro técnico).');
  const out=ff.FS.readFile('salida.mp4');
  if(out.byteLength<1024)throw Error('Archivo de salida vacío o demasiado pequeño');
  const result=out.slice().buffer;
  send('done','Compresión terminada', {buffer:result,bytes:result.byteLength});
  self.postMessage({type:'file',buffer:result},[result]);
 }catch(e){send('error',String(e?.stack||e))}finally{busy=false}
};
