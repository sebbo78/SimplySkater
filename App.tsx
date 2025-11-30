import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import GameOverlay from './components/GameOverlay';
import { GameStatus } from './types';

function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        <GameCanvas 
            gameStatus={gameStatus} 
            setGameStatus={setGameStatus} 
            score={score}
            setScore={setScore}
            setDistance={setDistance}
        />
        <GameOverlay 
            status={gameStatus} 
            score={score} 
            distance={distance}
        />
      </div>
      
      <div className="fixed bottom-4 right-4 text-neutral-600 text-xs">
         MONOSKATE v1.1
      </div>
    </div>
  );
}

export default App;