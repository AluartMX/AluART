'use strict';
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id');
let video=null,scene=null,plane=null,tracked=false,started=false,interval=null,objectURLs=[];
const events=[];
function log(s){events.push(new Date().toLocaleTimeString('es-MX')+' · '+s);$('log').textContent=events.slice(-25).join('\n')}
function message(s){$('message').textContent=s;log(s)}
async function api(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok){const p=await r.json().catch(()=>({}));throw Error(p.error||'No se pudo cargar la experiencia')}return r;}
async function blobURL(kind){const blob=await (await api('/api/public/frames/'+id+'/'+kind)).blob();const u=URL.createObjectURL(blob);objectURLs.push(u);return u}
async function play(){try{await video.play();$('replay').hidden=true;message(tracked?'Tu foto está reproduciendo el vídeo':'Apunta la cámara a la fotografía')}catch(e){$('replay').hidden=false;message('Toca «Reproducir vídeo» para continuar.');log(e.name||'Reproducción bloqueada')}}
async function stop(){started=false;tracked=false;clearInterval(interval);video?.pause();try{await scene?.systems['mindar-image-system']?.stop()}catch{}$('intro').hidden=false;$('start').disabled=false;$('stop').hidden=true;$('sound').disabled=true;message('Cámara cerrada')}
(async()=>{try{
 if(!/^[0-9a-f-]{36}$/i.test(id||''))throw Error('El enlace del cuadro es inválido.');
 const frame=(await (await api('/api/public/frames/'+id)).json()).frame;
 if(frame.estado_proceso!=='listo'||!frame.activo)throw Error('El cuadro todavía no está listo.');
 const [targetURL,videoURL]=await Promise.all([blobURL('target'),blobURL('video')]);log('Archivos privados descargados');
 video=document.createElement('video');video.id='videoAR';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='auto';video.crossOrigin='anonymous';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.src=videoURL;
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('El vídeo no pudo decodificarse a tiempo.')),20000);video.onloadeddata=()=>{clearTimeout(timer);resolve()};video.onerror=()=>{clearTimeout(timer);reject(Error('El navegador no pudo decodificar el vídeo MP4.'))};video.load()});
 log('Vídeo decodificado: '+video.videoWidth+' × '+video.videoHeight);
 scene=document.createElement('a-scene');scene.setAttribute('mindar-image',{imageTargetSrc:targetURL,autoStart:false,uiLoading:'no',uiScanning:'no',uiError:'no'});scene.setAttribute('vr-mode-ui','enabled: false');scene.setAttribute('device-orientation-permission-ui','enabled: false');scene.setAttribute('renderer','colorManagement: true');
 const assets=document.createElement('a-assets');assets.append(video);scene.append(assets);
 const camera=document.createElement('a-camera');camera.setAttribute('position','0 0 0');camera.setAttribute('look-controls','enabled: false');scene.append(camera);
 const anchor=document.createElement('a-entity');anchor.setAttribute('mindar-image-target','targetIndex: 0');
 plane=document.createElement('a-video');plane.setAttribute('src','#videoAR');plane.setAttribute('width',1);plane.setAttribute('height',video.videoHeight/video.videoWidth);plane.setAttribute('material','shader: flat; side: double');plane.setAttribute('position','0 0 0.001');anchor.append(plane);scene.append(anchor);
 anchor.addEventListener('targetFound',()=>{tracked=true;message('Fotografía reconocida');if(started)play()});
 anchor.addEventListener('targetLost',()=>{tracked=false;video.pause();message('Apunta de nuevo a la fotografía')});
 scene.addEventListener('arReady',()=>message('Cámara lista. Apunta a tu fotografía.'));
 scene.addEventListener('arError',()=>{message('No se pudo iniciar la cámara. Revisa el permiso del navegador.');stop()});
 document.body.append(scene);if(!scene.hasLoaded)await new Promise(ok=>scene.addEventListener('loaded',ok,{once:true}));
 $('introStatus').textContent=frame.nombre+' · Todo listo para escanear.';$('start').disabled=false;message('Toca «Iniciar cámara» para activar la experiencia');
 $('start').onclick=async()=>{if(started)return;if(!navigator.mediaDevices?.getUserMedia){$('introStatus').textContent='Este navegador no permite cámara. Abre la URL en Safari o Chrome con HTTPS.';return}$('start').disabled=true;try{const unlocking=video.play();await unlocking;video.pause();await scene.systems['mindar-image-system'].start();started=true;$('intro').hidden=true;$('stop').hidden=false;$('sound').disabled=false;interval=setInterval(()=>api('/api/public/frames/'+id).catch(e=>{stop();$('introStatus').textContent=e.message}),20000);if(tracked)play()}catch(e){await stop();$('introStatus').textContent=e.name==='NotAllowedError'?'Permite el acceso a la cámara para continuar.':e.message;log('Inicio falló: '+e.name)}};
 $('sound').onclick=()=>{video.muted=!video.muted;$('sound').textContent=video.muted?'Activar sonido':'Silenciar';if(tracked)play()};
 $('replay').onclick=play;$('stop').onclick=stop;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(started&&tracked)play()});
 window.addEventListener('pagehide',()=>{stop();for(const u of objectURLs)URL.revokeObjectURL(u)},{once:true});
}catch(e){$('introStatus').textContent=e.message;message(e.message)}})();
