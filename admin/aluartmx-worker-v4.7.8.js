self.onmessage = async (event) => {
  const { wasmBuffer, coreUrl } = event.data || {};
  const send = (type, message) => self.postMessage({ type, message });
  try {
    send('stage', 'Worker local iniciado');
    importScripts(coreUrl);
    send('stage', 'ffmpeg-core.js ejecutado: ' + typeof self.createFFmpegCore);
    if (typeof self.createFFmpegCore !== 'function') throw new Error('No existe createFFmpegCore');
    const bytes = new Uint8Array(wasmBuffer);
    send('stage', 'WASM recibido: ' + bytes.byteLength + ' bytes; firma ' + Array.from(bytes.slice(0, 4)).map(x => x.toString(16).padStart(2,'0')).join(' '));
    const core = await self.createFFmpegCore({
      wasmBinary: bytes,
      print: (s) => send('log', String(s)),
      printErr: (s) => send('log', String(s))
    });
    send('success', 'FFmpeg WASM inicializado correctamente. FS: ' + typeof core.FS + '; exec: ' + typeof core.exec);
  } catch (err) {
    send('error', String(err && (err.stack || err.message) || err));
  }
};
