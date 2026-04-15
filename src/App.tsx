/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Shield, 
  Users, 
  HeartPulse, 
  Coins, 
  Calendar, 
  AlertTriangle, 
  MessageSquare, 
  Plane, 
  Twitter, 
  Mic2,
  ChevronRight,
  LogOut,
  UserPlus,
  Trophy,
  Skull
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  GameState, 
  Stats, 
  Character, 
  Scenario, 
  Difficulty 
} from './types';
import { 
  INITIAL_STATS, 
  INITIAL_TREASURY, 
  DEPUTY_CANDIDATES, 
  MINISTER_CANDIDATES, 
  SCENARIOS,
  SPEECH_OPTIONS,
  PRESS_QUESTIONS,
  DIPLOMACY_VISITS
} from './constants';
import { cn, formatCurrency } from './lib/utils';

export default function App() {
  const [game, setGame] = useState<GameState>({
    playerName: '',
    countryName: '',
    difficulty: 'Statesman',
    year: 1,
    quarter: 1,
    stats: { ...INITIAL_STATS },
    treasury: INITIAL_TREASURY,
    deputy: null,
    ministers: {
      finance: null,
      defense: null,
      health: null,
      infrastructure: null,
      foreign: null,
      interior: null,
    },
    history: [],
    isGameOver: false,
    gamePhase: 'setup',
    currentScenario: null,
    currentPressQuestion: null,
    currentDiplomacyVisit: null,
    logs: ['Welcome, Mr. President. Your term begins today.'],
  });

  const [showSpeechBuilder, setShowSpeechBuilder] = useState(false);
  const [speech, setSpeech] = useState({ opening: '', middle: '', closing: '' });
  const [showTweetBox, setShowTweetBox] = useState(false);
  const [tweet, setTweet] = useState('');
  const [showDiplomacy, setShowDiplomacy] = useState(false);

  // Difficulty Multiplier
  const getMultiplier = (diff: Difficulty) => {
    switch (diff) {
      case 'Easy': return 0.7;
      case 'Statesman': return 1;
      case 'Iron Fist': return 1.5;
      default: return 1;
    }
  };

  const addLog = (msg: string) => {
    setGame(prev => ({ ...prev, logs: [msg, ...prev.logs.slice(0, 9)] }));
  };

  const updateStats = (change: Partial<Stats>, treasuryChange: number = 0) => {
    const mult = getMultiplier(game.difficulty);
    setGame(prev => {
      const newStats = { ...prev.stats };
      Object.entries(change).forEach(([key, val]) => {
        const k = key as keyof Stats;
        const delta = val! * (val! < 0 ? mult : 1); // Harsher penalties on high difficulty
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + delta));
      });

      const newTreasury = prev.treasury + treasuryChange;
      
      // Check for Game Over
      const isDead = Object.values(newStats).some(v => (v as number) <= 0) || newTreasury <= 0;

      return {
        ...prev,
        stats: newStats,
        treasury: newTreasury,
        isGameOver: isDead,
        gamePhase: isDead ? 'ended' : prev.gamePhase
      };
    });
  };

  const nextTurn = () => {
    if (game.year === 8 && game.quarter === 4) {
      setGame(prev => ({ ...prev, gamePhase: 'ended' }));
      confetti();
      return;
    }

    setGame(prev => {
      const nextQuarter = prev.quarter === 4 ? 1 : prev.quarter + 1;
      const nextYear = prev.quarter === 4 ? prev.year + 1 : prev.year;
      
      // Random Event or Scenario
      const rand = Math.random();
      const isOppositionEvent = rand > 0.8;
      const isPressConference = rand > 0.6 && rand <= 0.8;
      const isDiplomacyVisit = rand > 0.4 && rand <= 0.6;
      
      let randomScenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
      
      if (isOppositionEvent) {
        const oppositionMsgs = [
          "The opposition party has blocked your latest infrastructure bill.",
          "Opposition leaders are holding a massive rally against your policies.",
          "A leaked document from the opposition claims you are mishandling funds.",
        ];
        const msg = oppositionMsgs[Math.floor(Math.random() * oppositionMsgs.length)];
        updateStats({ approval: -5, stability: -5 });
        addLog(`OPPOSITION: ${msg}`);
      }

      if (isPressConference) {
        const q = PRESS_QUESTIONS[Math.floor(Math.random() * PRESS_QUESTIONS.length)];
        return {
          ...prev,
          year: nextYear,
          quarter: nextQuarter,
          gamePhase: 'press_conference',
          currentPressQuestion: q,
          logs: [`Year ${nextYear} Q${nextQuarter}: Press Conference scheduled.`, ...prev.logs]
        };
      }

      if (isDiplomacyVisit) {
        const v = DIPLOMACY_VISITS[Math.floor(Math.random() * DIPLOMACY_VISITS.length)];
        return {
          ...prev,
          year: nextYear,
          quarter: nextQuarter,
          gamePhase: 'diplomacy_visit',
          currentDiplomacyVisit: v,
          logs: [`Year ${nextYear} Q${nextQuarter}: State Visit to ${v.country} scheduled.`, ...prev.logs]
        };
      }

      // Minister Conflict
      if (Math.random() > 0.8) {
        addLog("CONFLICT: Your Finance and Defense ministers are arguing over the budget.");
        updateStats({ stability: -5 });
      }
      
      // Tax Revenue
      const taxRevenue = Math.floor(prev.stats.economy * 1000000);
      
      return {
        ...prev,
        year: nextYear,
        quarter: nextQuarter,
        currentScenario: randomScenario,
        treasury: prev.treasury + taxRevenue,
        logs: [`Year ${nextYear} Q${nextQuarter}: Collected ${formatCurrency(taxRevenue)} in taxes.`, ...prev.logs]
      };
    });
  };

  const handlePressAnswer = (option: any) => {
    updateStats(option.consequences.stats);
    addLog(`PRESS: ${option.consequences.message}`);
    setGame(prev => ({ ...prev, gamePhase: 'playing', currentPressQuestion: null }));
  };

  const handleDiplomacyObjective = (objective: any) => {
    updateStats(objective.consequences.stats, objective.consequences.treasury);
    addLog(`DIPLOMACY: ${objective.consequences.message}`);
    setGame(prev => ({ ...prev, gamePhase: 'playing', currentDiplomacyVisit: null }));
  };

  const handleChoice = (choice: Scenario['choices'][0]) => {
    updateStats(choice.consequences.stats, choice.consequences.treasury);
    addLog(choice.consequences.message);
    setGame(prev => ({ ...prev, currentScenario: null }));
  };

  const handleSpeech = () => {
    if (!speech.opening || !speech.middle || !speech.closing) return;
    updateStats({ approval: 10, stability: 5 });
    addLog("Your address to the nation was well-received.");
    setShowSpeechBuilder(false);
    setSpeech({ opening: '', middle: '', closing: '' });
  };

  const handleTweet = () => {
    if (!tweet) return;
    const approvalChange = Math.random() > 0.5 ? 5 : -5;
    updateStats({ approval: approvalChange });
    addLog(approvalChange > 0 ? "Your tweet went viral!" : "Your tweet caused a controversy.");
    setShowTweetBox(false);
    setTweet('');
  };

  const handleDiplomacy = (type: 'funds' | 'alliance') => {
    if (type === 'funds') {
      updateStats({ economy: 5 }, 500000000);
      addLog("Foreign aid secured: +500M Ksh.");
    } else {
      updateStats({ stability: 10, military: 5 });
      addLog("New strategic alliance formed.");
    }
    setShowDiplomacy(false);
  };

  // UI Sections
  const SetupScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-bg text-text-main">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 sleek-card p-8 backdrop-blur-xl"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-accent">
            Commander in Chief
          </h1>
          <p className="text-text-dim">The burden of leadership awaits.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Your Name</label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-border rounded-lg p-3 mt-1 focus:border-accent outline-none transition-all"
              placeholder="President..."
              value={game.playerName}
              onChange={e => setGame(prev => ({ ...prev, playerName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Country Name</label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-border rounded-lg p-3 mt-1 focus:border-accent outline-none transition-all"
              placeholder="Republic of..."
              value={game.countryName}
              onChange={e => setGame(prev => ({ ...prev, countryName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Difficulty</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['Easy', 'Statesman', 'Iron Fist'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setGame(prev => ({ ...prev, difficulty: d }))}
                  className={cn(
                    "p-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all",
                    game.difficulty === d ? "bg-accent border-accent text-white" : "bg-white/5 border-border text-text-dim hover:border-text-dim"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          disabled={!game.playerName || !game.countryName}
          onClick={() => setGame(prev => ({ ...prev, gamePhase: 'deputy_selection' }))}
          className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
        >
          Begin Term <ChevronRight size={20} />
        </button>
      </motion.div>
    </div>
  );

  const SelectionScreen = ({ type }: { type: 'deputy' | 'minister' }) => {
    const [currentRole, setCurrentRole] = useState<keyof GameState['ministers']>('finance');
    const candidates = type === 'deputy' ? DEPUTY_CANDIDATES : MINISTER_CANDIDATES[currentRole];
    
    const handleAppoint = (c: Character) => {
      if (type === 'deputy') {
        setGame(prev => ({ ...prev, deputy: c, gamePhase: 'minister_selection' }));
        if (c.bonus) updateStats(c.bonus);
        if (c.malus) updateStats(c.malus);
      } else {
        setGame(prev => {
          const newMinisters = { ...prev.ministers, [currentRole]: c };
          const roles: (keyof GameState['ministers'])[] = ['finance', 'defense', 'health', 'infrastructure', 'foreign', 'interior'];
          const currentIndex = roles.indexOf(currentRole);
          
          if (currentIndex < roles.length - 1) {
            setCurrentRole(roles[currentIndex + 1]);
            return { ...prev, ministers: newMinisters };
          } else {
            return { ...prev, ministers: newMinisters, gamePhase: 'playing' };
          }
        });
        if (c.bonus) updateStats(c.bonus);
        if (c.malus) updateStats(c.malus);
      }
    };

    return (
      <div className="min-h-screen bg-bg text-text-main p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              {type === 'deputy' ? 'Select your Deputy President' : `Appoint Minister of ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`}
            </h2>
            <p className="text-text-dim mt-2">Choose wisely. Their expertise will shape your legacy.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map(c => (
              <motion.div 
                key={c.id}
                whileHover={{ y: -5 }}
                className="sleek-card overflow-hidden flex flex-col"
              >
                <img src={c.image} alt={c.name} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold">{c.name}</h3>
                    <span className="text-xs font-mono text-accent uppercase tracking-widest">{c.role}</span>
                  </div>
                  <p className="text-text-dim text-sm mb-6 flex-1">{c.brief}</p>
                  
                  <div className="space-y-2 mb-6">
                    {c.bonus && Object.entries(c.bonus).map(([k, v]) => (
                      <div key={k} className="text-xs text-success flex items-center gap-1">
                        <TrendingUp size={12} /> +{v}% {k}
                      </div>
                    ))}
                    {c.malus && Object.entries(c.malus).map(([k, v]) => (
                      <div key={k} className="text-xs text-danger flex items-center gap-1">
                        <TrendingUp size={12} className="rotate-180" /> {v}% {k}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleAppoint(c)}
                    className="w-full sleek-btn py-3 font-bold"
                  >
                    Appoint
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const PressConferenceScreen = () => {
    const q = game.currentPressQuestion;
    if (!q) return null;
    return (
      <div className="h-screen bg-bg text-text-main flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full sleek-card p-8 space-y-8"
        >
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent">
              <Mic2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Press Conference</h2>
              <p className="text-text-dim text-xs uppercase tracking-widest">{q.journalist} • {q.outlet}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-lg italic text-text-main">"{q.question}"</p>
            <div className="grid gap-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handlePressAnswer(opt)}
                  className="sleek-btn p-4 text-left hover:bg-accent/10 transition-all"
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const DiplomacyVisitScreen = () => {
    const v = game.currentDiplomacyVisit;
    if (!v) return null;
    return (
      <div className="h-screen bg-bg text-text-main flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full sleek-card overflow-hidden"
        >
          <img src={v.image} className="w-full h-64 object-cover" referrerPolicy="no-referrer" />
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-end border-b border-border pb-6">
              <div>
                <h2 className="text-3xl font-bold">State Visit: {v.country}</h2>
                <p className="text-text-dim mt-1">Meeting with {v.leader}</p>
              </div>
              <div className="w-16 h-10 bg-gradient-to-r from-blue-600 via-white to-blue-600 rounded-sm shadow-lg" />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Strategic Objectives</h3>
                <p className="text-text-dim text-sm leading-relaxed">
                  Your diplomatic team has identified several key opportunities for this visit. Choose your primary focus carefully.
                </p>
              </div>
              <div className="grid gap-3">
                {v.objectives.map((obj, i) => (
                  <button
                    key={i}
                    onClick={() => handleDiplomacyObjective(obj)}
                    className="sleek-btn p-4 text-left group"
                  >
                    <div className="font-bold text-sm group-hover:text-accent transition-colors">{obj.title}</div>
                    <div className="text-[10px] text-text-dim mt-1">{obj.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const MainDashboard = () => (
    <div className="h-screen bg-bg text-text-main flex flex-col p-3 gap-3 overflow-hidden">
      {/* Header */}
      <header className="h-[70px] sleek-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-6 bg-gradient-to-r from-blue-600 via-white to-blue-600 rounded-sm" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight">{game.countryName}</h2>
            <p className="text-[10px] text-text-dim uppercase tracking-widest">
              Year {game.year} • Q{game.quarter} • Term Progress: {Math.floor(((game.year - 1) * 4 + game.quarter) / 32 * 100)}%
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-text-dim uppercase tracking-widest">Treasury Reserve</span>
          <div className="text-lg font-mono font-bold text-success">{formatCurrency(game.treasury)}</div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[240px_1fr_280px] gap-3 min-h-0">
        {/* Left Sidebar: Cabinet */}
        <aside className="sleek-card p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Deputy President</div>
          {game.deputy && (
            <div className="bg-white/5 border border-border p-3 rounded-lg border-l-4 border-l-accent">
              <div className="font-bold text-sm">{game.deputy.name}</div>
              <div className="text-[10px] text-accent uppercase">{game.deputy.role}</div>
              <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-success w-[95%]" />
              </div>
            </div>
          )}

          <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim mt-2">Cabinet Ministers</div>
          <div className="space-y-2">
            {Object.entries(game.ministers).map(([role, minister]) => {
              const m = minister as Character | null;
              return m && (
                <div key={role} className="bg-white/5 border border-border p-3 rounded-lg">
                  <div className="font-semibold text-xs">{m.name}</div>
                  <div className="text-[10px] text-text-dim capitalize">{role}</div>
                  <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-success w-[80%]" />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main: Situation Room */}
        <main className="flex flex-col gap-3 min-h-0">
          {game.currentScenario ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 sleek-card border-danger/50 p-8 flex flex-col justify-center text-center relative overflow-y-auto"
            >
              <div className="text-danger font-bold text-xs uppercase tracking-widest mb-4">⚠️ Critical Infrastructure Failure</div>
              <h2 className="text-2xl font-bold mb-6">{game.currentScenario.title}</h2>
              <p className="text-text-main text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
                {game.currentScenario.description}
              </p>
              
              <div className="grid gap-3 max-w-xl mx-auto w-full">
                {game.currentScenario.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => handleChoice(choice)}
                    className="sleek-btn p-4 text-left flex justify-between items-center group"
                  >
                    <span className="text-sm font-medium">{choice.text}</span>
                    <ChevronRight size={16} className="text-text-dim group-hover:text-accent" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 sleek-card flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-text-dim border border-border mb-6">
                <Calendar size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">Cabinet Meeting in Progress</h2>
              <p className="text-text-dim text-sm mb-8">Your ministers are reviewing the latest reports from the provinces.</p>
              <button 
                onClick={nextTurn}
                className="bg-accent hover:bg-accent/80 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-accent/20"
              >
                Proceed to Next Quarter
              </button>
            </div>
          )}
        </main>

        {/* Right Sidebar: Intelligence */}
        <aside className="flex flex-col gap-3 min-h-0">
          <div className="sleek-card p-4 space-y-4 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">National Vital Signs</div>
            <StatItem label="Economy" value={game.stats.economy} color="text-success" />
            <StatItem label="Stability" value={game.stats.stability} color="text-warning" />
            <StatItem label="Approval" value={game.stats.approval} color="text-accent" />
            <StatItem label="Military" value={game.stats.military} color="text-text-dim" />
          </div>

          <div className="sleek-card p-4 flex flex-col min-h-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-3">Live Intel Feed</div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {game.logs.map((log, i) => (
                <div key={i} className="text-[11px] py-2 border-b border-white/5 last:border-0">
                  <span className="font-mono text-text-dim mr-2">14:02</span>
                  <span className={cn(
                    log.includes('OPPOSITION') ? "text-danger" : 
                    log.includes('CONFLICT') ? "text-warning" : 
                    "text-text-main"
                  )}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="h-[70px] sleek-card flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => setShowSpeechBuilder(true)} className="bg-accent text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-accent/80 transition-all">
          Address the Nation
        </button>
        <button onClick={() => setShowTweetBox(true)} className="bg-white/5 border border-border px-5 py-2 rounded-full text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
          Social Media Feed <span className="bg-danger text-[10px] px-1.5 py-0.5 rounded-full">12</span>
        </button>
        <button onClick={() => setShowDiplomacy(true)} className="bg-white/5 border border-border px-5 py-2 rounded-full text-xs font-bold hover:bg-white/10 transition-all">
          Foreign Diplomacy
        </button>
        
        <div className="ml-auto flex items-center gap-3 text-xs text-accent">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-accent overflow-hidden flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-slate-700 border border-slate-600" />
          </div>
          <span>Presidential Account: 4.2M Followers</span>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showSpeechBuilder && (
          <Modal title="Address the Nation" onClose={() => setShowSpeechBuilder(false)}>
            <div className="space-y-6">
              <SpeechSection label="Opening" options={SPEECH_OPTIONS.openings} selected={speech.opening} onSelect={v => setSpeech(s => ({ ...s, opening: v }))} />
              <SpeechSection label="The Message" options={SPEECH_OPTIONS.middles} selected={speech.middle} onSelect={v => setSpeech(s => ({ ...s, middle: v }))} />
              <SpeechSection label="Closing" options={SPEECH_OPTIONS.closings} selected={speech.closing} onSelect={v => setSpeech(s => ({ ...s, closing: v }))} />
              <button 
                onClick={handleSpeech}
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold transition-all mt-4"
              >
                Deliver Speech
              </button>
            </div>
          </Modal>
        )}

        {showTweetBox && (
          <Modal title="Post a Tweet" onClose={() => setShowTweetBox(false)}>
            <div className="space-y-4">
              <textarea 
                className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 h-32 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                placeholder="What's happening in the Republic?"
                value={tweet}
                onChange={e => setTweet(e.target.value)}
              />
              <button 
                onClick={handleTweet}
                className="w-full bg-blue-500 hover:bg-blue-400 py-4 rounded-xl font-bold transition-all"
              >
                Post to X
              </button>
            </div>
          </Modal>
        )}

        {showDiplomacy && (
          <Modal title="State Visit" onClose={() => setShowDiplomacy(false)}>
            <div className="space-y-6">
              <img src="https://picsum.photos/seed/plane/600/300" className="w-full h-40 object-cover rounded-xl" referrerPolicy="no-referrer" />
              <p className="text-slate-400">Visiting a neighboring superpower. What is your primary objective?</p>
              <div className="grid gap-3">
                <button onClick={() => handleDiplomacy('funds')} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-left">
                  <div className="font-bold">Request Development Funds</div>
                  <div className="text-xs text-slate-500">Increases Treasury and Economy</div>
                </button>
                <button onClick={() => handleDiplomacy('alliance')} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-left">
                  <div className="font-bold">Propose Military Alliance</div>
                  <div className="text-xs text-slate-500">Increases Stability and Military</div>
                </button>
              </div>
            </div>
          </Modal>
        )}

        {game.gamePhase === 'ended' && (
          <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-8"
            >
              {game.isGameOver ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                    <Skull size={40} />
                  </div>
                  <h2 className="text-4xl font-bold">Presidency Collapsed</h2>
                  <p className="text-slate-400">Your country has fallen into chaos. History will remember you as a failure.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <Trophy size={40} />
                  </div>
                  <h2 className="text-4xl font-bold">Term Completed</h2>
                  <p className="text-slate-400">You have served your 8 years. Your legacy is etched in stone.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-2xl">
                  <div className="text-xs text-slate-500 uppercase">Final Approval</div>
                  <div className="text-2xl font-bold">{game.stats.approval}%</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-2xl">
                  <div className="text-xs text-slate-500 uppercase">Treasury Balance</div>
                  <div className="text-lg font-bold truncate">{formatCurrency(game.treasury)}</div>
                </div>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all"
              >
                New Game
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (game.gamePhase === 'setup') return <SetupScreen />;
  if (game.gamePhase === 'deputy_selection') return <SelectionScreen type="deputy" />;
  if (game.gamePhase === 'minister_selection') return <SelectionScreen type="minister" />;
  if (game.gamePhase === 'press_conference') return <PressConferenceScreen />;
  if (game.gamePhase === 'diplomacy_visit') return <DiplomacyVisitScreen />;
  
  return <MainDashboard />;
}

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
        <span className="text-text-dim">{label}</span>
        <span className={color}>{value}%</span>
      </div>
      <div className="stat-bar-outer bg-white/5">
        <div 
          className={cn("stat-bar-inner", color.replace('text-', 'bg-'))} 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg sleek-card p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-main transition-colors"><LogOut size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function SpeechSection({ label, options, selected, onSelect }: { label: string, options: string[], selected: string, onSelect: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</label>
      <div className="grid gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              "text-left p-3 rounded-lg text-sm transition-all border",
              selected === opt ? "bg-accent border-accent text-white" : "bg-white/5 border-border text-text-dim hover:border-text-dim"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
