declare module 'howler' {
  export class Howl {
    constructor(options: unknown);
    play(id?: number | string): number;
    pause(id?: number | string): void;
    stop(id?: number | string): void;
    mute(muted: boolean, id?: number | string): void;
    volume(vol: number, id?: number | string): void;
    fade(from: number, to: number, duration: number, id?: number | string): void;
    loop(loop?: boolean, id?: number | string): void;
    playing(id?: number | string): boolean;
    // Add more methods as needed
  }
  export const Howler: unknown;
} 