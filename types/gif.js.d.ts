declare module 'gif.js' {
    export interface GIFOptions {
        workers?: number;
        quality?: number;
        width?: number;
        height?: number;
        workerScript?: string;
        background?: string;
        repeat?: number;
    }

    export default class GIF {
        constructor(options: GIFOptions);
        addFrame(element: CanvasRenderingContext2D | HTMLImageElement | HTMLCanvasElement | ImageData, options?: {
            delay?: number;
            copy?: boolean;
            dispose?: number;
        }): void;
        render(): void;
        on(event: 'finished', callback: (blob: Blob) => void): void;
        on(event: 'progress', callback: (progress: number) => void): void;
        on(event: 'error', callback: (error: Error) => void): void;
    }
}
