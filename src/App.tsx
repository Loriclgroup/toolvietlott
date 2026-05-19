/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { PhysicsSim } from "./components/PhysicsSim";
import { Play, Pause, RotateCcw, Trophy, Settings2, Hash, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

type GameMode = {
  name: string;
  balls: number;
  draw: number;
  specialBalls?: number;
  specialDraw?: number;
};

const MODES: Record<string, GameMode> = {
  "5/35": { name: "Lotto 5/35", balls: 35, draw: 5, specialBalls: 12, specialDraw: 1 },
  "6/45": { name: "Mega 6/45", balls: 45, draw: 6 },
  "6/55": { name: "Power 6/55", balls: 55, draw: 6 },
};

function nCr(n: number, r: number): number {
  if (r > n) return 0;
  if (r === 0 || r === n) return 1;
  let res = 1;
  const k = Math.min(r, n - r);
  for (let i = 1; i <= k; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return Math.round(res);
}

export default function App() {
  const [currentMode, setCurrentMode] = useState<string>("6/45");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const resultsRef = useRef<number[]>([]);
  const [simKey, setSimKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const mode = MODES[currentMode];
  const totalCombinations = nCr(mode.balls, mode.draw) * (mode.specialBalls ? mode.specialBalls : 1);
  const jackpotProbability = (1 / totalCombinations) * 100;
  
  // Automation state
  const [isAutoDrawing, setIsAutoDrawing] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleReset = () => {
    setIsRunning(false);
    setIsAutoDrawing(false);
    setResults([]);
    resultsRef.current = [];
    setSimKey(prev => prev + 1);
    setStatus("Ready");
    setCountdown(null);
  };

  const performDraw = useCallback((isSpecial: boolean = false) => {
    // Re-verify the current drawn numbers from ref to ensure absolute fresh state
    const currentDrawn = resultsRef.current;
    
    // Total count check including special balls
    const totalToDraw = mode.draw + (mode.specialDraw || 0);
    if (currentDrawn.length >= totalToDraw) return true;

    // Pool selection
    const poolSize = isSpecial ? (mode.specialBalls || 0) : mode.balls;
    
    // For special balls, we don't necessarily need to exclude already drawn normal numbers 
    // because they are from different pools. 
    // However, if we draw multiple special balls from same special pool, we should exclude.
    // For now, it's just 1 special ball usually.
    
    // We need to know which numbers are already drawn in the CURRENT pool.
    // Normal balls are at index 0 to mode.draw - 1
    // Special balls are at index mode.draw onwards
    const currentPoolDrawn = isSpecial 
      ? currentDrawn.slice(mode.draw) 
      : currentDrawn.slice(0, mode.draw);

    const available = Array.from({ length: poolSize }, (_, i) => i + 1)
      .filter(n => !currentPoolDrawn.includes(n));
      
    if (available.length === 0) return false;
    
    const index = Math.floor(Math.random() * available.length);
    const num = available[index];
    
    const nextResults = [...resultsRef.current, num];
    resultsRef.current = nextResults;
    setResults(nextResults);
    
    if (nextResults.length === totalToDraw) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
      }, 500);
      return true; // Finished
    }
    return false;
  }, [mode]);

  const startAutoSequence = async () => {
    if (isAutoDrawing) return;
    handleReset();
    setIsAutoDrawing(true);
    setIsRunning(true);

    const totalToDraw = mode.draw + (mode.specialDraw || 0);

    // Phase 1: Pre-mixing (12 seconds)
    setStatus("Pre-mixing...");
    for (let i = 12; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);

    // Phase 2 & 3: Drawing & Intervals
    for (let currentDraw = 1; currentDraw <= totalToDraw; currentDraw++) {
      const isSpecial = currentDraw > mode.draw;
      
      setStatus(isSpecial ? `Drawing Special Ball...` : `Drawing Ball #${currentDraw}...`);
      await new Promise(r => setTimeout(r, 2000)); // Simulate gate opening
      
      const isLast = performDraw(isSpecial);
      
      if (!isLast) {
        setStatus("Mixing...");
        for (let j = 7; j > 0; j--) {
          setCountdown(j);
          await new Promise(r => setTimeout(r, 1000));
        }
        setCountdown(null);
      }
    }

    setStatus("Draw Completed");
    setIsAutoDrawing(false);
  };

  const changeMode = (key: string) => {
    if (isAutoDrawing) return;
    setCurrentMode(key);
    handleReset();
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-zinc-950 overflow-hidden font-sans selection:bg-brand-primary/30">
      {/* Simulation Area */}
      <div className="relative h-[50vh] sm:h-[60vh] lg:h-full flex-1 border-b lg:border-b-0 lg:border-r border-zinc-800/50">
        <PhysicsSim key={simKey} ballCount={mode.balls} isRunning={isRunning} />
        
        {/* Status Overlay - Optimized for Mobile */}
        <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-full px-4 flex justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-black/60 backdrop-blur-xl border border-white/10 px-4 sm:px-8 py-2 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 pointer-events-auto"
            >
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500">System State</span>
                <span className="text-xs sm:text-sm font-display font-bold text-brand-primary whitespace-nowrap">{status}</span>
              </div>
              {countdown !== null && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-brand-primary/30 flex items-center justify-center bg-brand-primary/10">
                  <span className="text-sm sm:text-lg font-bold font-mono text-white">{countdown}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Overlay Controls - Enhanced Touch Targets */}
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-2 sm:p-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={isAutoDrawing}
            className={`p-3 sm:p-4 rounded-full transition-all ${
              isRunning ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            } disabled:opacity-20 active:scale-90`}
            title={isRunning ? "Pause Motor" : "Start Motor"}
          >
            {isRunning ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" fill="currentColor" />}
          </button>
          
          <button
            onClick={startAutoSequence}
            disabled={isAutoDrawing}
            className="flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-brand-primary text-white font-black text-xs sm:text-sm rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <Trophy size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:block">AUTO DRAW</span>
            <span className="xs:hidden">DRAW</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isAutoDrawing}
            className="p-3 sm:p-4 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all disabled:opacity-20 active:scale-90"
            title="Reset Machine"
          >
            <RotateCcw size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Dynamic Mode Badge - Desktop Only or Top Left */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/5 rounded-full">
           <div className="bg-brand-primary p-1.5 rounded-full">
             <Hash size={12} className="text-white" />
           </div>
           <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-300">
             Vortex <span className="text-zinc-500 mx-1">|</span> {mode.name}
           </span>
        </div>
      </div>

      {/* Control Panel - Optimized for Viewport heights */}
      <div className="w-full lg:w-96 flex flex-col bg-zinc-950 h-[50vh] lg:h-full border-t lg:border-t-0 border-zinc-800/50">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 sm:space-y-10 custom-scrollbar">
          
          {/* Settings Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Settings2 size={16} />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Machine Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-2">
              {Object.entries(MODES).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => changeMode(key)}
                  disabled={isAutoDrawing}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all text-left group ${
                    currentMode === key 
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-lg shadow-white/5' 
                      : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-base sm:text-lg tracking-tight">{m.name}</span>
                    <span className="text-[10px] sm:text-xs opacity-60 font-mono uppercase tracking-tighter">
                      POOL: {m.balls} {m.specialBalls ? `(+${m.specialBalls})` : ""} | DRAW: {m.draw} {m.specialDraw ? `+${m.specialDraw}` : ""}
                    </span>
                  </div>
                  <Layers size={18} className={`transition-transform group-hover:rotate-12 ${currentMode === key ? 'text-zinc-950' : 'text-zinc-700'}`} />
                </button>
              ))}
            </div>
          </section>

          {/* Results Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2 text-zinc-500 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Drawn History</h2>
              </div>
            <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                {results.length} / {mode.draw + (mode.specialDraw || 0)}
              </span>
            </div>

            <div className="grid grid-cols-5 xs:grid-cols-6 lg:grid-cols-4 gap-2 sm:gap-3">
              <AnimatePresence>
                {results.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-8 border-2 border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center text-zinc-700"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Simulation</p>
                  </motion.div>
                )}
                {results.map((n, i) => {
                  const isSpecial = i >= mode.draw;
                  return (
                    <motion.div
                      key={`${n}-${i}`}
                      initial={{ scale: 0, y: 20, rotate: -45 }}
                      animate={{ scale: 1, y: 0, rotate: 0 }}
                      className={`aspect-square rounded-full flex items-center justify-center font-display font-black text-lg sm:text-xl shadow-xl border ${
                        isSpecial 
                          ? 'bg-gradient-to-br from-amber-200 to-amber-500 text-zinc-950 border-amber-300 ring-2 ring-amber-400/50' 
                          : 'bg-gradient-to-br from-white to-zinc-300 text-zinc-950 border-white/50'
                      }`}
                    >
                      {n}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>

          {/* Machine Status Section - Improved Visuals */}
          <section className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Machine Telemetry</h2>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                {currentTime.toLocaleDateString('vi-VN')} {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-medium uppercase">Jackpot Odds</span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold">
                  {jackpotProbability < 0.0001 ? jackpotProbability.toExponential(4) : jackpotProbability.toFixed(6)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-medium uppercase">Combos</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  1 : {totalCombinations.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-zinc-800/50 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-medium">MOTOR VELOCITY</span>
                <div className="flex items-center gap-2">
                   <div className={`h-1 w-12 bg-zinc-800 rounded-full overflow-hidden`}>
                     <motion.div 
                       animate={{ x: isRunning ? [0, 48, 0] : 0 }} 
                       transition={{ repeat: Infinity, duration: 1 }}
                       className="h-full w-4 bg-emerald-500" 
                     />
                   </div>
                   <span className={`text-[10px] font-mono ${isRunning ? "text-emerald-500" : "text-zinc-700"}`}>
                    {isRunning ? "VAR-RPM" : "IDLE"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-medium">AIR TURBULENCE</span>
                <span className={`text-[10px] font-mono ${isRunning ? "text-sky-500" : "text-zinc-700"}`}>
                  {isRunning ? "ACTIVE_VORTEX" : "STATIC"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-medium">GATE SECURITY</span>
                <span className={`text-[10px] font-mono ${isAutoDrawing ? "text-amber-500" : "text-emerald-900"}`}>
                  {isAutoDrawing ? "UNLOCKED" : "SECURED"}
                </span>
              </div>
            </div>
          </section>

          {/* Schedule Section */}
          <section className="px-5 py-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
            <div className="flex items-center gap-2 mb-3">
               <div className="w-1.5 h-1.5 rounded-full bg-brand-primary active-pulse" />
               <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary">Draw Schedule</h2>
            </div>
            <div className="flex items-center justify-between opacity-80">
               <span className="text-[10px] text-zinc-400 font-medium">NEXT CYCLE</span>
               <span className="text-[10px] font-mono text-zinc-100 font-bold">
                 {currentMode === '6/45' ? 'Thứ 4, 6, CN' : currentMode === '6/55' ? 'Thứ 3, 5, 7' : 'Hằng ngày'}
               </span>
            </div>
          </section>

        </div>
        
        {/* Footer info - PC only or very small on mobile */}
        <div className="p-4 border-t border-zinc-900/50 bg-black/20 text-center">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
              Airmix Magnum II Simulator // Smartplay Int. Technical Ref.
            </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
        @media (max-width: 400px) {
          .xs\\:hidden { display: none; }
          .xs\\:block { display: block; }
        }
      `}</style>
    </div>
  );
}
