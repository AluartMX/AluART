/* AluARTmx AR v4.7.7: classic worker, same-origin bootstrap */
const CORE='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/';
const send=(step,msg,extra={})=>self.postMessage({step,msg,...extra});
self.onerror=e=>send('error','Error del Worker: '+e.message);
self.onunhandledrejection=e=>send('error','Promesa rechazada: '+String(e.reason));
self.onmessage=async e=>{
 if(e.data?.cmd!=='start')return;
 send('worker','Worker local iniciado correctamente');
 try{
  send('download','Descargando ffmpeg-core.js con importScripts…');
  importScripts(CORE+'ffmpeg-core.js');
  send('script','ffmpeg-core.js ejecutado; createFFmpegCore: '+typeof self.createFFmpegCore);
  if(typeof self.createFFmpegCore!=='function')throw new Error('createFFmpegCore no está disponible en el Worker');
  send('wasm','Inicializando WASM (puede tardar unos segundos)…');
  const core=await self.createFFmpegCore({locateFile:(path)=>CORE+path, print:()=>{},printErr:(s)=>send('log',String(s).slice(0,300))});
  send('success','Motor WebAssembly iniciado correctamente', {version:typeof core._main==='function'?'Funciones FFmpeg disponibles':'WASM cargado'});
 }catch(err){send('error',String(err?.stack||err))}
};
