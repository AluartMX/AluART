globalThis.AluARTVideoLayout = Object.freeze({
  forOrientation(orientation) {
    if (!['vertical', 'horizontal'].includes(orientation)) {
      throw new Error('La orientación del cuadro no es válida.');
    }
    const width = orientation === 'vertical' ? 720 : 1280;
    const height = orientation === 'vertical' ? 1280 : 720;
    const filter = [
      '[0:v:0]split=2[backgroundSource][foregroundSource]',
      `[backgroundSource]scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=2,crop=${width}:${height},boxblur=18:8[background]`,
      `[foregroundSource]scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2[foreground]`,
      '[background][foreground]overlay=(W-w)/2:(H-h)/2:shortest=1,setsar=1,fps=30[video]'
    ].join(';');
    return {width, height, filter};
  }
});
