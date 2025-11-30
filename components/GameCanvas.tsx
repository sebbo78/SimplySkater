import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameStatus, Player, Obstacle, Particle, TrickType } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRAVITY,
  JUMP_FORCE,
  GROUND_Y,
  INITIAL_SPEED,
  SPEED_INCREMENT,
  MAX_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_X_OFFSET,
  PLAYER_MOVE_SPEED,
  BOX_SIZE,
  OBSTACLE_SPAWN_RATE_MIN,
  OBSTACLE_SPAWN_RATE_MAX,
  SCORE_TRICK_SIMPLE,
  SCORE_TRICK_COMPLEX,
  SCORE_BOX,
} from '../constants';

interface GameCanvasProps {
  gameStatus: GameStatus;
  setGameStatus: (status: GameStatus) => void;
  score: number;
  setScore: (score: number) => void;
  setDistance: (distance: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameStatus,
  setGameStatus,
  score,
  setScore,
  setDistance,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Mutable game state to avoid React render cycle in the game loop
  const gameState = useRef({
    player: {
      x: PLAYER_X_OFFSET,
      y: GROUND_Y - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      dy: 0,
      isJumping: false,
      isCrouching: false,
      rotation: 0,
      currentTrick: 'NONE',
      trickLabel: null,
      trickTimer: 0,
    } as Player,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    speed: INITIAL_SPEED,
    nextSpawn: 0,
    score: 0,
    distance: 0,
    groundOffset: 0,
  });

  // Controls state
  const keys = useRef<{ [key: string]: boolean }>({});

  const spawnObstacle = (currentFrame: number) => {
    const typeRoll = Math.random();
    let type: Obstacle['type'] = 'BOX';
    let width = BOX_SIZE;
    let height = BOX_SIZE;

    if (typeRoll > 0.8) {
        type = 'DOUBLE_BOX';
        width = BOX_SIZE * 2.2; // A bit of a gap
    } else if (typeRoll > 0.6) {
        type = 'TALL_BOX';
        height = BOX_SIZE * 1.5;
    }

    const obstacle: Obstacle = {
      id: Date.now() + Math.random(),
      x: CANVAS_WIDTH + 50,
      y: GROUND_Y - height,
      width,
      height,
      type,
    };
    gameState.current.obstacles.push(obstacle);

    // Schedule next spawn
    const minSpawn = OBSTACLE_SPAWN_RATE_MIN / (gameState.current.speed / INITIAL_SPEED);
    const maxSpawn = OBSTACLE_SPAWN_RATE_MAX / (gameState.current.speed / INITIAL_SPEED);
    const nextDelay = Math.floor(Math.random() * (maxSpawn - minSpawn + 1) + minSpawn);
    gameState.current.nextSpawn = currentFrame + nextDelay;
  };

  const createExplosion = (x: number, y: number) => {
      for (let i = 0; i < 20; i++) {
          gameState.current.particles.push({
              id: Math.random(),
              x: x,
              y: y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1.0,
              size: Math.random() * 4 + 2
          });
      }
  };

  const triggerTrick = (trick: TrickType, label: string, points: number) => {
      const state = gameState.current;
      // Only one trick per jump (or replace current trick)
      state.player.currentTrick = trick;
      state.player.trickLabel = label;
      state.player.trickTimer = 60; // Show label for 60 frames
      state.score += points;
      setScore(Math.floor(state.score));
      
      // Burst of particles
      createExplosion(state.player.x + state.player.width/2, state.player.y + state.player.height);
  };

  const resetGame = useCallback(() => {
    gameState.current = {
      player: {
        x: PLAYER_X_OFFSET,
        y: GROUND_Y - PLAYER_HEIGHT,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        dy: 0,
        isJumping: false,
        isCrouching: false,
        rotation: 0,
        currentTrick: 'NONE',
        trickLabel: null,
        trickTimer: 0,
      },
      obstacles: [],
      particles: [],
      speed: INITIAL_SPEED,
      nextSpawn: 0,
      score: 0,
      distance: 0,
      groundOffset: 0,
    };
    setScore(0);
    setDistance(0);
    frameCountRef.current = 0;
  }, [setScore, setDistance]);

  // Main Update Loop
  const update = useCallback(() => {
    if (gameStatus !== GameStatus.PLAYING) {
        // Still draw particles if game over
        if (gameStatus === GameStatus.GAME_OVER) {
             // allow particles to fade out
        } else {
            return;
        }
    }

    const state = gameState.current;
    
    // --- Physics (Player) ---
    if (gameStatus === GameStatus.PLAYING) {
        // Horizontal Movement
        if (keys.current['ArrowRight'] || keys.current['d']) {
            state.player.x += PLAYER_MOVE_SPEED;
        }
        if (keys.current['ArrowLeft'] || keys.current['a']) {
            state.player.x -= PLAYER_MOVE_SPEED;
        }

        // Clamp to screen
        state.player.x = Math.max(0, Math.min(CANVAS_WIDTH - state.player.width, state.player.x));

        // Jump Initiation
        const isJumpKeyPressed = keys.current['ArrowUp'] || keys.current[' '] || keys.current['w'];
        
        if (isJumpKeyPressed && !state.player.isJumping) {
            state.player.dy = JUMP_FORCE;
            state.player.isJumping = true;
            state.player.currentTrick = 'NONE'; // Reset trick on new jump
        }

        // Variable Jump Height (Jump Cut)
        if (state.player.isJumping && state.player.dy < 0 && !isJumpKeyPressed) {
            state.player.dy *= 0.85; 
        }

        // Fast Fall
        if ((keys.current['ArrowDown'] || keys.current['s']) && state.player.isJumping) {
             state.player.dy += 1.5; 
        }

        state.player.dy += GRAVITY;
        state.player.y += state.player.dy;

        // Ground collision
        if (state.player.y + state.player.height >= GROUND_Y) {
            state.player.y = GROUND_Y - state.player.height;
            state.player.dy = 0;
            state.player.isJumping = false;
            state.player.rotation = 0;
            state.player.currentTrick = 'NONE';
        }

        // Trick Label Timer
        if (state.player.trickTimer > 0) {
            state.player.trickTimer--;
            if (state.player.trickTimer <= 0) {
                state.player.trickLabel = null;
            }
        }

        // Speed Progression
        if (state.speed < MAX_SPEED) {
            state.speed += SPEED_INCREMENT;
        }

        // Distance Tracking
        state.distance += state.speed * 0.05; 
        setDistance(Math.floor(state.distance));

        // --- Obstacles ---
        // Spawn
        if (frameCountRef.current >= state.nextSpawn) {
            spawnObstacle(frameCountRef.current);
        }

        // Move & Cull Obstacles
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            const obs = state.obstacles[i];
            obs.x -= state.speed;

            // Collision Detection (AABB)
            const hitboxPadding = 5;
            if (
                state.player.x + hitboxPadding < obs.x + obs.width - hitboxPadding &&
                state.player.x + state.player.width - hitboxPadding > obs.x + hitboxPadding &&
                state.player.y + hitboxPadding < obs.y + obs.height - hitboxPadding &&
                state.player.y + state.player.height - hitboxPadding > obs.y + hitboxPadding
            ) {
                setGameStatus(GameStatus.GAME_OVER);
                createExplosion(state.player.x + state.player.width/2, state.player.y + state.player.height/2);
                state.player.rotation = 90; 
            }

            // Remove if off screen
            if (obs.x + obs.width < 0) {
                state.obstacles.splice(i, 1);
                state.score += SCORE_BOX;
                setScore(Math.floor(state.score));
            }
        }

        // Ground scrolling effect
        state.groundOffset = (state.groundOffset + state.speed) % 40; 
        
        frameCountRef.current++;
    }

    // --- Particles ---
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }

  }, [gameStatus, setGameStatus, setScore, setDistance]);

  // Main Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameState.current;
    const { x, y, width, height, rotation, currentTrick } = state.player;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- Draw Ground ---
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.fillStyle = '#333333';
    for (let i = -state.groundOffset; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y);
        ctx.lineTo(i - 20, CANVAS_HEIGHT);
        ctx.stroke();
    }

    // --- Draw Obstacles ---
    ctx.fillStyle = '#FFFFFF';
    state.obstacles.forEach(obs => {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.moveTo(obs.x + obs.width, obs.y);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.stroke();
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    // --- Draw Player & Tricks ---
    ctx.save();
    
    // Base Transform
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Trick-specific transforms
    let boardRot = 0;
    let bodyRot = 0;
    let boardOffset = 0;

    if (currentTrick === 'KICKFLIP') {
        boardRot = (frameCountRef.current * 20) % 360; // Spin board
    } else if (currentTrick === '360_FLIP') {
        bodyRot = (frameCountRef.current * 15) % 360; // Spin body
        boardRot = (frameCountRef.current * 25) % 360; // Spin board faster
    } else if (currentTrick === 'SUPERMAN') {
        bodyRot = 90; // Horizontal body
        boardOffset = 15; // Board below
    } else if (currentTrick === 'INDY') {
        // handled in limb drawing
    }

    // Apply body rotation
    ctx.rotate((bodyRot * Math.PI) / 180);
    ctx.translate(-(x + width / 2), -(y + height / 2));

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;

    // --- Skateboard ---
    const boardY = y + height - 8 + boardOffset;
    
    ctx.save();
    // Rotate board separately around its center if doing a flip
    if (currentTrick === 'KICKFLIP' || currentTrick === '360_FLIP') {
        ctx.translate(x + width/2, boardY);
        ctx.rotate((boardRot * Math.PI) / 180);
        ctx.translate(-(x + width/2), -boardY);
    }
    
    ctx.beginPath();
    ctx.moveTo(x - 5, boardY - 5);
    ctx.quadraticCurveTo(x + width/2, boardY + 5, x + width + 5, boardY - 5);
    ctx.stroke();
    
    // Wheels
    ctx.beginPath();
    ctx.arc(x + 5, boardY + 5, 4, 0, Math.PI * 2);
    ctx.arc(x + width - 5, boardY + 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Stick Figure Body ---
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    
    const hipX = x + width / 2;
    const hipY = y + height / 2;
    const neckY = y + 15;

    // Legs
    if (currentTrick === 'KICKFLIP' || currentTrick === '360_FLIP') {
        // Legs spread for flip
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(x - 5, hipY + 10);
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(x + width + 5, hipY + 10);
    } else if (currentTrick === 'SUPERMAN') {
        // Legs straight back
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(hipX - 20, hipY - 5);
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(hipX - 20, hipY + 5);
    } else if (currentTrick === 'INDY') {
        // Knees bent
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(x + 5, boardY - 10);
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(x + width - 5, boardY - 10);
    } else {
        // Normal stance
        const legBend = state.player.isJumping ? 0 : (frameCountRef.current % 10 > 5 ? 2 : 0);
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(x + 5, boardY - legBend);
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(x + width - 5, boardY - legBend);
    }

    // Torso
    if (currentTrick === 'SUPERMAN') {
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(hipX + 30, hipY); // Forward
    } else {
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(hipX + (state.player.dy * 0.5), neckY);
    }

    // Arms
    if (currentTrick === 'INDY') {
        // One arm grabbing board
        ctx.moveTo(hipX, neckY + 5);
        ctx.lineTo(x + width/2, boardY - 5); // Grab!
        ctx.moveTo(hipX, neckY + 5);
        ctx.lineTo(x - 5, neckY - 10); // Other arm out
    } else if (currentTrick === 'SUPERMAN') {
         // Arms forward
         ctx.moveTo(hipX + 30, hipY);
         ctx.lineTo(hipX + 50, hipY - 5);
         ctx.moveTo(hipX + 30, hipY);
         ctx.lineTo(hipX + 50, hipY + 5);
    } else {
        // Normal Arms
        const lean = currentTrick === '360_FLIP' ? 10 : state.player.dy;
        ctx.moveTo(hipX, neckY + 5);
        ctx.lineTo(x - 5, neckY + 10 - lean);
        ctx.moveTo(hipX, neckY + 5);
        ctx.lineTo(x + width + 5, neckY + 10 + lean);
    }

    ctx.stroke();

    // Head
    ctx.beginPath();
    let headX = hipX + (state.player.dy * 0.5);
    let headY = neckY - 8;
    if (currentTrick === 'SUPERMAN') {
        headX = hipX + 35;
        headY = hipY - 8;
    }

    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // --- Trick Label ---
    if (state.player.trickLabel && state.player.trickTimer > 0) {
        ctx.save();
        ctx.fillStyle = '#FFFF00';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        // Blink effect
        if (Math.floor(frameCountRef.current / 4) % 2 === 0) {
             ctx.fillText(state.player.trickLabel, x + width/2, y - 20);
        }
        ctx.restore();
    }

    // --- Particles ---
    state.particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

  }, [gameStatus]);

  // Game Loop Wrapper
  const tick = useCallback((time: number) => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(tick);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  }, [tick]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
      const state = gameState.current;

      // Start / Restart
      if ((e.key === ' ' || e.key === 'ArrowUp') && gameStatus === GameStatus.IDLE) {
          setGameStatus(GameStatus.PLAYING);
          resetGame();
          return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && gameStatus === GameStatus.GAME_OVER) {
          setGameStatus(GameStatus.IDLE);
          resetGame();
          return;
      }

      // Trick Logic
      if (gameStatus === GameStatus.PLAYING && state.player.isJumping) {
          const isLeftHeld = keys.current['ArrowLeft'] || keys.current['a'];
          const isRightHeld = keys.current['ArrowRight'] || keys.current['d'];

          // 3. Up, Left, Up => (In air + Left + Up) -> 360 Flip
          if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && isLeftHeld) {
              triggerTrick('360_FLIP', '360 FLIP!', SCORE_TRICK_COMPLEX);
          }
          // 4. Up, Right, Up => (In air + Right + Up) -> Superman
          else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && isRightHeld) {
              triggerTrick('SUPERMAN', 'SUPERMAN!', SCORE_TRICK_COMPLEX);
          }
          // 2. Up + Left => (In air + Left press) -> Kickflip
          else if ((e.key === 'ArrowLeft' || e.key === 'a') && state.player.currentTrick === 'NONE') {
              triggerTrick('KICKFLIP', 'KICKFLIP!', SCORE_TRICK_SIMPLE);
          }
          // 1. Up + Right => (In air + Right press) -> Indy Grab
          else if ((e.key === 'ArrowRight' || e.key === 'd') && state.player.currentTrick === 'NONE') {
              triggerTrick('INDY', 'INDY GRAB!', SCORE_TRICK_SIMPLE);
          }
      }

    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, setGameStatus, resetGame]);

  // Handle Resize for Canvas fidelity
  useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;
      }
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]">
      <canvas
        ref={canvasRef}
        className="block w-full h-auto bg-black cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
        onClick={() => {
            if (gameStatus === GameStatus.IDLE) {
                setGameStatus(GameStatus.PLAYING);
                resetGame();
            } else if (gameStatus === GameStatus.GAME_OVER) {
                setGameStatus(GameStatus.IDLE);
                resetGame();
            } else {
                 keys.current[' '] = true;
                 setTimeout(() => keys.current[' '] = false, 100);
            }
        }}
      />
    </div>
  );
};

export default GameCanvas;