/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, ReactNode, Dispatch, SetStateAction, useMemo, Component } from 'react';
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
  Skull,
  LogIn,
  RefreshCw
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import confetti from 'canvas-confetti';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  DIPLOMACY_VISITS,
  SCENE_PROMPTS
} from './constants';
import { cn, formatCurrency } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
    taxLevel: 'Medium',
    gamePhase: 'setup',
    currentScenario: null,
    currentPressQuestion: null,
    currentDiplomacyVisit: null,
    logs: ['Welcome, Mr. President. Your term begins today.'],
    socialFeed: [],
    intelReports: [],
  });

  const [showSpeechBuilder, setShowSpeechBuilder] = useState(false);
  const [speech, setSpeech] = useState({ opening: '', middle: '', closing: '' });
  const [showTweetBox, setShowTweetBox] = useState(false);
  const [tweet, setTweet] = useState('');
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sceneImages, setSceneImages] = useState<Record<string, string>>({});

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Test Firestore Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Load Game State
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'games', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        setGame(prev => ({ ...prev, ...data }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${user.uid}`);
    });
    return () => unsub();
  }, [user]);

  // Save Game State
  const saveGame = useCallback(async (newState: GameState) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'games', user.uid), {
        ...newState,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `games/${user.uid}`);
    }
  }, [user]);

  // Auto-save on game state change
  useEffect(() => {
    if (user && game.gamePhase !== 'setup') {
      const timer = setTimeout(() => {
        saveGame(game);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game, user, saveGame]);

  // Helper to generate AI image
  const generateAIImage = useCallback(async (prompt: string): Promise<string> => {
    try {
      setIsGeneratingImage(true);
      // Check if prompt matches a scene key
      const finalPrompt = (SCENE_PROMPTS as any)[prompt] || prompt;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: finalPrompt }],
        },
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return `https://picsum.photos/seed/${Math.random()}/400/400`;
    } catch (error) {
      console.error("AI Image Generation failed:", error);
      return `https://picsum.photos/seed/${Math.random()}/400/400`;
    } finally {
      setIsGeneratingImage(false);
    }
  }, []);

  // Pre-generate common scenes
  useEffect(() => {
    const loadScenes = async () => {
      const scenes = ['statehouse', 'cabinet', 'media', 'diplomat'];
      const newScenes: Record<string, string> = {};
      for (const s of scenes) {
        newScenes[s] = await generateAIImage(s);
      }
      setSceneImages(newScenes);
    };
    if (game.gamePhase === 'playing') loadScenes();
  }, [game.gamePhase, generateAIImage]);

  const generateIntelReport = useCallback(async (gameState: GameState) => {
    try {
      setIsAnalyzing(true);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a short, realistic intelligence field report for a president. 
        Country: ${gameState.countryName}. 
        Current Stats: Economy ${gameState.stats.economy}%, Stability ${gameState.stats.stability}%, Approval ${gameState.stats.approval}%, Military ${gameState.stats.military}%.
        The report should be concise (1-2 sentences) and sound like it's from a field operative.
        Return JSON format: { "source": "string", "content": "string", "reliability": "High" | "Medium" | "Low" }`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      const newReport = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setGame(prev => ({ ...prev, intelReports: [newReport, ...prev.intelReports].slice(0, 10) }));
    } catch (error) {
      console.error("Failed to generate intel report:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const generateSocialFeed = useCallback(async (gameState: GameState) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 3 short social media posts (tweets) from citizens about the current state of the country.
        Country: ${gameState.countryName}.
        President: ${gameState.playerName}.
        Current Stats: Economy ${gameState.stats.economy}%, Stability ${gameState.stats.stability}%, Approval ${gameState.stats.approval}%.
        Posts should reflect the approval rating (positive if high, negative if low).
        Return JSON format: { "posts": [ { "author": "string", "handle": "string", "content": "string", "sentiment": "positive" | "negative" | "neutral" } ] }`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      const newPosts = data.posts.map((p: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        ...p,
        timestamp: "Just now"
      }));
      setGame(prev => ({ ...prev, socialFeed: [...newPosts, ...prev.socialFeed].slice(0, 20) }));
    } catch (error) {
      console.error("Failed to generate social feed:", error);
    }
  }, []);

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

  const updateStats = useCallback((change: Partial<Stats>, treasuryChange: number = 0) => {
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

      // Social media reaction to treasury/stats
      let socialMsg = "";
      if (treasuryChange < -100000000) socialMsg = "Citizens are questioning the massive government spending.";
      if (newStats.approval < 30) socialMsg = "Trending: #ResignNow - Public anger reaches boiling point.";
      
      return {
        ...prev,
        stats: newStats,
        treasury: newTreasury,
        isGameOver: isDead,
        gamePhase: isDead ? 'ended' : prev.gamePhase
      };
    });
  }, [game.difficulty]);

  const nextTurn = useCallback(() => {
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
        
        // Generate dynamic image for opposition/protest
        generateAIImage(`Cinematic wide shot of a massive political protest in a city square, protestors holding signs, dramatic lighting, high quality photography`).then(img => {
          setGame(prev => ({
            ...prev,
            currentScenario: prev.currentScenario ? { ...prev.currentScenario, image: img } : prev.currentScenario
          }));
        });
      }

      if (isPressConference) {
        const q = { ...PRESS_QUESTIONS[Math.floor(Math.random() * PRESS_QUESTIONS.length)] };
        // Generate dynamic image for journalist and scene
        generateAIImage('media').then(img => {
          setGame(prev => ({
            ...prev,
            currentScenario: prev.currentScenario ? { ...prev.currentScenario, image: img } : prev.currentScenario
          }));
        });
        
        generateAIImage(`Professional portrait of a journalist named ${q.journalist} from ${q.outlet}, high quality photography, newsroom background`).then(img => {
          setGame(prev => ({
            ...prev,
            currentPressQuestion: prev.currentPressQuestion?.id === q.id ? { ...prev.currentPressQuestion, journalistImage: img } : prev.currentPressQuestion
          }));
        });

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
        generateAIImage('diplomat').then(img => {
          setGame(prev => ({
            ...prev,
            currentDiplomacyVisit: prev.currentDiplomacyVisit?.id === v.id ? { ...prev.currentDiplomacyVisit, image: img } : prev.currentDiplomacyVisit
          }));
        });
        
        return {
          ...prev,
          year: nextYear,
          quarter: nextQuarter,
          gamePhase: 'diplomacy_visit',
          currentDiplomacyVisit: v,
          logs: [`Year ${nextYear} Q${nextQuarter}: State Visit to ${v.country} scheduled.`, ...prev.logs]
        };
      }

      // Tax Revenue & Consequences
      let taxIncome = 0;
      let taxApprovalHit = 0;
      if (prev.taxLevel === 'High') {
        taxIncome = Math.floor(prev.stats.economy * 2000000);
        taxApprovalHit = -10;
        addLog("HIGH TAXES: Treasury is filling up, but the public is furious.");
      } else if (prev.taxLevel === 'Medium') {
        taxIncome = Math.floor(prev.stats.economy * 1000000);
        taxApprovalHit = 0;
      } else {
        taxIncome = Math.floor(prev.stats.economy * 500000);
        taxApprovalHit = 5;
        addLog("LOW TAXES: Public approval is rising due to tax breaks.");
      }

      // Ministerial Conflict (Chaos Engine)
      const hasConflict = Math.random() > 0.7;
      let conflictScenario = null;
      if (hasConflict) {
        const conflictMsgs = [
          {
            title: "Ministerial Feud",
            description: "Your Minister of Finance accuses the Deputy President of misappropriating funds.",
            choices: [
              { text: "Fire the Minister", consequences: { stats: { stability: -10 }, treasury: 0, message: "The treasury leak stops, but the cabinet is shaken." } },
              { text: "Publicly Support Them", consequences: { stats: { approval: -15, stability: 5 }, treasury: 0, message: "Loyalty remains, but the public is outraged." } },
              { text: "Ignore It", consequences: { stats: { stability: -15 }, treasury: 0, message: "A resignation event is triggered by other competent leaders." } }
            ]
          }
        ];
        conflictScenario = conflictMsgs[0];
        addLog("CHAOS: Internal conflict within the cabinet!");
      }

      const newState = {
        ...prev,
        year: nextYear,
        quarter: nextQuarter,
        currentScenario: conflictScenario || randomScenario,
        treasury: prev.treasury + taxIncome,
        stats: {
          ...prev.stats,
          approval: Math.max(0, Math.min(100, prev.stats.approval + taxApprovalHit))
        },
        logs: [`Year ${nextYear} Q${nextQuarter}: Collected ${formatCurrency(taxIncome)} in taxes.`, ...prev.logs]
      };

      // Scene Visual Triggers
      if (newState.stats.stability < 20) {
        generateAIImage(SCENE_PROMPTS.unrest).then(img => {
          setGame(p => ({ ...p, currentScenario: p.currentScenario ? { ...p.currentScenario, image: img } : p.currentScenario }));
        });
      }

      // Trigger AI analysis in background
      generateIntelReport(newState);
      generateSocialFeed(newState);

      return newState;
    });
  }, [game.year, game.quarter, updateStats, generateAIImage, generateIntelReport, generateSocialFeed]);

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
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <RefreshCw className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={loginWithGoogle} />;
  }

  if (game.gamePhase === 'setup') return <SetupScreen game={game} setGame={setGame} />;
  if (game.gamePhase === 'deputy_selection') return <SelectionScreen type="deputy" generateAIImage={generateAIImage} setGame={setGame} updateStats={updateStats} />;
  if (game.gamePhase === 'minister_selection') return <SelectionScreen type="minister" generateAIImage={generateAIImage} setGame={setGame} updateStats={updateStats} />;
  if (game.gamePhase === 'press_conference') return <PressConferenceScreen game={game} handlePressAnswer={handlePressAnswer} />;
  if (game.gamePhase === 'diplomacy_visit') return <DiplomacyVisitScreen game={game} handleDiplomacyObjective={handleDiplomacyObjective} />;
  
  return (
    <MainDashboard 
      game={game} 
      nextTurn={nextTurn} 
      handleChoice={handleChoice}
      showSpeechBuilder={showSpeechBuilder}
      setShowSpeechBuilder={setShowSpeechBuilder}
      speech={speech}
      setSpeech={setSpeech}
      handleSpeech={handleSpeech}
      showTweetBox={showTweetBox}
      setShowTweetBox={setShowTweetBox}
      tweet={tweet}
      setTweet={setTweet}
      handleTweet={handleTweet}
      showDiplomacy={showDiplomacy}
      setShowDiplomacy={setShowDiplomacy}
      handleDiplomacy={handleDiplomacy}
      isAnalyzing={isAnalyzing}
      sceneImages={sceneImages}
      setGame={setGame}
    />
  );
}

