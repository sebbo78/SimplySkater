import React from 'react';
import { GameStatus } from '../types';

interface GameOverlayProps {
  status: GameStatus;
  score: number;
  distance: number;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ status, score, distance }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6">
      {/* HUD */}
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col">
           <span className="text-xs text-gray-400 uppercase tracking-widest">Score</span>
           <span className="text-4xl font-bold font-mono tracking-tight">{score.toString().padStart(5, '0')}</span>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-xs text-gray-400 uppercase tracking-widest">Distance</span>
           <span className="text-2xl font-bold font-mono text-gray-300">{distance.toString().padStart(5, '0')}m</span>
        </div>
      </div>

      {/* Center Messages */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
        {status === GameStatus.IDLE && (
          <div className="animate-pulse">
            <h1 className="text-6xl font-black italic tracking-tighter mb-4">MONO<span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">SKATE</span></h1>
            <p className="text-lg bg-white text-black inline-block px-4 py-2 font-bold rotate-[-2deg]">PRESS SPACE TO START</p>
            <p className="mt-8 text-sm text-gray-500">ARROWS: UP (Jump) | LEFT/RIGHT (Move) | DOWN (Fast)</p>
          </div>
        )}

        {status === GameStatus.GAME_OVER && (
          <div className="bg-black/90 p-8 border-2 border-white transform rotate-1">
            <h2 className="text-5xl font-bold text-red-500 mb-2 font-mono">WIPEOUT</h2>
            <p className="text-xl mb-6">SCORE: {score} | DIST: {distance}m</p>
            <button className="pointer-events-auto bg-white text-black hover:bg-gray-200 px-6 py-3 font-bold uppercase tracking-wider transition-all">
              Try Again (Space)
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {status === GameStatus.PLAYING && (
         <div className="text-center opacity-50 text-xs">
            ARROWS TO CONTROL
         </div>
      )}
    </div>
  );
};

export default GameOverlay;