export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type TrickType = 'NONE' | 'INDY' | 'KICKFLIP' | '360_FLIP' | 'SUPERMAN';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  isJumping: boolean;
  isCrouching: boolean;
  rotation: number; // For wipeout animation
  currentTrick: TrickType;
  trickLabel: string | null;
  trickTimer: number; // To animate or timeout the label
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'BOX' | 'DOUBLE_BOX' | 'TALL_BOX';
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}