// Sub-components moved outside to prevent infinite re-renders
function SetupScreen({ game, setGame }: { game: GameState, setGame: Dispatch<SetStateAction<GameState>> }) {
  return (
    <div className="min-h-screen bg-bg text-text-main flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full sleek-card p-10 space-y-8"
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
}

function SelectionScreen({ type, generateAIImage, setGame, updateStats }: { 
  type: 'deputy' | 'minister', 
  generateAIImage: (prompt: string) => Promise<string>,
  setGame: Dispatch<SetStateAction<GameState>>,
  updateStats: (change: Partial<Stats>, treasuryChange?: number) => void
}) {
  const [currentRole, setCurrentRole] = useState<keyof GameState['ministers']>('finance');
  const [candidateImages, setCandidateImages] = useState<Record<string, string>>({});
  const candidates = type === 'deputy' ? DEPUTY_CANDIDATES : MINISTER_CANDIDATES[currentRole];

    useEffect(() => {
      const loadImages = async () => {
        const newImages: Record<string, string> = {};
        for (const c of candidates) {
          const prompt = c.id.includes('deputy') 
            ? `Professional portrait of ${c.name}, ${c.role}, official government portrait, cinematic lighting, high quality`
            : `Professional portrait of ${c.name}, ${c.role}, high quality photography, official government portrait background, cinematic lighting`;
          newImages[c.id] = await generateAIImage(prompt);
        }
        setCandidateImages(newImages);
      };
      loadImages();
    }, [candidates, generateAIImage]);
  
  const handleAppoint = (c: Character) => {
    const characterWithAIImage = { ...c, image: candidateImages[c.id] || c.image };
    if (type === 'deputy') {
      setGame(prev => ({ ...prev, deputy: characterWithAIImage, gamePhase: 'minister_selection' }));
      if (c.bonus) updateStats(c.bonus);
      if (c.malus) updateStats(c.malus);
    } else {
      setGame(prev => {
        const newMinisters = { ...prev.ministers, [currentRole]: characterWithAIImage };
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
            {type === 'deputy' ? 'Select your Inner Circle: Deputy President' : `Appoint Minister of ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`}
          </h2>
          <p className="text-text-dim mt-2">
            {type === 'deputy' ? 'Review the dossiers carefully. This choice will define your administration.' : 'Choose wisely. Their expertise will shape your legacy.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map(c => (
            <motion.div 
              key={c.id}
              whileHover={{ y: -5 }}
              className={cn(
                "sleek-card overflow-hidden flex flex-col border-t-4",
                c.id.includes('loyalist') ? "border-t-success" : 
                c.id.includes('technocrat') ? "border-t-accent" : 
                c.id.includes('populist') ? "border-t-warning" : "border-t-border"
              )}
            >
              <div className="relative h-64 bg-slate-800">
                {candidateImages[c.id] ? (
                  <img src={candidateImages[c.id]} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <div className="text-accent text-[10px] font-bold uppercase tracking-widest">Declassifying Dossier...</div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent opacity-60" />
                <div className="absolute bottom-4 left-6">
                  <span className="text-[10px] font-mono text-white bg-accent px-2 py-1 rounded uppercase tracking-widest">{c.role}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{c.name}</h3>
                </div>
                <p className="text-text-dim text-sm mb-6 flex-1 leading-relaxed">{c.brief}</p>
                
                <div className="space-y-2 mb-6 bg-white/5 p-3 rounded-lg">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Projected Impact</div>
                  {c.bonus && Object.entries(c.bonus).map(([k, v]) => (
                    <div key={k} className="text-xs text-success flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="capitalize">{k}</span> <span className="font-bold">+{v}%</span>
                    </div>
                  ))}
                  {c.malus && Object.entries(c.malus).map(([k, v]) => (
                    <div key={k} className="text-xs text-danger flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                      <span className="capitalize">{k}</span> <span className="font-bold">{v}%</span>
                    </div>
                  ))}
                </div>

                <button 
                  disabled={!candidateImages[c.id]}
                  onClick={() => handleAppoint(c)}
                  className="w-full sleek-btn py-3 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Confirm Appointment <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PressConferenceScreen({ game, handlePressAnswer }: { game: GameState, handlePressAnswer: (opt: any) => void }) {
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
          <div className="w-16 h-16 bg-slate-800 rounded-full overflow-hidden border border-border">
            {q.journalistImage ? (
              <img src={q.journalistImage} alt={q.journalist} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Mic2 size={24} className="text-accent animate-pulse" />
              </div>
            )}
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
}

function DiplomacyVisitScreen({ game, handleDiplomacyObjective }: { game: GameState, handleDiplomacyObjective: (obj: any) => void }) {
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
}

function MainDashboard({ 
  game, 
  nextTurn, 
  handleChoice,
  showSpeechBuilder,
  setShowSpeechBuilder,
  speech,
  setSpeech,
  handleSpeech,
  showTweetBox,
  setShowTweetBox,
  tweet,
  setTweet,
  handleTweet,
  showDiplomacy,
  setShowDiplomacy,
  handleDiplomacy,
  isAnalyzing,
  sceneImages,
  setGame
}: { 
  game: GameState, 
  nextTurn: () => void, 
  handleChoice: (choice: any) => void,
  showSpeechBuilder: boolean,
  setShowSpeechBuilder: (v: boolean) => void,
  speech: any,
  setSpeech: any,
  handleSpeech: () => void,
  showTweetBox: boolean,
  setShowTweetBox: (v: boolean) => void,
  tweet: string,
  setTweet: (v: string) => void,
  handleTweet: () => void,
  showDiplomacy: boolean,
  setShowDiplomacy: (v: boolean) => void,
  handleDiplomacy: (type: string) => void,
  isAnalyzing: boolean,
  sceneImages: Record<string, string>,
  setGame: Dispatch<SetStateAction<GameState>>
}) {
  return (
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
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-text-dim uppercase tracking-widest">Treasury Reserve</span>
            <div className="text-lg font-mono font-bold text-success">{formatCurrency(game.treasury)}</div>
          </div>
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
          <div className="h-[200px] sleek-card overflow-hidden relative shrink-0">
            {game.currentScenario?.image || sceneImages['cabinet'] ? (
              <img src={game.currentScenario?.image || sceneImages['cabinet']} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <Plane size={48} className="text-accent opacity-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent opacity-60" />
            <div className="absolute bottom-4 left-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Current Situation</h3>
            </div>
          </div>

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
            
            <div className="pt-4 border-t border-border">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Taxation Policy</div>
              <div className="grid grid-cols-3 gap-1">
                {(['Low', 'Medium', 'High'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setGame(prev => ({ ...prev, taxLevel: level }))}
                    className={cn(
                      "text-[9px] font-bold py-1.5 rounded border transition-all",
                      game.taxLevel === level ? "bg-accent border-accent text-white" : "bg-white/5 border-border text-text-dim"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sleek-card p-4 flex flex-col min-h-0 flex-1">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Live Intel Feed</div>
              {isAnalyzing && <div className="w-2 h-2 bg-accent rounded-full animate-ping" />}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {game.intelReports.length > 0 ? game.intelReports.map((report) => (
                <div key={report.id} className="bg-white/5 border border-border p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-accent uppercase">{report.source}</span>
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded uppercase font-bold",
                      report.reliability === 'High' ? "bg-success/20 text-success" :
                      report.reliability === 'Medium' ? "bg-warning/20 text-warning" :
                      "bg-danger/20 text-danger"
                    )}>
                      {report.reliability} Reliability
                    </span>
                  </div>
                  <p className="text-[11px] text-text-main leading-relaxed">{report.content}</p>
                  <div className="text-[9px] text-text-dim text-right">{report.timestamp}</div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <AlertTriangle size={24} className="text-text-dim mb-2 opacity-20" />
                  <p className="text-[10px] text-text-dim uppercase tracking-widest">No field reports gathered</p>
                </div>
              )}
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
          <Modal title="Speech Builder" onClose={() => setShowSpeechBuilder(false)}>
            <div className="space-y-6">
              <div className="bg-accent/10 border border-accent/20 p-4 rounded-xl">
                <p className="text-sm italic text-text-main">
                  "{speech.opening || '...'} {speech.middle || '...'} {speech.closing || '...'}"
                </p>
              </div>
              <SpeechSection label="Opening Context" options={SPEECH_OPTIONS.openings} selected={speech.opening} onSelect={v => setSpeech((s: any) => ({ ...s, opening: v }))} />
              <SpeechSection label="The Action" options={SPEECH_OPTIONS.middles} selected={speech.middle} onSelect={v => setSpeech((s: any) => ({ ...s, middle: v }))} />
              <SpeechSection label="The Vision" options={SPEECH_OPTIONS.closings} selected={speech.closing} onSelect={v => setSpeech((s: any) => ({ ...s, closing: v }))} />
              <button 
                disabled={!speech.opening || !speech.middle || !speech.closing}
                onClick={handleSpeech}
                className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 py-4 rounded-xl font-bold transition-all mt-4 shadow-lg shadow-accent/20"
              >
                Deliver National Address
              </button>
            </div>
          </Modal>
        )}

        {showTweetBox && (
          <Modal title="Social Media Sentiment" onClose={() => setShowTweetBox(false)}>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-border">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Public Approval</div>
                  <div className="text-2xl font-bold text-accent">{game.stats.approval}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Sentiment Score</div>
                  <div className={cn(
                    "text-lg font-bold",
                    game.stats.approval > 70 ? "text-success" : game.stats.approval > 40 ? "text-warning" : "text-danger"
                  )}>
                    {game.stats.approval > 70 ? "Bullish" : game.stats.approval > 40 ? "Mixed" : "Bearish"}
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {game.socialFeed.length > 0 ? game.socialFeed.map((post) => (
                  <div key={post.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm">{post.author}</div>
                        <div className="text-xs text-text-dim">{post.handle}</div>
                      </div>
                      <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        post.sentiment === 'positive' ? "bg-success/20 text-success" :
                        post.sentiment === 'negative' ? "bg-danger/20 text-danger" :
                        "bg-slate-700 text-text-dim"
                      )}>
                        {post.sentiment}
                      </div>
                    </div>
                    <p className="text-sm text-text-main leading-relaxed">{post.content}</p>
                    <div className="text-[10px] text-text-dim">{post.timestamp}</div>
                  </div>
                )) : (
                  <div className="py-12 text-center">
                    <Twitter size={32} className="mx-auto text-text-dim mb-4 opacity-20" />
                    <p className="text-text-dim text-sm">Waiting for social media activity...</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <textarea 
                  className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Draft a presidential response..."
                  value={tweet}
                  onChange={e => setTweet(e.target.value)}
                />
                <button 
                  onClick={handleTweet}
                  className="w-full bg-blue-500 hover:bg-blue-400 py-3 rounded-xl font-bold transition-all mt-2 text-sm"
                >
                  Post Official Response
                </button>
              </div>
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
}

function AuthScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-bg text-text-main flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full sleek-card p-10 text-center space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-accent">Commander in Chief</h1>
          <p className="text-text-dim">Secure your presidency. Save your legacy.</p>
        </div>
        <div className="w-24 h-24 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto border border-accent/20">
          <Shield size={48} />
        </div>
        <button 
          onClick={onLogin}
          className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
        >
          <LogIn size={20} /> Sign in with Google
        </button>
        <p className="text-[10px] text-text-dim uppercase tracking-widest">
          Your progress is automatically saved to the cloud.
        </p>
      </motion.div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-text-main flex items-center justify-center p-6">
          <div className="max-w-md w-full sleek-card p-10 text-center space-y-6">
            <AlertTriangle size={48} className="text-danger mx-auto" />
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-text-dim text-sm">
              We encountered an error while communicating with the situation room.
            </p>
            <div className="bg-black/20 p-4 rounded-lg text-left overflow-x-auto">
              <code className="text-[10px] text-danger font-mono">
                {this.state.errorInfo}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-accent text-white py-3 rounded-xl font-bold"
            >
              Reload Situation Room
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };

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
