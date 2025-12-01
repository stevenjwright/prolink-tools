declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: any;
  export default src;
}

declare module '*.ttf' {
  const src: any;
  export default src;
}

declare module '*.png';
declare module '*.webm';

// OffscreenCanvas is available in Electron but not in base TypeScript lib
declare class OffscreenCanvas implements CanvasImageSource {
  constructor(width: number, height: number);
  width: number;
  height: number;
  getContext(contextId: '2d'): OffscreenCanvasRenderingContext2D | null;
  convertToBlob(options?: {type?: string; quality?: number}): Promise<Blob>;
  transferToImageBitmap(): ImageBitmap;
}

interface OffscreenCanvasRenderingContext2D extends CanvasRenderingContext2D {}

// Extend CanvasImageSource to include OffscreenCanvas
interface CanvasImageSource {}
