import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  BarChart3,
  Timer,
  Music,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flag,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Search,
  Database,
  Download,
  Upload,
  Sun,
  Moon,
  Cloud,
  HardDrive,
  ArrowRight,
  Flame,
  Layers,
  ShieldCheck,
  X,
  Sliders,
  ExternalLink,
  AlertTriangle,
  Zap,
  Undo2,
  Settings as SettingsIcon,
  FlagTriangleRight,
  Gauge
} from 'lucide-react';

// ============================================================================
// 1. FIREBASE INITIALIZATION (SAFE GUARDED + DUAL-LAYER LOCAL BACKUP)
// ============================================================================
let firebaseApp = null;
let auth = null;
let db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'focus-flow-quiet-instrument';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  }
} catch (err) {
  console.warn('Firebase initialization skipped, using LocalStorage primary vault:', err);
}

const LOCAL_STORAGE_KEY = 'focus_flow_react_vault_v1';
const HOUR_HEIGHT = 64; // 64px per hour for crisp Google Calendar legibility

const DEFAULT_SETTINGS = {
  timerPresets: {
    pomodoro: 25,
    deep: 50,
    short: 5,
    long: 15
  },
  autoStartBreaks: false,
  soundChime: true,
  weekStartsOnMonday: false,
  dayStartHour: 6,
  dayEndHour: 23,
  use24Hour: false,
  defaultBlockMins: 60,
  dailyCapacityHours: 16,
  accentColor: '#6366F1'
};

const ACCENT_THEMES = [
  { id: 'indigo', label: 'Electric Indigo', hex: '#6366F1' },
  { id: 'emerald', label: 'Emerald Cyber', hex: '#10B981' },
  { id: 'cyan', label: 'Cyan Pulse', hex: '#06B6D4' },
  { id: 'amber', label: 'Amber Solar', hex: '#F59E0B' },
  { id: 'rose', label: 'Crimson Laser', hex: '#F43F5E' }
];

// ============================================================================
// 2. CURATED SPOTIFY STREAMS & CATEGORY TOKENS
// ============================================================================
const DEFAULT_SPOTIFY_STREAMS = [
  {
    id: 'sp-deep-focus',
    name: 'Deep Focus',
    subtitle: 'Ambient & Post-Rock Study',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0'
  },
  {
    id: 'sp-coding-mode',
    name: 'Coding Mode',
    subtitle: 'Electronic Flow State',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWXLeA8Omikj7?utm_source=generator&theme=0'
  },
  {
    id: 'sp-lofi-beats',
    name: 'Lo-Fi Beats',
    subtitle: 'Chill Instrumental Hip-Hop',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0'
  },
  {
    id: 'sp-phonk-drive',
    name: 'Phonk Drive',
    subtitle: 'High-Velocity Drift Phonk',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWY64wDtewQt?utm_source=generator&theme=0'
  },
  {
    id: 'sp-synthwave',
    name: 'Synthwave Night',
    subtitle: 'Outrun & Cybernetics',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0'
  }
];

const BLOCK_CATEGORIES = {
  deep: {
    id: 'deep',
    label: 'Deep Work',
    color: '#6366F1',
    bgSoft: 'rgba(99, 102, 241, 0.14)',
    border: 'rgba(99, 102, 241, 0.45)',
    idealHours: '4.0h ideal'
  },
  study: {
    id: 'study',
    label: 'Study & Research',
    color: '#06B6D4',
    bgSoft: 'rgba(6, 182, 212, 0.14)',
    border: 'rgba(6, 182, 212, 0.45)',
    idealHours: '2.5h ideal'
  },
  meeting: {
    id: 'meeting',
    label: 'Meeting & Sync',
    color: '#F59E0B',
    bgSoft: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.45)',
    idealHours: '< 2.0h cap'
  },
  workout: {
    id: 'workout',
    label: 'Workout & Health',
    color: '#EC4899',
    bgSoft: 'rgba(236, 72, 153, 0.14)',
    border: 'rgba(236, 72, 153, 0.45)',
    idealHours: '1.0h ideal'
  },
  rest: {
    id: 'rest',
    label: 'Rest & Recovery',
    color: '#10B981',
    bgSoft: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.45)',
    idealHours: '1.5h min'
  }
};

// ============================================================================
// 3. DATE & TIME UTILITY FUNCTIONS
// ============================================================================
function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return new Date();
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatMins12(totalMins, use24Hour = false) {
  const h24 = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (use24Hour) {
    return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatStopwatchMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function getDaysDiff(fromKey, toKey) {
  const d1 = fromDateKey(fromKey);
  const d2 = fromDateKey(toKey);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function parseSpotifyInput(rawInput) {
  const input = (rawInput || '').trim();
  if (!input) return null;

  // Match spotify:playlist:ID or spotify:track:ID or spotify:album:ID
  const uriMatch = input.match(/^spotify:(playlist|track|album|episode|show):([a-zA-Z0-9]+)$/i);
  if (uriMatch) {
    const type = uriMatch[1].toLowerCase();
    const id = uriMatch[2];
    return {
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
    };
  }

  // Match https://open.spotify.com/(playlist|track|album)/ID
  const urlMatch = input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:embed\/)?(playlist|track|album|episode|show)\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    const type = urlMatch[1].toLowerCase();
    const id = urlMatch[2];
    return {
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
    };
  }

  return null;
}

// ============================================================================
// 4. INITIAL SEED GENERATOR (ONLY IF STORAGE IS EMPTY)
// ============================================================================
function createInitialSeedData(todayKey) {
  const today = fromDateKey(todayKey);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const kTomorrow = toDateKey(tomorrow);
  const kDayAfter = toDateKey(dayAfter);
  const kNextWeek = toDateKey(nextWeek);
  const kYesterday = toDateKey(yesterday);

  return {
    theme: 'dark',
    tasks: [
      {
        id: 'task-seed-1',
        title: 'Architect Google Calendar day timeline & cloud sync engine',
        priority: 'high',
        estMins: 50,
        loggedMins: 25,
        dateKey: todayKey,
        tag: 'Engineering',
        completed: false,
        createdAt: Date.now() - 3600000
      },
      {
        id: 'task-seed-2',
        title: 'Review 16-hour waking capacity balance & buffer metrics',
        priority: 'medium',
        estMins: 25,
        loggedMins: 0,
        dateKey: todayKey,
        tag: 'Strategy',
        completed: false,
        createdAt: Date.now() - 2800000
      },
      {
        id: 'task-seed-3',
        title: 'Calibrate spring physics & specular 1px hairline borders',
        priority: 'high',
        estMins: 25,
        loggedMins: 25,
        dateKey: todayKey,
        tag: 'Design',
        completed: true,
        createdAt: Date.now() - 7200000
      },
      {
        id: 'task-seed-4',
        title: 'Prepare distributed systems research synthesis notes',
        priority: 'medium',
        estMins: 50,
        loggedMins: 0,
        dateKey: todayKey,
        tag: 'Study',
        completed: false,
        createdAt: Date.now() - 1800000
      },
      {
        id: 'task-seed-5',
        title: 'Run end-to-end latency profiling suite',
        priority: 'high',
        estMins: 50,
        loggedMins: 0,
        dateKey: kTomorrow,
        tag: 'Engineering',
        completed: false,
        createdAt: Date.now() - 900000
      }
    ],
    blocksByDate: {
      [todayKey]: [
        {
          id: 'blk-seed-1',
          title: 'Morning Triage & Architecture Spec',
          startMin: 9 * 60,
          endMin: 10 * 60 + 30,
          category: 'deep',
          notes: 'Zero notifications — lock core schema'
        },
        {
          id: 'blk-seed-2',
          title: 'Deep Work: React Spatial Calendar Engine',
          startMin: 11 * 60,
          endMin: 13 * 60,
          category: 'deep',
          notes: 'Build interactive month grid & hourly timeline'
        },
        {
          id: 'blk-seed-3',
          title: 'Midday Recharge & Walk Outside',
          startMin: 13 * 60,
          endMin: 14 * 60,
          category: 'rest',
          notes: 'Step away from screens for optic reset'
        },
        {
          id: 'blk-seed-4',
          title: 'Systems Literature & Paper Synthesis',
          startMin: 14 * 60 + 30,
          endMin: 16 * 60,
          category: 'study',
          notes: 'Annotate consensus algorithm trade-offs'
        },
        {
          id: 'blk-seed-5',
          title: 'Product Design Telemetry Sync',
          startMin: 16 * 60 + 30,
          endMin: 17 * 60 + 30,
          category: 'meeting',
          notes: 'Review weekly focus velocity'
        }
      ],
      [kTomorrow]: [
        {
          id: 'blk-seed-6',
          title: 'Deep Work: Compositor Motion Polish',
          startMin: 9 * 60 + 30,
          endMin: 11 * 60 + 30,
          category: 'deep',
          notes: '60fps animation verification'
        },
        {
          id: 'blk-seed-7',
          title: 'Zone 2 Cardio & Mobility Conditioning',
          startMin: 17 * 60,
          endMin: 18 * 60,
          category: 'workout',
          notes: '45m run + 15m stretch'
        }
      ],
      [kDayAfter]: [
        {
          id: 'blk-seed-8',
          title: 'Quarterly Roadmap & Milestone Audit',
          startMin: 10 * 60,
          endMin: 11 * 60 + 30,
          category: 'meeting',
          notes: 'Align Q4 deliverables'
        }
      ],
      [kYesterday]: [
        {
          id: 'blk-seed-9',
          title: 'Core State & Persistence Engine',
          startMin: 10 * 60,
          endMin: 12 * 60 + 30,
          category: 'deep',
          notes: 'Completed ahead of schedule'
        }
      ]
    },
    milestones: [
      { id: 'ms-seed-1', title: 'Focus Flow v3.0 Production Launch', dateKey: todayKey },
      { id: 'ms-seed-2', title: 'Systems Architecture Milestone Review', dateKey: kNextWeek }
    ],
    focusStatsByDate: {
      [todayKey]: { sessions: 2, minutes: 75 },
      [kYesterday]: { sessions: 4, minutes: 145 }
    },
    spotify: {
      activeId: 'sp-deep-focus',
      customStreams: []
    },
    settings: DEFAULT_SETTINGS,
    stopwatchLaps: [],
    updatedAt: Date.now()
  };
}

// ============================================================================
// 5. CURSOR-TRACKED SPECULAR CARD COMPONENT (EMIL KOWALSKI / TASTE-SKILL)
// ============================================================================
function InstrumentCard({ children, className = '', onClick, style = {} }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      style={style}
      className={`instrument-card relative overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 6. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  // --------------------------------------------------------------------------
  // A. Persistent Workspace State (Loaded synchronously from LocalStorage first)
  // --------------------------------------------------------------------------
  const [workspace, setWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tasks)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read local vault:', e);
    }
    return createInitialSeedData(todayKey);
  });

  // UI Navigation & Date Selection State
  const [activeView, setActiveView] = useState('focus'); // 'focus' | 'calendar' | 'timemgmt'
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  // Sync & Vault Telemetry State
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('saved-local'); // 'saving' | 'synced-cloud' | 'saved-local'
  const [lastSavedTime, setLastSavedTime] = useState(() => new Date());
  const isRemoteUpdateRef = useRef(false);
  const hasLoadedCloudRef = useRef(false);

  // Derived User Settings (Merged with defaults for backwards compatibility)
  const settings = useMemo(() => {
    return {
      ...DEFAULT_SETTINGS,
      ...(workspace.settings || {}),
      timerPresets: {
        ...DEFAULT_SETTINGS.timerPresets,
        ...(workspace.settings?.timerPresets || {})
      }
    };
  }, [workspace.settings]);

  const startHour = settings.dayStartHour;
  const endHour = Math.max(startHour + 4, settings.dayEndHour);

  // Focus Engine Mode: 'timer' (Countdown) vs 'stopwatch' (Count-up)
  const [clockEngine, setClockEngine] = useState('timer'); // 'timer' | 'stopwatch'

  // Countdown Timer State
  const [timerMode, setTimerMode] = useState('pomodoro'); // 'pomodoro' | 'deep' | 'short' | 'long'
  const [totalSeconds, setTotalSeconds] = useState(() => (workspace.settings?.timerPresets?.pomodoro || 25) * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(() => (workspace.settings?.timerPresets?.pomodoro || 25) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinuteInput, setCustomMinuteInput] = useState('');
  const [activeTarget, setActiveTarget] = useState(() => ({
    type: 'task',
    id: 'task-seed-1',
    title: 'Architect Google Calendar day timeline & cloud sync engine'
  }));

  // Stopwatch Engine State (High-precision millisecond tracking + Laps)
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const swStartRef = useRef(null);

  // Task Queue Filters & Form State
  const [taskFilter, setTaskFilter] = useState('today'); // 'today' | 'open' | 'completed' | 'all'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('high');
  const [newTaskEst, setNewTaskEst] = useState(50);
  const [newTaskTag, setNewTaskTag] = useState('Deep Work');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [deletedTaskUndo, setDeletedTaskUndo] = useState(null);

  // Spotify Sonic Deck & Procedural Web Audio Synth State
  const [spotifyDrawerOpen, setSpotifyDrawerOpen] = useState(false);
  const [customSpotifyInput, setCustomSpotifyInput] = useState('');
  const [activeSynthType, setActiveSynthType] = useState(null); // 'brown' | 'rain' | 'gamma' | null
  const [synthVolume, setSynthVolume] = useState(35);
  const audioCtxRef = useRef(null);
  const synthGainRef = useRef(null);
  const synthNodesRef = useRef([]);

  // Modals & Command Palette State
  const [blockModal, setBlockModal] = useState({
    open: false,
    editId: null,
    title: '',
    dateKey: todayKey,
    startMin: 9 * 60,
    endMin: 10 * 60,
    category: 'deep',
    notes: ''
  });
  const [milestoneModal, setMilestoneModal] = useState({
    open: false,
    title: '',
    dateKey: todayKey
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('timer'); // 'timer' | 'calendar' | 'appearance'
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Live Clock for Timeline Red Laser Line
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  const timelineScrollRef = useRef(null);

  // --------------------------------------------------------------------------
  // B. Toast Helper
  // --------------------------------------------------------------------------
  const showToast = useCallback((message, undoAction = null) => {
    setToast({ message, undoAction, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // --------------------------------------------------------------------------
  // C. Dual-Layer Persistence: Instant LocalStorage + Firestore Cloud Sync
  // --------------------------------------------------------------------------
  // 1. Authenticate with Firebase (Rule 3 compliant)
  useEffect(() => {
    if (!auth) return;
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn('Cloud auth fallback to local:', err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) setUser(u);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Subscribe to Firestore Cloud Vault once authenticated
  useEffect(() => {
    if (!user || !db) return;
    const vaultDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workspace', 'main');

    const unsubscribe = onSnapshot(
      vaultDocRef,
      (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data();
          if (cloudData && cloudData.updatedAt) {
            setWorkspace((prev) => {
              if (!hasLoadedCloudRef.current || cloudData.updatedAt > (prev.updatedAt || 0)) {
                isRemoteUpdateRef.current = true;
                hasLoadedCloudRef.current = true;
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData));
                } catch (e) {}
                return cloudData;
              }
              hasLoadedCloudRef.current = true;
              return prev;
            });
            setSyncStatus('synced-cloud');
            setLastSavedTime(new Date());
          }
        } else {
          // First time in cloud: push current local workspace to Firestore
          hasLoadedCloudRef.current = true;
          setDoc(vaultDocRef, { ...workspace, updatedAt: Date.now() }).catch(() => {});
          setSyncStatus('synced-cloud');
        }
      },
      (err) => {
        console.warn('Firestore snapshot fallback to local:', err);
        setSyncStatus('saved-local');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. Save every workspace mutation immediately to LocalStorage + Firestore
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspace));
      setLastSavedTime(new Date());
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (user && db && hasLoadedCloudRef.current) {
      setSyncStatus('saving');
      const vaultDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workspace', 'main');
      const timerId = setTimeout(() => {
        setDoc(vaultDocRef, workspace)
          .then(() => {
            setSyncStatus('synced-cloud');
            setLastSavedTime(new Date());
          })
          .catch(() => {
            setSyncStatus('saved-local');
          });
      }, 250);
      return () => clearTimeout(timerId);
    } else {
      setSyncStatus('saved-local');
    }
  }, [workspace, user]);

  // Helper to update persistent workspace state cleanly
  const updateWorkspace = useCallback((updater) => {
    setWorkspace((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return { ...next, updatedAt: Date.now() };
    });
  }, []);

  // --------------------------------------------------------------------------
  // D. Live Clock Update for Timeline Red Laser Needle
  // --------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------------------------
  // E. Focus Timer Engine & Harmonic Completion Chime
  // --------------------------------------------------------------------------
  const playCompletionChime = useCallback(() => {
    if (!settings.soundChime) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [528, 660, 792, 1056].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0.001, now + idx * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.11 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 1.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 1.35);
      });
    } catch (e) {}
  }, [settings.soundChime]);

  const handleCompleteSession = useCallback(() => {
    setIsRunning(false);
    const elapsedMins = Math.max(
      1,
      Math.round((totalSeconds - remainingSeconds) / 60) || Math.round(totalSeconds / 60)
    );
    playCompletionChime();

    updateWorkspace((prev) => {
      const prevDayStats = prev.focusStatsByDate?.[todayKey] || { sessions: 0, minutes: 0 };
      const updatedStats = {
        ...(prev.focusStatsByDate || {}),
        [todayKey]: {
          sessions: prevDayStats.sessions + 1,
          minutes: prevDayStats.minutes + elapsedMins
        }
      };

      let updatedTasks = prev.tasks || [];
      if (activeTarget?.type === 'task' && activeTarget.id) {
        updatedTasks = updatedTasks.map((t) =>
          t.id === activeTarget.id
            ? { ...t, loggedMins: (t.loggedMins || 0) + elapsedMins }
            : t
        );
      }

      return {
        ...prev,
        tasks: updatedTasks,
        focusStatsByDate: updatedStats
      };
    });

    if (settings.autoStartBreaks && (timerMode === 'pomodoro' || timerMode === 'deep')) {
      const breakMins = settings.timerPresets.short || 5;
      setTimerMode('short');
      setTotalSeconds(breakMins * 60);
      setRemainingSeconds(breakMins * 60);
      setIsRunning(true);
      showToast(`Logged +${elapsedMins}m! Auto-starting ${breakMins}m Break`);
    } else {
      setRemainingSeconds(totalSeconds);
      showToast(`Logged +${elapsedMins}m focus session to Vault`);
    }
  }, [
    totalSeconds,
    remainingSeconds,
    playCompletionChime,
    updateWorkspace,
    todayKey,
    activeTarget,
    showToast,
    settings.autoStartBreaks,
    settings.timerPresets.short,
    timerMode
  ]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCompleteSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, handleCompleteSession]);

  // High-Precision Stopwatch Interval (100ms updates for smooth tabular tenths)
  useEffect(() => {
    if (!swRunning) return;
    swStartRef.current = performance.now() - swElapsedMs;
    const interval = setInterval(() => {
      setSwElapsedMs(Math.floor(performance.now() - swStartRef.current));
    }, 100);
    return () => clearInterval(interval);
  }, [swRunning]);

  const handleStopwatchLap = () => {
    if (swElapsedMs < 500) return;
    const laps = workspace.stopwatchLaps || [];
    const prevTotalMs = laps.length > 0 ? laps[0].totalMs : 0;
    const splitMs = Math.max(0, swElapsedMs - prevTotalMs);
    const newLap = {
      id: `lap-${Date.now()}`,
      lapNumber: laps.length + 1,
      splitMs,
      totalMs: swElapsedMs,
      targetTitle: activeTarget?.title || 'General Flow',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    updateWorkspace((prev) => ({
      ...prev,
      stopwatchLaps: [newLap, ...(prev.stopwatchLaps || []).slice(0, 29)]
    }));
    showToast(`Recorded Lap #${newLap.lapNumber} (${formatStopwatchMs(splitMs)})`);
  };

  const handleStopwatchReset = () => {
    setSwRunning(false);
    setSwElapsedMs(0);
  };

  const handleClearStopwatchLaps = () => {
    updateWorkspace((prev) => ({ ...prev, stopwatchLaps: [] }));
  };

  const handleLogStopwatchSession = () => {
    if (swElapsedMs < 10000) {
      showToast('Run the stopwatch for at least 10 seconds to log a session');
      return;
    }
    setSwRunning(false);
    const loggedMinutes = Math.max(1, Math.round(swElapsedMs / 60000));
    playCompletionChime();

    updateWorkspace((prev) => {
      const prevDayStats = prev.focusStatsByDate?.[todayKey] || { sessions: 0, minutes: 0 };
      const updatedStats = {
        ...(prev.focusStatsByDate || {}),
        [todayKey]: {
          sessions: prevDayStats.sessions + 1,
          minutes: prevDayStats.minutes + loggedMinutes
        }
      };

      let updatedTasks = prev.tasks || [];
      if (activeTarget?.type === 'task' && activeTarget.id) {
        updatedTasks = updatedTasks.map((t) =>
          t.id === activeTarget.id
            ? { ...t, loggedMins: (t.loggedMins || 0) + loggedMinutes }
            : t
        );
      }

      return {
        ...prev,
        tasks: updatedTasks,
        focusStatsByDate: updatedStats
      };
    });

    setSwElapsedMs(0);
    showToast(`Logged +${loggedMinutes}m from Stopwatch to "${activeTarget?.title || 'Vault'}"`);
  };

  const selectTimerPreset = (mode, minutes) => {
    setIsRunning(false);
    setTimerMode(mode);
    setTotalSeconds(minutes * 60);
    setRemainingSeconds(minutes * 60);
  };

  const adjustTimerMinutes = (deltaMins) => {
    const nextSecs = Math.max(60, Math.min(240 * 60, remainingSeconds + deltaMins * 60));
    setRemainingSeconds(nextSecs);
    setTotalSeconds((prevTotal) => Math.max(prevTotal, nextSecs));
  };

  const handleApplyCustomMinutes = (e) => {
    e.preventDefault();
    const mins = Number(customMinuteInput);
    if (!mins || mins < 1 || mins > 360) {
      showToast('Enter custom minutes between 1 and 360');
      return;
    }
    setIsRunning(false);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    setCustomMinuteInput('');
    showToast(`Custom timer set to ${mins} minutes`);
  };

  const updateUserSetting = (key, value) => {
    updateWorkspace((prev) => ({
      ...prev,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(prev.settings || {}),
        [key]: value
      }
    }));
  };

  const updateTimerPresetDuration = (presetKey, newMins) => {
    const clamped = Math.max(1, Math.min(240, Number(newMins) || 25));
    updateWorkspace((prev) => {
      const currentPresets = prev.settings?.timerPresets || DEFAULT_SETTINGS.timerPresets;
      return {
        ...prev,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(prev.settings || {}),
          timerPresets: {
            ...currentPresets,
            [presetKey]: clamped
          }
        }
      };
    });
    if (timerMode === presetKey && !isRunning) {
      setTotalSeconds(clamped * 60);
      setRemainingSeconds(clamped * 60);
    }
  };

  // --------------------------------------------------------------------------
  // F. Procedural Web Audio Synthesizer (Warm Brown Noise, Soft Rain, 40Hz Gamma)
  // --------------------------------------------------------------------------
  const stopSynthNodes = useCallback(() => {
    synthNodesRef.current.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    synthNodesRef.current = [];
  }, []);

  const toggleSynthSound = useCallback((type) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (activeSynthType === type) {
      stopSynthNodes();
      setActiveSynthType(null);
      return;
    }

    stopSynthNodes();
    setActiveSynthType(type);

    const masterGain = ctx.createGain();
    masterGain.gain.value = synthVolume / 100;
    masterGain.connect(ctx.destination);
    synthGainRef.current = masterGain;

    if (type === 'brown' || type === 'rain') {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'brown') {
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 0.26;
        } else {
          output[i] = white * 0.13;
        }
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'brown' ? 420 : 1100;

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start(0);
      synthNodesRef.current.push(whiteNoise);
    } else if (type === 'gamma') {
      [200, 240].forEach((freq) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        oscGain.gain.value = 0.08;
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        synthNodesRef.current.push(osc);
      });
    }
  }, [activeSynthType, synthVolume, stopSynthNodes]);

  const handleSynthVolumeChange = (val) => {
    const num = Number(val);
    setSynthVolume(num);
    if (synthGainRef.current) {
      synthGainRef.current.gain.value = num / 100;
    }
  };

  // --------------------------------------------------------------------------
  // G. Global Keyboard Shortcuts (Emil Kowalski 0ms Instant Snap for Keyboard)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setCmdPaletteOpen(false);
        setBlockModal((prev) => ({ ...prev, open: false }));
        setMilestoneModal((prev) => ({ ...prev, open: false }));
        setSettingsModalOpen(false);
        setVaultModalOpen(false);
        return;
      }

      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === '1') {
        setIsKeyboardNav(true);
        setActiveView('focus');
      } else if (e.key === '2') {
        setIsKeyboardNav(true);
        setActiveView('calendar');
      } else if (e.key === '3') {
        setIsKeyboardNav(true);
        setActiveView('timemgmt');
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (clockEngine === 'stopwatch') {
          setSwRunning((prev) => !prev);
        } else {
          setIsRunning((prev) => !prev);
        }
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSpotifyDrawerOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSettingsModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNewBlockModal(Math.max(startHour * 60, 9 * 60));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, clockEngine, startHour]);

  // Scroll timeline to current hour when switching to Calendar view
  useEffect(() => {
    if (activeView === 'calendar' && timelineScrollRef.current) {
      const currentHour = new Date().getHours();
      const targetHour = Math.max(startHour, Math.min(endHour - 4, currentHour - 1));
      timelineScrollRef.current.scrollTo({
        top: (targetHour - startHour) * HOUR_HEIGHT,
        behavior: 'smooth'
      });
    }
  }, [activeView, startHour, endHour]);

  // --------------------------------------------------------------------------
  // H. Task Management Operations (Full CRUD + Persistent Save + Undo)
  // --------------------------------------------------------------------------
  const handleAddTask = (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title,
      priority: newTaskPriority,
      estMins: Number(newTaskEst) || 25,
      loggedMins: 0,
      dateKey: selectedDate,
      tag: newTaskTag || 'General',
      completed: false,
      createdAt: Date.now()
    };

    updateWorkspace((prev) => ({
      ...prev,
      tasks: [newTask, ...(prev.tasks || [])]
    }));

    setNewTaskTitle('');
    showToast(`Saved task "${title}"`);
  };

  const toggleTaskCompleted = (taskId) => {
    updateWorkspace((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    }));
  };

  const cycleTaskPriority = (taskId) => {
    const order = { high: 'medium', medium: 'low', low: 'high' };
    updateWorkspace((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) =>
        t.id === taskId ? { ...t, priority: order[t.priority] || 'medium' } : t
      )
    }));
  };

  const saveInlineTaskEdit = (taskId) => {
    const trimmed = editingTaskTitle.trim();
    if (trimmed) {
      updateWorkspace((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).map((t) =>
          t.id === taskId ? { ...t, title: trimmed } : t
        )
      }));
    }
    setEditingTaskId(null);
  };

  const deleteTaskWithUndo = (task) => {
    setDeletedTaskUndo(task);
    updateWorkspace((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((t) => t.id !== task.id)
    }));
    showToast(`Deleted "${task.title}"`, () => {
      updateWorkspace((prev) => ({
        ...prev,
        tasks: [task, ...(prev.tasks || [])]
      }));
      setDeletedTaskUndo(null);
    });
  };

  const lockTaskIntoTimer = (task) => {
    setIsRunning(false);
    setActiveTarget({ type: 'task', id: task.id, title: task.title });
    const mins = task.estMins || 25;
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    setIsKeyboardNav(false);
    setActiveView('focus');
    showToast(`Locked onto "${task.title}" (${mins}m)`);
  };

  const sendTaskToTimeline = (task) => {
    const dayBlocks = workspace.blocksByDate?.[selectedDate] || [];
    let startMin = Math.max(startHour * 60, 9 * 60);
    const dur = Math.max(30, task.estMins || settings.defaultBlockMins || 30);

    while (startMin + dur <= (endHour - 1) * 60) {
      const hasOverlap = dayBlocks.some(
        (b) => startMin < b.endMin && startMin + dur > b.startMin
      );
      if (!hasOverlap) break;
      startMin += 30;
    }

    setBlockModal({
      open: true,
      editId: null,
      title: task.title,
      dateKey: selectedDate,
      startMin,
      endMin: Math.min(endHour * 60, startMin + dur),
      category: 'deep',
      notes: `Scheduled from Focus Task Queue (${task.tag || 'Task'})`
    });
  };

  // --------------------------------------------------------------------------
  // I. Google Calendar Time-Block & D-Day Milestone Operations
  // --------------------------------------------------------------------------
  const openNewBlockModal = (defaultStartMin = 9 * 60, customDateKey = selectedDate) => {
    const dur = settings.defaultBlockMins || 60;
    setBlockModal({
      open: true,
      editId: null,
      title: '',
      dateKey: customDateKey,
      startMin: defaultStartMin,
      endMin: Math.min(endHour * 60, defaultStartMin + dur),
      category: 'deep',
      notes: ''
    });
  };

  const openEditBlockModal = (block) => {
    setBlockModal({
      open: true,
      editId: block.id,
      title: block.title,
      dateKey: selectedDate,
      startMin: block.startMin,
      endMin: block.endMin,
      category: block.category || 'deep',
      notes: block.notes || ''
    });
  };

  const handleSaveBlockModal = (e) => {
    e.preventDefault();
    const title = blockModal.title.trim();
    if (!title) return;

    const targetDate = blockModal.dateKey || selectedDate;
    const startMin = Number(blockModal.startMin);
    const endMin = Math.max(startMin + 30, Number(blockModal.endMin));

    const newBlockObj = {
      id: blockModal.editId || `blk-${Date.now()}`,
      title,
      startMin,
      endMin,
      category: blockModal.category || 'deep',
      notes: blockModal.notes.trim()
    };

    updateWorkspace((prev) => {
      const nextBlocksByDate = { ...(prev.blocksByDate || {}) };

      // If editing and date changed, remove from old date
      if (blockModal.editId && targetDate !== selectedDate) {
        nextBlocksByDate[selectedDate] = (nextBlocksByDate[selectedDate] || []).filter(
          (b) => b.id !== blockModal.editId
        );
      }

      const existingList = [...(nextBlocksByDate[targetDate] || [])];
      const existingIdx = existingList.findIndex((b) => b.id === newBlockObj.id);
      if (existingIdx > -1) {
        existingList[existingIdx] = newBlockObj;
      } else {
        existingList.push(newBlockObj);
      }
      existingList.sort((a, b) => a.startMin - b.startMin);
      nextBlocksByDate[targetDate] = existingList;

      return { ...prev, blocksByDate: nextBlocksByDate };
    });

    setSelectedDate(targetDate);
    setBlockModal((prev) => ({ ...prev, open: false }));
    showToast(`Saved time block "${title}"`);
  };

  const handleDeleteBlock = (blockId) => {
    updateWorkspace((prev) => {
      const list = (prev.blocksByDate?.[selectedDate] || []).filter((b) => b.id !== blockId);
      return {
        ...prev,
        blocksByDate: {
          ...(prev.blocksByDate || {}),
          [selectedDate]: list
        }
      };
    });
    setBlockModal((prev) => ({ ...prev, open: false }));
    showToast('Time block removed');
  };

  const launchBlockIntoTimer = (block) => {
    const durMins = Math.max(5, Math.min(180, block.endMin - block.startMin));
    setIsRunning(false);
    setActiveTarget({ type: 'block', id: block.id, title: block.title });
    setTotalSeconds(durMins * 60);
    setRemainingSeconds(durMins * 60);
    setBlockModal((prev) => ({ ...prev, open: false }));
    setIsKeyboardNav(false);
    setActiveView('focus');
    showToast(`Loaded "${block.title}" (${durMins}m) into Focus Timer`);
  };

  // Auto-Schedule Open Tasks into Free Gaps on Selected Date
  const handleAutoScheduleOpenTasks = () => {
    const openDayTasks = (workspace.tasks || []).filter(
      (t) => !t.completed && t.dateKey === selectedDate
    );
    if (openDayTasks.length === 0) {
      showToast('No open tasks for this date to auto-schedule');
      return;
    }

    const currentBlocks = [...(workspace.blocksByDate?.[selectedDate] || [])];
    let cursorMin = 9 * 60;
    let addedCount = 0;

    openDayTasks.forEach((task) => {
      const alreadyOnTimeline = currentBlocks.some(
        (b) => b.title.toLowerCase() === task.title.toLowerCase()
      );
      if (alreadyOnTimeline) return;

      const dur = task.estMins >= 50 ? 60 : 30;
      while (cursorMin + dur <= 21 * 60) {
        const conflict = currentBlocks.some(
          (b) => cursorMin < b.endMin && cursorMin + dur > b.startMin
        );
        if (!conflict) {
          currentBlocks.push({
            id: `blk-auto-${Date.now()}-${addedCount}`,
            title: task.title,
            startMin: cursorMin,
            endMin: cursorMin + dur,
            category: task.tag === 'Study' ? 'study' : 'deep',
            notes: `Auto-scheduled from ${task.priority.toUpperCase()} priority task`
          });
          addedCount++;
          cursorMin += dur + 30;
          break;
        }
        cursorMin += 30;
      }
    });

    if (addedCount === 0) {
      showToast('All open tasks for this date are already scheduled on the timeline');
      return;
    }

    currentBlocks.sort((a, b) => a.startMin - b.startMin);
    updateWorkspace((prev) => ({
      ...prev,
      blocksByDate: {
        ...(prev.blocksByDate || {}),
        [selectedDate]: currentBlocks
      }
    }));
    showToast(`Auto-scheduled ${addedCount} task(s) into free timeline slots`);
  };

  const handleSaveMilestone = (e) => {
    e.preventDefault();
    const title = milestoneModal.title.trim();
    if (!title) return;
    const newMs = {
      id: `ms-${Date.now()}`,
      title,
      dateKey: milestoneModal.dateKey || selectedDate
    };
    updateWorkspace((prev) => ({
      ...prev,
      milestones: [...(prev.milestones || []), newMs]
    }));
    setMilestoneModal({ open: false, title: '', dateKey: selectedDate });
    showToast(`Added D-Day milestone "${title}"`);
  };

  const handleDeleteMilestone = (msId) => {
    updateWorkspace((prev) => ({
      ...prev,
      milestones: (prev.milestones || []).filter((m) => m.id !== msId)
    }));
  };

  // --------------------------------------------------------------------------
  // J. Spotify Sonic Deck Custom URL/URI Loader & Vault Export/Import
  // --------------------------------------------------------------------------
  const allSpotifyStreams = useMemo(() => {
    return [...DEFAULT_SPOTIFY_STREAMS, ...(workspace.spotify?.customStreams || [])];
  }, [workspace.spotify?.customStreams]);

  const activeSpotifyStream = useMemo(() => {
    return (
      allSpotifyStreams.find((s) => s.id === workspace.spotify?.activeId) ||
      DEFAULT_SPOTIFY_STREAMS[0]
    );
  }, [allSpotifyStreams, workspace.spotify?.activeId]);

  const selectSpotifyStream = (streamId, openDrawer = true) => {
    updateWorkspace((prev) => ({
      ...prev,
      spotify: {
        ...(prev.spotify || {}),
        activeId: streamId
      }
    }));
    if (openDrawer) setSpotifyDrawerOpen(true);
  };

  const handleLoadCustomSpotify = (e) => {
    e.preventDefault();
    const parsed = parseSpotifyInput(customSpotifyInput);
    if (!parsed) {
      showToast('Paste a valid Spotify Playlist, Track, or Album link/URI');
      return;
    }

    const customList = workspace.spotify?.customStreams || [];
    const newStream = {
      id: `sp-custom-${Date.now()}`,
      name: `Custom ${parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1)} #${customList.length + 1}`,
      subtitle: 'Saved to Vault',
      embedUrl: parsed.embedUrl,
      isCustom: true
    };

    updateWorkspace((prev) => ({
      ...prev,
      spotify: {
        ...(prev.spotify || {}),
        activeId: newStream.id,
        customStreams: [...(prev.spotify?.customStreams || []), newStream]
      }
    }));

    setCustomSpotifyInput('');
    setSpotifyDrawerOpen(true);
    showToast(`Saved "${newStream.name}" to Spotify Deck`);
  };

  const removeCustomSpotifyStream = (streamId) => {
    updateWorkspace((prev) => {
      const remaining = (prev.spotify?.customStreams || []).filter((s) => s.id !== streamId);
      const nextActive =
        prev.spotify?.activeId === streamId ? DEFAULT_SPOTIFY_STREAMS[0].id : prev.spotify?.activeId;
      return {
        ...prev,
        spotify: {
          ...(prev.spotify || {}),
          activeId: nextActive,
          customStreams: remaining
        }
      };
    });
  };

  // JSON Backup Export & Import
  const handleExportJsonBackup = () => {
    const dataStr = JSON.stringify(workspace, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focus-flow-backup-${todayKey}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported JSON Vault backup');
  };

  const handleImportJsonBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.tasks) && typeof parsed.blocksByDate === 'object') {
          updateWorkspace(parsed);
          setVaultModalOpen(false);
          showToast('Restored workspace from JSON backup');
        } else {
          showToast('Invalid Focus Flow backup file');
        }
      } catch (err) {
        showToast('Could not parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  // --------------------------------------------------------------------------
  // K. Derived Views & Telemetry Calculations
  // --------------------------------------------------------------------------
  const isDark = (workspace.theme || 'dark') === 'dark';

  const toggleTheme = () => {
    updateWorkspace((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  const stepDate = (deltaDays) => {
    const d = fromDateKey(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    const nextKey = toDateKey(d);
    setSelectedDate(nextKey);
    setCalMonth(d.getMonth());
    setCalYear(d.getFullYear());
  };

  const jumpToToday = () => {
    const now = new Date();
    setSelectedDate(toDateKey(now));
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
  };

  const filteredTasks = useMemo(() => {
    const all = workspace.tasks || [];
    if (taskFilter === 'today') {
      return all.filter((t) => t.dateKey === selectedDate);
    }
    if (taskFilter === 'open') {
      return all.filter((t) => !t.completed);
    }
    if (taskFilter === 'completed') {
      return all.filter((t) => t.completed);
    }
    return all;
  }, [workspace.tasks, taskFilter, selectedDate]);

  const selectedDayBlocks = useMemo(() => {
    return workspace.blocksByDate?.[selectedDate] || [];
  }, [workspace.blocksByDate, selectedDate]);

  // Calendar Month Cells Generator (Supports Sunday OR Monday Week Start from Settings)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const rawWeekday = firstDay.getDay(); // 0 = Sun, 1 = Mon ...
    const startWeekday = settings.weekStartsOnMonday
      ? (rawWeekday + 6) % 7
      : rawWeekday;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    const cells = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const dateKey = toDateKey(new Date(calYear, calMonth - 1, dNum));
      cells.push({ dNum, dateKey, isCurrentMonth: false });
    }
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const dateKey = toDateKey(new Date(calYear, calMonth, dNum));
      cells.push({ dNum, dateKey, isCurrentMonth: true });
    }
    const rem = (7 - (cells.length % 7)) % 7;
    for (let dNum = 1; dNum <= rem; dNum++) {
      const dateKey = toDateKey(new Date(calYear, calMonth + 1, dNum));
      cells.push({ dNum, dateKey, isCurrentMonth: false });
    }
    return cells;
  }, [calYear, calMonth, settings.weekStartsOnMonday]);

  const calendarWeekdayLabels = useMemo(() => {
    return settings.weekStartsOnMonday
      ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  }, [settings.weekStartsOnMonday]);

  // Time Management Capacity Metrics for Selected Date (Uses Custom Daily Capacity Budget)
  const capacityMetrics = useMemo(() => {
    const totals = { deep: 0, study: 0, meeting: 0, workout: 0, rest: 0 };
    selectedDayBlocks.forEach((b) => {
      const dur = Math.max(0, b.endMin - b.startMin);
      const cat = totals[b.category] !== undefined ? b.category : 'deep';
      totals[cat] += dur;
    });

    const totalScheduledMins =
      totals.deep + totals.study + totals.meeting + totals.workout + totals.rest;
    const wakingBudgetMins = (settings.dailyCapacityHours || 16) * 60;
    const unscheduledMins = Math.max(0, wakingBudgetMins - totalScheduledMins);

    const openTasksForDay = (workspace.tasks || []).filter(
      (t) => !t.completed && t.dateKey === selectedDate
    );
    const openTaskEstMins = openTasksForDay.reduce((sum, t) => sum + (t.estMins || 25), 0);
    const dayStats = workspace.focusStatsByDate?.[selectedDate] || { sessions: 0, minutes: 0 };

    return {
      totals,
      totalScheduledMins,
      wakingBudgetMins,
      unscheduledMins,
      openTasksCount: openTasksForDay.length,
      openTaskEstMins,
      dayStats
    };
  }, [
    selectedDayBlocks,
    workspace.tasks,
    workspace.focusStatsByDate,
    selectedDate,
    settings.dailyCapacityHours
  ]);

  // 7-Day Weekly Horizon Data
  const weeklyHorizon = useMemo(() => {
    const selObj = fromDateKey(selectedDate);
    const startOfWeek = new Date(selObj);
    startOfWeek.setDate(selObj.getDate() - selObj.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const k = toDateKey(d);
      const blocks = workspace.blocksByDate?.[k] || [];
      const plannedHours = blocks.reduce((acc, b) => acc + (b.endMin - b.startMin), 0) / 60;
      const focusHours = (workspace.focusStatsByDate?.[k]?.minutes || 0) / 60;
      return {
        dateKey: k,
        dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
        dayNum: d.getDate(),
        plannedHours,
        focusHours
      };
    });
  }, [selectedDate, workspace.blocksByDate, workspace.focusStatsByDate]);

  // Format Countdown Display
  const formattedCountdown = useMemo(() => {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [remainingSeconds]);

  const formattedStopwatch = useMemo(() => {
    return formatStopwatchMs(swElapsedMs);
  }, [swElapsedMs]);

  const ringCircumference = 2 * Math.PI * 102;
  const ringProgressOffset = useMemo(() => {
    if (clockEngine === 'stopwatch') {
      // 60-second revolution cycle for stopwatch mode
      const secCycle = (swElapsedMs % 60000) / 60000;
      return ringCircumference * (1 - secCycle);
    }
    return ringCircumference * (1 - remainingSeconds / Math.max(1, totalSeconds));
  }, [clockEngine, swElapsedMs, remainingSeconds, totalSeconds, ringCircumference]);

  // Total Vault Item Counts
  const totalBlocksCount = useMemo(() => {
    return Object.values(workspace.blocksByDate || {}).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    );
  }, [workspace.blocksByDate]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div
      data-theme={isDark ? 'dark' : 'light'}
      className="h-screen w-screen overflow-hidden flex flex-col select-none"
      style={{
        backgroundColor: 'var(--bg-void)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* ====================================================================
          DESIGN SYSTEM CSS VARIABLES & MOTION RULES
          ==================================================================== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root, [data-theme="dark"] {
          --bg-void: #060608;
          --bg-elevated: #0C0D12;
          --bg-interactive: #12141C;
          --bg-hover: #181B26;
          --bg-glass: rgba(14, 16, 22, 0.86);

          --border-hairline: rgba(255, 255, 255, 0.07);
          --border-strong: rgba(255, 255, 255, 0.14);
          --specular-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.09);
          --card-shadow: 0 18px 40px -14px rgba(0, 0, 0, 0.78), var(--specular-top);
          --modal-shadow: 0 32px 70px -16px rgba(0, 0, 0, 0.92), var(--specular-top);

          --text-primary: #F4F5F8;
          --text-secondary: #8E95A5;
          --text-muted: #565C6B;

          --grid-line: rgba(255, 255, 255, 0.045);
          --grid-subline: rgba(255, 255, 255, 0.02);
        }

        [data-theme="light"] {
          --bg-void: #F5F4F0;
          --bg-elevated: #FFFFFF;
          --bg-interactive: #ECEBE6;
          --bg-hover: #E2E1DA;
          --bg-glass: rgba(255, 255, 255, 0.9);

          --border-hairline: rgba(17, 24, 39, 0.08);
          --border-strong: rgba(17, 24, 39, 0.16);
          --specular-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.95);
          --card-shadow: 0 10px 28px -10px rgba(17, 24, 39, 0.07), var(--specular-top);
          --modal-shadow: 0 28px 60px -14px rgba(17, 24, 39, 0.18), var(--specular-top);

          --text-primary: #111318;
          --text-secondary: #575E6C;
          --text-muted: #8A919E;

          --grid-line: rgba(17, 24, 39, 0.06);
          --grid-subline: rgba(17, 24, 39, 0.03);
        }

        .font-mono-num {
          font-family: 'JetBrains Mono', monospace;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }

        .heading-tight {
          letter-spacing: -0.03em;
        }

        /* Specular Instrument Card with Cursor Spotlight */
        .instrument-card {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-hairline);
          border-radius: 14px;
          box-shadow: var(--card-shadow);
          transition: border-color 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .instrument-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(
            480px circle at var(--mouse-x, -500px) var(--mouse-y, -500px),
            rgba(255, 255, 255, 0.045),
            transparent 45%
          );
          opacity: 0;
          transition: opacity 250ms ease;
          z-index: 0;
        }
        .instrument-card:hover::before {
          opacity: 1;
        }
        .instrument-card > * {
          position: relative;
          z-index: 1;
        }

        .instrument-sub {
          background-color: var(--bg-interactive);
          border: 1px solid var(--border-hairline);
          border-radius: 10px;
          box-shadow: var(--specular-top);
        }

        .tactile-btn {
          transition:
            transform 150ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 150ms ease,
            border-color 150ms ease,
            opacity 150ms ease;
        }
        .tactile-btn:active {
          transform: scale(0.965);
        }

        .spring-pill {
          transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), width 240ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .spring-pill.instant {
          transition: none !important;
        }

        @keyframes flowPulseAura {
          0%, 100% { opacity: 0.18; transform: scale(0.97); }
          50% { opacity: 0.38; transform: scale(1.04); }
        }
        .aura-active {
          animation: flowPulseAura 4s ease-in-out infinite;
        }

        @keyframes eqBounce {
          0%, 100% { transform: scaleY(0.32); }
          50% { transform: scaleY(1); }
        }
        .eq-bar {
          width: 2.5px;
          height: 11px;
          background-color: #10B981;
          border-radius: 99px;
          transform-origin: bottom;
          animation: eqBounce 0.85s ease-in-out infinite;
        }
        .eq-bar:nth-child(2) { animation-delay: 0.2s; }
        .eq-bar:nth-child(3) { animation-delay: 0.4s; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 9999px; }
      `}</style>

      {/* ====================================================================
          TOP PERSISTENT INSTRUMENT HEADER
          ==================================================================== */}
      <header
        className="h-14 px-4 sm:px-7 border-b flex items-center justify-between gap-3 shrink-0 z-30"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-hairline)'
        }}
      >
        {/* Left: Brand + Global Date Stepper + Cloud/Local Vault Status Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
              style={{
                backgroundColor: settings.accentColor || 'var(--text-primary)',
                color: '#FFFFFF'
              }}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-semibold text-sm heading-tight hidden sm:inline">
              Focus Flow
            </span>
          </div>

          <div
            className="h-4 w-[1px] hidden md:block"
            style={{ backgroundColor: 'var(--border-hairline)' }}
          />

          {/* Global Date Stepper */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => stepDate(-1)}
              className="tactile-btn p-1 rounded-md hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={jumpToToday}
              className="tactile-btn px-2 py-1 rounded-md flex items-center gap-2 text-xs font-medium"
            >
              <span>
                {fromDateKey(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span
                className="text-[10px] font-mono-num font-semibold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor:
                    selectedDate === todayKey
                      ? 'rgba(99, 102, 241, 0.16)'
                      : 'var(--bg-interactive)',
                  color:
                    selectedDate === todayKey
                      ? settings.accentColor || '#6366F1'
                      : 'var(--text-secondary)'
                }}
              >
                {selectedDate === todayKey
                  ? 'TODAY'
                  : getDaysDiff(todayKey, selectedDate) > 0
                  ? `+${getDaysDiff(todayKey, selectedDate)}d`
                  : `${getDaysDiff(todayKey, selectedDate)}d`}
              </span>
            </button>
            <button
              onClick={() => stepDate(1)}
              className="tactile-btn p-1 rounded-md hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-Time Data Save Status Pill */}
          <button
            onClick={() => setVaultModalOpen(true)}
            className="tactile-btn instrument-sub px-2.5 py-1 text-[11px] font-mono-num flex items-center gap-1.5"
            title="Inspect Data Vault & Export/Import JSON Backup"
          >
            {syncStatus === 'synced-cloud' ? (
              <>
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span className="hidden lg:inline text-emerald-400">
                  Cloud & Local Saved
                </span>
              </>
            ) : syncStatus === 'saving' ? (
              <>
                <Database className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span className="hidden lg:inline text-indigo-400">Saving...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span className="hidden lg:inline text-emerald-400">Vault Saved</span>
              </>
            )}
          </button>
        </div>

        {/* Center: 3-View Segmented Navigation Bar */}
        <nav className="instrument-sub p-1 flex items-center gap-1">
          {[
            { id: 'focus', label: 'Focus Studio', icon: Timer, kbd: '1' },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon, kbd: '2' },
            { id: 'timemgmt', label: 'Time Mgmt', icon: BarChart3, kbd: '3' }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setIsKeyboardNav(false);
                  setActiveView(tab.id);
                }}
                className={`tactile-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                  active ? 'font-semibold shadow-sm' : 'font-medium opacity-75 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
                  border: active
                    ? '1px solid var(--border-strong)'
                    : '1px solid transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: isKeyboardNav ? 'none' : 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span
                  className="hidden md:inline text-[10px] font-mono-num px-1 py-0.2 rounded"
                  style={{
                    backgroundColor: 'var(--bg-void)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-hairline)'
                  }}
                >
                  {tab.kbd}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right: Live Mini Timer/Stopwatch Pill + Spotify Trigger + Settings + Command Palette + Theme */}
        <div className="flex items-center gap-2">
          {/* Persistent Live Timer / Stopwatch Pill when viewing Calendar or Time Management */}
          {(isRunning || remainingSeconds < totalSeconds || swRunning || swElapsedMs > 0) &&
            activeView !== 'focus' && (
              <div
                onClick={() => setActiveView('focus')}
                className="tactile-btn cursor-pointer px-2.5 py-1 rounded-full flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.16)',
                  border: `1px solid ${settings.accentColor || '#6366F1'}`
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: settings.accentColor || '#6366F1' }}
                />
                <span className="text-xs font-mono-num font-semibold">
                  {clockEngine === 'stopwatch' || swRunning
                    ? formattedStopwatch
                    : formattedCountdown}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (clockEngine === 'stopwatch' || swRunning) {
                      setSwRunning((prev) => !prev);
                    } else {
                      setIsRunning((prev) => !prev);
                    }
                  }}
                  className="p-0.5 rounded hover:bg-black/20"
                >
                  {isRunning || swRunning ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}

          {/* Persistent Spotify Sonic Deck Button */}
          <button
            onClick={() => setSpotifyDrawerOpen((prev) => !prev)}
            className="tactile-btn instrument-sub px-2.5 py-1.5 text-xs flex items-center gap-2"
            style={{
              borderColor: spotifyDrawerOpen
                ? 'rgba(16, 185, 129, 0.55)'
                : 'var(--border-hairline)'
            }}
            title="Toggle Persistent Spotify Sonic Deck (M)"
          >
            <div className="flex items-end gap-0.5 h-3">
              <span className="eq-bar" />
              <span className="eq-bar" />
              <span className="eq-bar" />
            </div>
            <span className="hidden xl:inline font-medium truncate max-w-[115px]">
              {activeSpotifyStream.name}
            </span>
            <span
              className="hidden sm:inline text-[10px] font-mono-num px-1 rounded"
              style={{
                backgroundColor: 'var(--bg-void)',
                color: 'var(--text-muted)'
              }}
            >
              M
            </span>
          </button>

          {/* Settings & Customization Trigger (S) */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="tactile-btn instrument-sub px-2.5 py-1.5 text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)' }}
            title="Customize Timer, Stopwatch & Calendar Settings (S)"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Settings</span>
            <span
              className="hidden sm:inline text-[10px] font-mono-num px-1 rounded"
              style={{
                backgroundColor: 'var(--bg-void)',
                color: 'var(--text-muted)'
              }}
            >
              S
            </span>
          </button>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setCmdPaletteOpen(true)}
            className="tactile-btn instrument-sub px-2.5 py-1.5 text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)' }}
            title="Command Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-mono-num">⌘K</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="tactile-btn instrument-sub p-2 text-xs"
            style={{ color: 'var(--text-secondary)' }}
            title="Switch Obsidian Dark / Alabaster Daylight Mode"
          >
            {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE AREA (3 DEDICATED VIEWS)
          ==================================================================== */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* ==================================================================
            VIEW 1: FOCUS FLOW STUDIO (COUNTDOWN TIMER + STOPWATCH + SAVED TASKS)
            ================================================================== */}
        {activeView === 'focus' && (
          <section className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Columns: Precision Focus Timer / Stopwatch + Dual Sonic Controller */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <InstrumentCard className="p-6 sm:p-8 flex flex-col items-center">
                  {/* Top Bar: Countdown Timer vs. Stopwatch Switcher + Quick Settings Button */}
                  <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-5">
                    <div className="instrument-sub p-1 flex items-center gap-1">
                      <button
                        onClick={() => setClockEngine('timer')}
                        className={`tactile-btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                          clockEngine === 'timer'
                            ? 'font-semibold shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            clockEngine === 'timer' ? 'var(--bg-elevated)' : 'transparent',
                          border:
                            clockEngine === 'timer'
                              ? '1px solid var(--border-strong)'
                              : '1px solid transparent'
                        }}
                      >
                        <Timer className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Countdown Timer</span>
                      </button>

                      <button
                        onClick={() => setClockEngine('stopwatch')}
                        className={`tactile-btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                          clockEngine === 'stopwatch'
                            ? 'font-semibold shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            clockEngine === 'stopwatch'
                              ? 'var(--bg-elevated)'
                              : 'transparent',
                          border:
                            clockEngine === 'stopwatch'
                              ? '1px solid var(--border-strong)'
                              : '1px solid transparent'
                        }}
                      >
                        <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Stopwatch</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSettingsTab('timer');
                        setSettingsModalOpen(true);
                      }}
                      className="tactile-btn instrument-sub px-2.5 py-1.5 text-[11px] font-mono-num flex items-center gap-1.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <SettingsIcon className="w-3 h-3" />
                      <span>Customize Timing</span>
                    </button>
                  </div>

                  {/* Mode-Specific Preset Strip (Only in Countdown Timer Mode) */}
                  {clockEngine === 'timer' && (
                    <div className="instrument-sub p-1 flex flex-wrap items-center justify-center gap-1 mb-5">
                      {[
                        {
                          id: 'pomodoro',
                          label: 'Focus',
                          mins: settings.timerPresets.pomodoro
                        },
                        {
                          id: 'deep',
                          label: 'Deep Flow',
                          mins: settings.timerPresets.deep
                        },
                        {
                          id: 'short',
                          label: 'Short Break',
                          mins: settings.timerPresets.short
                        },
                        {
                          id: 'long',
                          label: 'Long Rest',
                          mins: settings.timerPresets.long
                        }
                      ].map((m) => {
                        const active = timerMode === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => selectTimerPreset(m.id, m.mins)}
                            className={`tactile-btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                              active ? 'font-semibold shadow-xs' : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: active
                                ? 'var(--bg-elevated)'
                                : 'transparent',
                              border: active
                                ? '1px solid var(--border-strong)'
                                : '1px solid transparent'
                            }}
                          >
                            <span>{m.label}</span>
                            <span className="font-mono-num text-[11px] opacity-65">
                              {m.mins}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Focus Target Banner */}
                  <div className="w-full max-w-md mb-4">
                    <div className="instrument-sub px-3.5 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: settings.accentColor || '#6366F1' }}
                        />
                        <span
                          className="text-[10px] font-mono-num uppercase shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Target:
                        </span>
                        <span className="text-xs font-medium truncate">
                          {activeTarget?.title || 'Unlinked Deep Work Session'}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-mono-num px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.14)',
                          color: settings.accentColor || '#6366F1'
                        }}
                      >
                        {capacityMetrics.dayStats.minutes}m today
                      </span>
                    </div>
                  </div>

                  {/* Circular SVG Ring + Tabular Monospace Display */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-1">
                    {/* Breathing Flow Aura */}
                    <div
                      className={`absolute inset-6 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 ${
                        isRunning || swRunning ? 'aura-active opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        background:
                          'radial-gradient(circle, rgba(99, 102, 241, 0.36) 0%, rgba(16, 185, 129, 0.18) 70%, transparent 100%)'
                      }}
                    />

                    <svg className="w-full h-full relative z-10" viewBox="0 0 240 240">
                      <circle
                        cx="120"
                        cy="120"
                        r="112"
                        fill="none"
                        stroke="var(--border-hairline)"
                        strokeWidth="1"
                        strokeDasharray="2 6"
                      />
                      <circle
                        cx="120"
                        cy="120"
                        r="102"
                        fill="none"
                        stroke="var(--border-hairline)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="120"
                        cy="120"
                        r="102"
                        fill="none"
                        stroke={
                          isRunning || swRunning
                            ? '#10B981'
                            : settings.accentColor || '#6366F1'
                        }
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringProgressOffset}
                        style={{
                          transform: 'rotate(-90deg)',
                          transformOrigin: '50% 50%',
                          transition:
                            clockEngine === 'stopwatch'
                              ? 'stroke-dashoffset 100ms linear'
                              : 'stroke-dashoffset 450ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms ease'
                        }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-4">
                      <span
                        className="text-[10px] font-mono-num uppercase tracking-widest mb-1 font-semibold"
                        style={{
                          color:
                            isRunning || swRunning ? '#10B981' : 'var(--text-muted)'
                        }}
                      >
                        {clockEngine === 'stopwatch'
                          ? swRunning
                            ? 'STOPWATCH RUNNING'
                            : 'STOPWATCH READY'
                          : isRunning
                          ? 'FLOW ACTIVE'
                          : 'STANDBY'}
                      </span>

                      <div
                        className={`${
                          clockEngine === 'stopwatch'
                            ? 'text-4xl sm:text-5xl'
                            : 'text-5xl sm:text-6xl'
                        } font-mono-num font-bold tracking-tight`}
                      >
                        {clockEngine === 'stopwatch'
                          ? formattedStopwatch
                          : formattedCountdown}
                      </div>

                      {/* Quick Duration Adjuster OR Stopwatch Lap Counter */}
                      {clockEngine === 'timer' ? (
                        <div className="flex items-center gap-1.5 mt-3">
                          <button
                            onClick={() => adjustTimerMinutes(-5)}
                            className="tactile-btn instrument-sub px-2 py-0.5 text-[11px] font-mono-num"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            -5m
                          </button>
                          <button
                            onClick={() => adjustTimerMinutes(5)}
                            className="tactile-btn instrument-sub px-2 py-0.5 text-[11px] font-mono-num"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            +5m
                          </button>
                          <form
                            onSubmit={handleApplyCustomMinutes}
                            className="flex items-center"
                          >
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={customMinuteInput}
                              onChange={(e) => setCustomMinuteInput(e.target.value)}
                              placeholder="Min"
                              className="w-12 px-1.5 py-0.5 text-[11px] font-mono-num rounded instrument-sub text-center outline-none"
                              style={{ color: 'var(--text-primary)' }}
                              title="Type custom minutes & press Enter"
                            />
                          </form>
                        </div>
                      ) : (
                        <div
                          className="text-[11px] font-mono-num mt-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {(workspace.stopwatchLaps || []).length} lap(s) recorded
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Transport Controls (Countdown vs. Stopwatch) */}
                  {clockEngine === 'timer' ? (
                    <div className="flex items-center gap-3 w-full max-w-xs mt-4">
                      <button
                        onClick={() => setIsRunning((prev) => !prev)}
                        className="tactile-btn flex-1 py-3 rounded-xl text-xs uppercase tracking-wider font-mono-num font-bold flex items-center justify-center gap-2 shadow-md"
                        style={{
                          backgroundColor: isRunning
                            ? '#10B981'
                            : 'var(--text-primary)',
                          color: isRunning ? '#04120B' : 'var(--bg-void)'
                        }}
                      >
                        {isRunning ? (
                          <>
                            <Pause className="w-4 h-4 fill-current" />
                            <span>Pause Flow</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>Start Session</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setIsRunning(false);
                          setRemainingSeconds(totalSeconds);
                        }}
                        className="tactile-btn instrument-sub p-3"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleCompleteSession}
                        className="tactile-btn instrument-sub p-3 text-emerald-400"
                        title="Complete & Log Session Now"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full max-w-md flex flex-col gap-3 mt-4">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setSwRunning((prev) => !prev)}
                          className="tactile-btn flex-1 py-3 rounded-xl text-xs uppercase tracking-wider font-mono-num font-bold flex items-center justify-center gap-2 shadow-md"
                          style={{
                            backgroundColor: swRunning
                              ? '#F59E0B'
                              : '#10B981',
                            color: '#04120B'
                          }}
                        >
                          {swRunning ? (
                            <>
                              <Pause className="w-4 h-4 fill-current" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-current" />
                              <span>{swElapsedMs > 0 ? 'Resume' : 'Start Stopwatch'}</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleStopwatchLap}
                          disabled={swElapsedMs < 500}
                          className="tactile-btn instrument-sub px-3.5 py-3 text-xs font-mono-num font-semibold flex items-center gap-1.5 disabled:opacity-40"
                          title="Record Split Lap"
                        >
                          <FlagTriangleRight className="w-4 h-4 text-indigo-400" />
                          <span>Lap</span>
                        </button>

                        <button
                          onClick={handleStopwatchReset}
                          className="tactile-btn instrument-sub p-3"
                          style={{ color: 'var(--text-secondary)' }}
                          title="Reset Stopwatch"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={handleLogStopwatchSession}
                          className="tactile-btn instrument-sub px-3 py-3 text-xs font-mono-num font-semibold text-emerald-400 flex items-center gap-1"
                          title="Log Elapsed Stopwatch Minutes to Task & Vault"
                        >
                          <Check className="w-4 h-4" />
                          <span>Log</span>
                        </button>
                      </div>

                      {/* Recorded Laps Table */}
                      {(workspace.stopwatchLaps || []).length > 0 && (
                        <div className="instrument-sub p-3 max-h-36 overflow-y-auto">
                          <div className="flex items-center justify-between text-[10px] font-mono-num uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                            <span>Stopwatch Split Laps</span>
                            <button
                              onClick={handleClearStopwatchLaps}
                              className="text-rose-400 hover:underline"
                            >
                              Clear Laps
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {(workspace.stopwatchLaps || []).map((lap) => (
                              <div
                                key={lap.id}
                                className="flex items-center justify-between text-xs font-mono-num py-1 border-b last:border-none"
                                style={{ borderColor: 'var(--border-hairline)' }}
                              >
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Lap #{lap.lapNumber}
                                </span>
                                <span className="text-emerald-400 font-semibold">
                                  +{formatStopwatchMs(lap.splitMs)}
                                </span>
                                <span style={{ color: 'var(--text-primary)' }}>
                                  {formatStopwatchMs(lap.totalMs)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </InstrumentCard>

                {/* Dual-Mode Sonic Architecture Card (Spotify Stream + Web Audio Synth Underlay) */}
                <InstrumentCard className="p-5 flex flex-col gap-4">
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b"
                    style={{ borderColor: 'var(--border-hairline)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.14)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#10B981'
                        }}
                      >
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            Spotify Sonic Deck
                          </span>
                          <span
                            className="text-[10px] font-mono-num px-1.5 py-0.2 rounded font-semibold"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981'
                            }}
                          >
                            NON-STOP ACROSS TABS
                          </span>
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          Active Station: <strong className="text-emerald-400">{activeSpotifyStream.name}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSpotifyDrawerOpen((prev) => !prev)}
                      className="tactile-btn px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        backgroundColor: '#10B981',
                        color: '#04130C'
                      }}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{spotifyDrawerOpen ? 'Hide Player' : 'Open Spotify Deck'}</span>
                    </button>
                  </div>

                  {/* Quick Station Selector Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allSpotifyStreams.map((stream) => {
                      const isCurrent = stream.id === activeSpotifyStream.id;
                      return (
                        <button
                          key={stream.id}
                          onClick={() => selectSpotifyStream(stream.id, true)}
                          className="tactile-btn px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
                          style={{
                            backgroundColor: isCurrent
                              ? 'rgba(16, 185, 129, 0.16)'
                              : 'var(--bg-interactive)',
                            border: isCurrent
                              ? '1px solid #10B981'
                              : '1px solid var(--border-hairline)',
                            color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          <Play className="w-2.5 h-2.5 text-emerald-400 fill-current" />
                          <span>{stream.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Procedural Web Audio Synth Underlay */}
                  <div className="instrument-sub p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-medium">Acoustic Synth Underlay</span>
                      <span
                        className="text-[10px] font-mono-num px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: activeSynthType
                            ? 'rgba(16, 185, 129, 0.16)'
                            : 'var(--bg-elevated)',
                          color: activeSynthType ? '#10B981' : 'var(--text-muted)'
                        }}
                      >
                        {activeSynthType ? activeSynthType.toUpperCase() : 'OFF'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'brown', label: 'Warm Brown' },
                        { id: 'rain', label: 'Soft Rain' },
                        { id: 'gamma', label: '40Hz Gamma' }
                      ].map((s) => {
                        const on = activeSynthType === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleSynthSound(s.id)}
                            className="tactile-btn px-2.5 py-1 rounded-md text-[11px] font-medium"
                            style={{
                              backgroundColor: on
                                ? 'rgba(99, 102, 241, 0.2)'
                                : 'var(--bg-elevated)',
                              border: on
                                ? '1px solid #6366F1'
                                : '1px solid var(--border-hairline)'
                            }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={synthVolume}
                        onChange={(e) => handleSynthVolumeChange(e.target.value)}
                        className="w-16 accent-indigo-500 cursor-pointer ml-1"
                        title="Acoustic Synth Volume"
                      />
                    </div>
                  </div>
                </InstrumentCard>
              </div>

              {/* Right 5 Columns: Full Task Manager with Real-Time Data Save + Day Schedule Bridge */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <InstrumentCard className="p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold heading-tight">
                          Focus Task Queue
                        </h2>
                        <span
                          className="text-[10px] font-mono-num px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.14)',
                            color: '#10B981'
                          }}
                        >
                          AUTO-SAVED
                        </span>
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        Click play to lock in or calendar icon to time-block
                      </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="instrument-sub p-0.5 flex items-center text-[11px]">
                      {[
                        { id: 'today', label: 'Selected Day' },
                        { id: 'open', label: 'All Open' },
                        { id: 'completed', label: 'Done' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setTaskFilter(f.id)}
                          className="px-2 py-1 rounded font-medium transition-colors"
                          style={{
                            backgroundColor:
                              taskFilter === f.id ? 'var(--bg-elevated)' : 'transparent',
                            color:
                              taskFilter === f.id
                                ? 'var(--text-primary)'
                                : 'var(--text-secondary)'
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add Task Form */}
                  <form onSubmit={handleAddTask} className="flex flex-col gap-2 mb-3.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder={`Add task for ${selectedDate === todayKey ? 'Today' : selectedDate}...`}
                        className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                        style={{
                          backgroundColor: 'var(--bg-void)',
                          border: '1px solid var(--border-strong)',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        type="submit"
                        className="tactile-btn px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                        style={{
                          backgroundColor: '#6366F1',
                          color: '#FFFFFF'
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: 'var(--text-muted)' }}>Priority:</span>
                        {['high', 'medium', 'low'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewTaskPriority(p)}
                            className="px-2 py-0.5 rounded font-mono-num uppercase text-[10px]"
                            style={{
                              backgroundColor:
                                newTaskPriority === p
                                  ? p === 'high'
                                    ? 'rgba(244, 63, 94, 0.2)'
                                    : p === 'medium'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(6, 182, 212, 0.2)'
                                  : 'var(--bg-interactive)',
                              color:
                                p === 'high'
                                  ? '#F43F5E'
                                  : p === 'medium'
                                  ? '#F59E0B'
                                  : '#06B6D4',
                              border:
                                newTaskPriority === p
                                  ? '1px solid currentColor'
                                  : '1px solid transparent'
                            }}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={newTaskEst}
                          onChange={(e) => setNewTaskEst(Number(e.target.value))}
                          className="rounded px-2 py-0.5 text-[11px] font-mono-num outline-none"
                          style={{
                            backgroundColor: 'var(--bg-interactive)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <option value={25}>25m est</option>
                          <option value={50}>50m est</option>
                          <option value={90}>90m est</option>
                        </select>
                      </div>
                    </div>
                  </form>

                  {/* Task Items List */}
                  <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                    {filteredTasks.length === 0 ? (
                      <div
                        className="instrument-sub p-6 text-center text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        No tasks in this filter. Add a task above — it saves automatically.
                      </div>
                    ) : (
                      filteredTasks.map((task) => {
                        const isTargeted =
                          activeTarget?.type === 'task' && activeTarget?.id === task.id;
                        const pColor =
                          task.priority === 'high'
                            ? '#F43F5E'
                            : task.priority === 'medium'
                            ? '#F59E0B'
                            : '#06B6D4';

                        return (
                          <div
                            key={task.id}
                            className="instrument-sub p-2.5 flex items-center justify-between gap-2 transition-transform hover:translate-x-0.5"
                            style={{
                              borderColor: isTargeted
                                ? '#6366F1'
                                : 'var(--border-hairline)',
                              backgroundColor: isTargeted
                                ? 'rgba(99, 102, 241, 0.1)'
                                : 'var(--bg-interactive)'
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <button
                                onClick={() => toggleTaskCompleted(task.id)}
                                className="tactile-btn shrink-0"
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Circle
                                    className="w-4 h-4"
                                    style={{ color: 'var(--text-muted)' }}
                                  />
                                )}
                              </button>

                              {editingTaskId === task.id ? (
                                <input
                                  type="text"
                                  value={editingTaskTitle}
                                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                                  onBlur={() => saveInlineTaskEdit(task.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveInlineTaskEdit(task.id);
                                  }}
                                  autoFocus
                                  className="flex-1 bg-transparent border-b border-indigo-500 text-xs outline-none"
                                />
                              ) : (
                                <div
                                  onDoubleClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditingTaskTitle(task.title);
                                  }}
                                  className="min-w-0 flex-1 cursor-pointer"
                                >
                                  <div
                                    className={`text-xs font-medium truncate ${
                                      task.completed ? 'line-through opacity-50' : ''
                                    }`}
                                  >
                                    {task.title}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono-num">
                                    <button
                                      onClick={() => cycleTaskPriority(task.id)}
                                      style={{ color: pColor }}
                                      className="uppercase font-semibold hover:underline"
                                      title="Click to cycle priority"
                                    >
                                      {task.priority}
                                    </button>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {task.estMins}m est
                                    </span>
                                    {task.loggedMins > 0 && (
                                      <span className="text-emerald-400">
                                        • {task.loggedMins}m logged
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => lockTaskIntoTimer(task)}
                                className="tactile-btn p-1.5 rounded hover:bg-indigo-500/20 text-indigo-400"
                                title="Load into Focus Timer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                              <button
                                onClick={() => sendTaskToTimeline(task)}
                                className="tactile-btn p-1.5 rounded hover:bg-white/10"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Schedule on Day Timeline"
                              >
                                <CalendarIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteTaskWithUndo(task)}
                                className="tactile-btn p-1.5 rounded hover:bg-rose-500/20 text-rose-400"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </InstrumentCard>

                {/* Scheduled Time Blocks Snapshot for Selected Date */}
                <InstrumentCard className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider font-mono-num">
                        Timeline on {selectedDate === todayKey ? 'Today' : selectedDate}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveView('calendar')}
                      className="text-xs font-medium text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open Planner</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[165px] overflow-y-auto pr-1">
                    {selectedDayBlocks.length === 0 ? (
                      <div
                        className="instrument-sub p-4 text-center text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        No time blocks scheduled yet.{' '}
                        <button
                          onClick={() => openNewBlockModal(9 * 60)}
                          className="text-indigo-400 underline font-medium"
                        >
                          + Schedule block
                        </button>
                      </div>
                    ) : (
                      selectedDayBlocks.map((b) => {
                        const cat = BLOCK_CATEGORIES[b.category] || BLOCK_CATEGORIES.deep;
                        return (
                          <div
                            key={b.id}
                            onClick={() => launchBlockIntoTimer(b)}
                            className="instrument-sub p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:border-indigo-500/50"
                            style={{ borderLeft: `3px solid ${cat.color}` }}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{b.title}</div>
                              <div
                                className="text-[10px] font-mono-num"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {formatMins12(b.startMin, settings.use24Hour)} –{' '}
                                {formatMins12(b.endMin, settings.use24Hour)}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 shrink-0">
                              Focus
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </InstrumentCard>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            VIEW 2: GOOGLE CALENDAR-STYLE PLANNER (MONTH GRID + DAY TIMELINE)
            ================================================================== */}
        {activeView === 'calendar' && (
          <section className="flex-1 overflow-hidden px-4 sm:px-8 py-5 flex flex-col lg:flex-row gap-6">
            {/* Left 60%: Interactive Month Calendar Grid + D-Day Milestone Strip */}
            <InstrumentCard className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Calendar Header */}
              <div
                className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold heading-tight">
                    {new Date(calYear, calMonth, 1).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h2>
                  <div className="instrument-sub p-0.5 flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      className="tactile-btn p-1.5 rounded hover:opacity-80"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={jumpToToday}
                      className="tactile-btn px-2.5 py-1 text-xs font-medium"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear((y) => y + 1);
                        } else {
                          setCalMonth((m) => m + 1);
                        }
                      }}
                      className="tactile-btn p-1.5 rounded hover:opacity-80"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calendar Customization + D-Day + Add Block CTA */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSettingsTab('calendar');
                      setSettingsModalOpen(true);
                    }}
                    className="tactile-btn instrument-sub px-2.5 py-1.5 text-xs flex items-center gap-1.5"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Customize Calendar Week Start & Timeline Hours"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Calendar Settings</span>
                  </button>
                  <button
                    onClick={() =>
                      setMilestoneModal({ open: true, title: '', dateKey: selectedDate })
                    }
                    className="tactile-btn instrument-sub px-2.5 py-1.5 text-xs flex items-center gap-1.5 text-amber-400"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>+ D-Day</span>
                  </button>
                  <button
                    onClick={() => openNewBlockModal(Math.max(startHour * 60, 9 * 60))}
                    className="tactile-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      backgroundColor: settings.accentColor || '#6366F1',
                      color: '#FFFFFF'
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Block</span>
                  </button>
                </div>
              </div>

              {/* Weekday Headers (Dynamic Sunday or Monday Start) */}
              <div
                className="grid grid-cols-7 border-b text-center py-2 text-[10px] font-mono-num font-semibold"
                style={{
                  borderColor: 'var(--border-hairline)',
                  backgroundColor: 'var(--bg-interactive)',
                  color: 'var(--text-muted)'
                }}
              >
                {calendarWeekdayLabels.map((dayLabel) => (
                  <div key={dayLabel}>{dayLabel}</div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="flex-1 overflow-y-auto grid grid-cols-7 auto-rows-fr">
                {calendarCells.map((cell) => {
                  const isSel = cell.dateKey === selectedDate;
                  const isToday = cell.dateKey === todayKey;
                  const dayBlocks = workspace.blocksByDate?.[cell.dateKey] || [];
                  const dayTasks = (workspace.tasks || []).filter(
                    (t) => t.dateKey === cell.dateKey && !t.completed
                  );
                  const dayMilestones = (workspace.milestones || []).filter(
                    (m) => m.dateKey === cell.dateKey
                  );

                  return (
                    <div
                      key={cell.dateKey}
                      onClick={() => setSelectedDate(cell.dateKey)}
                      onDoubleClick={() => {
                        setSelectedDate(cell.dateKey);
                        openNewBlockModal(9 * 60, cell.dateKey);
                      }}
                      className={`min-h-[94px] p-2 border-r border-b flex flex-col justify-between cursor-pointer transition-colors ${
                        !cell.isCurrentMonth ? 'opacity-35' : ''
                      }`}
                      style={{
                        borderColor: 'var(--border-hairline)',
                        backgroundColor: isSel
                          ? 'rgba(99, 102, 241, 0.12)'
                          : 'transparent',
                        boxShadow: isSel ? 'inset 0 0 0 1px #6366F1' : 'none'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono-num font-semibold ${
                            isToday
                              ? 'px-1.5 py-0.5 rounded bg-indigo-500 text-white'
                              : ''
                          }`}
                        >
                          {cell.dNum}
                        </span>
                        {dayTasks.length > 0 && (
                          <span
                            className="text-[10px] font-mono-num px-1 rounded"
                            style={{
                              backgroundColor: 'var(--bg-interactive)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {dayTasks.length}t
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayMilestones.slice(0, 1).map((ms) => (
                          <div
                            key={ms.id}
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold truncate"
                            style={{
                              backgroundColor: 'rgba(244, 63, 94, 0.16)',
                              color: '#F43F5E'
                            }}
                          >
                            ⚑ {ms.title}
                          </div>
                        ))}

                        {dayBlocks.slice(0, 2).map((b) => {
                          const cat =
                            BLOCK_CATEGORIES[b.category] || BLOCK_CATEGORIES.deep;
                          return (
                            <div
                              key={b.id}
                              className="text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--bg-interactive)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate">{b.title}</span>
                            </div>
                          );
                        })}

                        {dayBlocks.length > 2 && (
                          <div
                            className="text-[9px] font-mono-num pl-1"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            +{dayBlocks.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </InstrumentCard>

            {/* Right 40%: Selected Date Google Calendar Hourly Day Timeline */}
            <InstrumentCard className="w-full lg:w-[430px] xl:w-[460px] flex flex-col overflow-hidden shrink-0">
              <div
                className="px-5 py-3.5 border-b flex items-center justify-between gap-2"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold heading-tight">
                      {fromDateKey(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span
                      className="text-[10px] font-mono-num px-2 py-0.5 rounded font-semibold"
                      style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: settings.accentColor || '#6366F1'
                      }}
                    >
                      {(capacityMetrics.totalScheduledMins / 60).toFixed(1)}h planned
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {formatMins12(startHour * 60, settings.use24Hour)} –{' '}
                    {formatMins12(endHour * 60, settings.use24Hour)} • Click slot to plan
                  </p>
                </div>

                <button
                  onClick={handleAutoScheduleOpenTasks}
                  className="tactile-btn instrument-sub px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1 text-indigo-400"
                  title="Auto-slot open tasks into free hours"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill</span>
                </button>
              </div>

              {/* Scrollable Hourly Day Grid */}
              <div
                ref={timelineScrollRef}
                className="flex-1 overflow-y-auto relative"
              >
                <div
                  className="relative select-none"
                  style={{
                    height: `${(endHour - startHour) * HOUR_HEIGHT}px`,
                    backgroundImage: `
                      linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px),
                      linear-gradient(to bottom, var(--grid-subline) 1px, transparent 1px)
                    `,
                    backgroundSize: `100% ${HOUR_HEIGHT}px, 100% ${HOUR_HEIGHT / 2}px`
                  }}
                >
                  {/* Hour Labels & Clickable Slots */}
                  {Array.from(
                    { length: endHour - startHour },
                    (_, idx) => startHour + idx
                  ).map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="flex items-start group"
                    >
                      <div
                        className="w-14 pr-2.5 pt-1 text-right text-[10px] font-mono-num shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {settings.use24Hour
                          ? formatMins12(hour * 60, true)
                          : formatMins12(hour * 60, false).replace(':00 ', ' ')}
                      </div>
                      <div
                        onClick={() => openNewBlockModal(hour * 60)}
                        className="flex-1 h-full cursor-pointer group-hover:bg-indigo-500/5 transition-colors relative"
                      >
                        <span
                          className="opacity-0 group-hover:opacity-100 text-[10px] font-mono-num absolute left-3 top-1.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          + Plan at {formatMins12(hour * 60, settings.use24Hour)} ({settings.defaultBlockMins}m)
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Live Red Laser Time Indicator (if viewing Today) */}
                  {selectedDate === todayKey &&
                    nowMinutes >= startHour * 60 &&
                    nowMinutes <= endHour * 60 && (
                      <div
                        style={{
                          top: `${((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT}px`
                        }}
                        className="absolute left-14 right-0 h-[1.5px] bg-rose-500 z-20 pointer-events-none"
                      >
                        <div className="w-2 h-2 rounded-full bg-rose-500 -left-1 -top-[3px] absolute shadow-[0_0_10px_#F43F5E]" />
                        <span className="absolute -left-14 -top-2 text-[9px] font-mono-num font-bold px-1 rounded bg-rose-500 text-white">
                          NOW
                        </span>
                      </div>
                    )}

                  {/* Scheduled Time Blocks */}
                  {selectedDayBlocks.map((block) => {
                    const cat =
                      BLOCK_CATEGORIES[block.category] || BLOCK_CATEGORIES.deep;
                    const sClamp = Math.max(startHour * 60, block.startMin);
                    const eClamp = Math.min(endHour * 60, block.endMin);
                    const dur = Math.max(25, eClamp - sClamp);
                    const topPx =
                      ((sClamp - startHour * 60) / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(
                      32,
                      (dur / 60) * HOUR_HEIGHT - 2
                    );

                    return (
                      <div
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditBlockModal(block);
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          backgroundColor: cat.bgSoft,
                          border: `1px solid ${cat.border}`,
                          borderLeft: `3.5px solid ${cat.color}`
                        }}
                        className="absolute left-16 right-3 rounded-lg px-3 py-1.5 cursor-pointer z-10 backdrop-blur-md transition-transform hover:-translate-y-[1px]"
                      >
                        <div className="flex items-start justify-between gap-2 h-full">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">
                              {block.title}
                            </div>
                            <div
                              className="text-[10px] font-mono-num"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {formatMins12(block.startMin, settings.use24Hour)} –{' '}
                              {formatMins12(block.endMin, settings.use24Hour)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              launchBlockIntoTimer(block);
                            }}
                            className="tactile-btn px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[10px] font-mono-num flex items-center gap-1 shrink-0"
                          >
                            <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
                            <span>Focus</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </InstrumentCard>
          </section>
        )}

        {/* ==================================================================
            VIEW 3: TIME MANAGEMENT & CAPACITY ENGINE
            ================================================================== */}
        {activeView === 'timemgmt' && (
          <section className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-6xl w-full mx-auto flex flex-col gap-6">
              {/* Top 4 Telemetry KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InstrumentCard className="p-5">
                  <div
                    className="flex items-center justify-between text-xs mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>Scheduled Time (Day)</span>
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-mono-num font-bold">
                    {(capacityMetrics.totalScheduledMins / 60).toFixed(1)}h
                  </div>
                  <div
                    className="text-[11px] font-mono-num mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {Math.round(
                      (capacityMetrics.totalScheduledMins /
                        capacityMetrics.wakingBudgetMins) *
                        100
                    )}
                    % of {settings.dailyCapacityHours}.0h target capacity
                  </div>
                </InstrumentCard>

                <InstrumentCard className="p-5">
                  <div
                    className="flex items-center justify-between text-xs mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>Completed Focus</span>
                    <Flame className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-mono-num font-bold text-emerald-400">
                    {(capacityMetrics.dayStats.minutes / 60).toFixed(1)}h
                  </div>
                  <div
                    className="text-[11px] font-mono-num mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {capacityMetrics.dayStats.sessions} sessions logged on date
                  </div>
                </InstrumentCard>

                <InstrumentCard className="p-5">
                  <div
                    className="flex items-center justify-between text-xs mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>Open Task Queue Load</span>
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-mono-num font-bold text-cyan-400">
                    {(capacityMetrics.openTaskEstMins / 60).toFixed(1)}h
                  </div>
                  <div
                    className="text-[11px] font-mono-num mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {capacityMetrics.openTasksCount} uncompleted tasks for date
                  </div>
                </InstrumentCard>

                <InstrumentCard className="p-5">
                  <div
                    className="flex items-center justify-between text-xs mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>Unallocated Cognitive Buffer</span>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-mono-num font-bold">
                    {(capacityMetrics.unscheduledMins / 60).toFixed(1)}h
                  </div>
                  <div
                    className="text-[11px] font-mono-num mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Available margin in 16h day
                  </div>
                </InstrumentCard>
              </div>

              {/* Middle Row: 16-Hour Waking Capacity Bar + 7-Day Focus Horizon */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Cols: 16-Hour Waking Capacity Visualizer */}
                <InstrumentCard className="lg:col-span-7 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-sm font-bold heading-tight">
                          16-Hour Waking Capacity & Category Reconciler
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Allocation across {selectedDate} (07:00 – 23:00 waking window)
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-mono-num font-semibold px-2.5 py-1 rounded"
                        style={{
                          backgroundColor:
                            capacityMetrics.totalScheduledMins > 10 * 60
                              ? 'rgba(244, 63, 94, 0.16)'
                              : 'rgba(16, 185, 129, 0.16)',
                          color:
                            capacityMetrics.totalScheduledMins > 10 * 60
                              ? '#F43F5E'
                              : '#10B981'
                        }}
                      >
                        {capacityMetrics.totalScheduledMins > 10 * 60
                          ? 'HIGH COGNITIVE LOAD'
                          : 'OPTIMAL FLOW BALANCE'}
                      </span>
                    </div>

                    {/* Multi-Segment Capacity Progress Bar */}
                    <div className="w-full h-4 rounded-lg instrument-sub overflow-hidden flex gap-0.5 p-0.5 my-5">
                      {Object.values(BLOCK_CATEGORIES).map((cat) => {
                        const mins = capacityMetrics.totals[cat.id] || 0;
                        const pct = Math.min(
                          100,
                          (mins / capacityMetrics.wakingBudgetMins) * 100
                        );
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={cat.id}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: cat.color
                            }}
                            className="h-full first:rounded-l last:rounded-r transition-all duration-300"
                            title={`${cat.label}: ${(mins / 60).toFixed(1)}h`}
                          />
                        );
                      })}
                    </div>

                    {/* Category Breakdown Rows */}
                    <div className="space-y-2.5">
                      {Object.values(BLOCK_CATEGORIES).map((cat) => {
                        const mins = capacityMetrics.totals[cat.id] || 0;
                        return (
                          <div
                            key={cat.id}
                            className="instrument-sub px-3.5 py-2.5 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-xs font-medium">{cat.label}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono-num">
                              <span
                                className="text-[11px]"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {cat.idealHours}
                              </span>
                              <span className="text-xs font-bold w-12 text-right">
                                {(mins / 60).toFixed(1)}h
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-Schedule Action Footer */}
                  <div
                    className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3"
                    style={{ borderColor: 'var(--border-hairline)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Have unscheduled tasks in your queue? Slot them into free timeline gaps.
                    </span>
                    <button
                      onClick={handleAutoScheduleOpenTasks}
                      className="tactile-btn px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
                      style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Schedule Open Tasks</span>
                    </button>
                  </div>
                </InstrumentCard>

                {/* Right 5 Cols: 7-Day Time Horizon + D-Day Milestones */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <InstrumentCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold heading-tight">
                          7-Day Focus Horizon
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Planned vs. completed hours across the week
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-mono-num"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Click bar to inspect
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4 px-1">
                      {weeklyHorizon.map((item) => {
                        const isSel = item.dateKey === selectedDate;
                        const pct = Math.min(
                          100,
                          Math.max(8, (item.plannedHours / 10) * 100)
                        );
                        return (
                          <div
                            key={item.dateKey}
                            onClick={() => setSelectedDate(item.dateKey)}
                            className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
                          >
                            <span
                              className="text-[10px] font-mono-num"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {item.plannedHours.toFixed(1)}h
                            </span>
                            <div
                              className="w-full instrument-sub h-24 flex items-end p-0.5"
                              style={{
                                borderColor: isSel
                                  ? '#6366F1'
                                  : 'var(--border-hairline)'
                              }}
                            >
                              <div
                                style={{
                                  height: `${pct}%`,
                                  backgroundColor: isSel
                                    ? '#6366F1'
                                    : 'rgba(142, 149, 165, 0.35)'
                                }}
                                className="w-full rounded-xs transition-all duration-300 group-hover:opacity-90"
                              />
                            </div>
                            <span
                              className={`text-[10px] font-mono-num ${
                                isSel ? 'text-indigo-400 font-bold' : ''
                              }`}
                              style={{
                                color: isSel ? '#6366F1' : 'var(--text-muted)'
                              }}
                            >
                              {item.dayShort}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </InstrumentCard>

                  {/* D-Day Countdowns Card */}
                  <InstrumentCard className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-rose-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono-num">
                          D-Day Milestones
                        </h3>
                      </div>
                      <button
                        onClick={() =>
                          setMilestoneModal({
                            open: true,
                            title: '',
                            dateKey: selectedDate
                          })
                        }
                        className="text-xs font-medium text-indigo-400 hover:underline"
                      >
                        + Add D-Day
                      </button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {(workspace.milestones || []).map((ms) => {
                        const diff = getDaysDiff(todayKey, ms.dateKey);
                        const badge =
                          diff === 0
                            ? 'D-DAY'
                            : diff > 0
                            ? `D-${diff}`
                            : `D+${Math.abs(diff)}`;
                        return (
                          <div
                            key={ms.id}
                            onClick={() => setSelectedDate(ms.dateKey)}
                            className="instrument-sub px-3 py-2 flex items-center justify-between cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">
                                {ms.title}
                              </div>
                              <div
                                className="text-[10px] font-mono-num"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {ms.dateKey}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-[10px] font-mono-num font-bold px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor:
                                    diff <= 3 && diff >= 0
                                      ? 'rgba(244, 63, 94, 0.16)'
                                      : 'rgba(245, 158, 11, 0.16)',
                                  color: diff <= 3 && diff >= 0 ? '#F43F5E' : '#F59E0B'
                                }}
                              >
                                {badge}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMilestone(ms.id);
                                }}
                                className="text-rose-400 opacity-60 hover:opacity-100"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </InstrumentCard>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ====================================================================
          PERSISTENT FLOATING SPOTIFY SONIC DECK (NEVER UNMOUNTS ACROSS TABS)
          ==================================================================== */}
      <aside
        style={{
          boxShadow: 'var(--modal-shadow)',
          borderColor: 'var(--border-strong)',
          transform: spotifyDrawerOpen
            ? 'translateY(0) scale(1)'
            : 'translateY(20px) scale(0.96)',
          opacity: spotifyDrawerOpen ? 1 : 0,
          pointerEvents: spotifyDrawerOpen ? 'auto' : 'none',
          transition:
            'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease'
        }}
        className="fixed right-5 bottom-5 w-[395px] max-w-[calc(100vw-32px)] z-40 instrument-card p-4"
      >
        <div
          className="flex items-center justify-between pb-3 mb-3 border-b"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Music className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold truncate">Spotify Sonic Deck</h4>
                <span className="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                  PERSISTENT
                </span>
              </div>
              <p
                className="text-[10px] truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {activeSpotifyStream.name} — {activeSpotifyStream.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSpotifyDrawerOpen(false)}
            className="tactile-btn instrument-sub px-2 py-1 text-[10px] font-mono-num"
            style={{ color: 'var(--text-secondary)' }}
          >
            Minimize (M)
          </button>
        </div>

        {/* Station Selector Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allSpotifyStreams.map((s) => {
            const active = s.id === activeSpotifyStream.id;
            return (
              <button
                key={s.id}
                onClick={() => selectSpotifyStream(s.id, true)}
                className="tactile-btn px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
                style={{
                  backgroundColor: active
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'var(--bg-interactive)',
                  border: active
                    ? '1px solid #10B981'
                    : '1px solid var(--border-hairline)'
                }}
              >
                <span>{s.name}</span>
                {s.isCustom && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomSpotifyStream(s.id);
                    }}
                    className="ml-1 opacity-60 hover:opacity-100 text-rose-400"
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Persistent Spotify Embed Iframe */}
        <div
          className="rounded-xl overflow-hidden mb-3 border"
          style={{ borderColor: 'var(--border-hairline)', backgroundColor: '#000' }}
        >
          <iframe
            title="Spotify Focus Embed"
            style={{ borderRadius: '12px' }}
            src={activeSpotifyStream.embedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>

        {/* Custom Spotify Link / URI Loader (Saved to Vault) */}
        <form onSubmit={handleLoadCustomSpotify} className="flex gap-1.5">
          <input
            type="text"
            value={customSpotifyInput}
            onChange={(e) => setCustomSpotifyInput(e.target.value)}
            placeholder="Paste Spotify playlist/track/album link..."
            className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
            style={{
              backgroundColor: 'var(--bg-void)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)'
            }}
          />
          <button
            type="submit"
            className="tactile-btn px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0"
            style={{ backgroundColor: '#10B981', color: '#04120B' }}
          >
            Save Station
          </button>
        </form>
      </aside>

      {/* ====================================================================
          MODAL 1: SCHEDULE / EDIT TIME BLOCK
          ==================================================================== */}
      {blockModal.open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setBlockModal((prev) => ({ ...prev, open: false }));
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            className="instrument-card w-full max-w-md p-6"
            style={{ boxShadow: 'var(--modal-shadow)' }}
          >
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  {blockModal.editId ? 'Edit Scheduled Block' : 'Schedule Time Block'}
                </h3>
              </div>
              <button
                onClick={() => setBlockModal((prev) => ({ ...prev, open: false }))}
                className="p-1 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBlockModal} className="mt-4 space-y-4">
              <div>
                <label
                  className="block text-[11px] font-mono-num uppercase mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Block Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={blockModal.title}
                  onChange={(e) =>
                    setBlockModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Systems Architecture Deep Work"
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-void)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    className="block text-[11px] font-mono-num uppercase mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={blockModal.dateKey}
                    onChange={(e) =>
                      setBlockModal((prev) => ({ ...prev, dateKey: e.target.value }))
                    }
                    className="w-full rounded-lg px-2.5 py-2 text-xs font-mono-num outline-none"
                    style={{
                      backgroundColor: 'var(--bg-void)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-mono-num uppercase mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Start
                  </label>
                  <select
                    value={blockModal.startMin}
                    onChange={(e) =>
                      setBlockModal((prev) => ({
                        ...prev,
                        startMin: Number(e.target.value)
                      }))
                    }
                    className="w-full rounded-lg px-2 py-2 text-xs font-mono-num outline-none"
                    style={{
                      backgroundColor: 'var(--bg-void)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {Array.from({ length: (endHour - startHour) * 2 }, (_, i) => {
                      const mins = startHour * 60 + i * 30;
                      return (
                        <option key={mins} value={mins}>
                          {formatMins12(mins, settings.use24Hour)}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-[11px] font-mono-num uppercase mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    End
                  </label>
                  <select
                    value={blockModal.endMin}
                    onChange={(e) =>
                      setBlockModal((prev) => ({
                        ...prev,
                        endMin: Number(e.target.value)
                      }))
                    }
                    className="w-full rounded-lg px-2 py-2 text-xs font-mono-num outline-none"
                    style={{
                      backgroundColor: 'var(--bg-void)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {Array.from(
                      { length: (endHour - startHour) * 2 + 1 },
                      (_, i) => {
                        const mins = startHour * 60 + i * 30;
                        return (
                          <option key={mins} value={mins}>
                            {formatMins12(mins, settings.use24Hour)}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label
                  className="block text-[11px] font-mono-num uppercase mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {Object.values(BLOCK_CATEGORIES).map((cat) => {
                    const selected = blockModal.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setBlockModal((prev) => ({ ...prev, category: cat.id }))
                        }
                        className="p-2 rounded-lg text-[11px] font-medium text-center transition-all"
                        style={{
                          backgroundColor: selected
                            ? cat.bgSoft
                            : 'var(--bg-interactive)',
                          border: selected
                            ? `1px solid ${cat.color}`
                            : '1px solid var(--border-hairline)'
                        }}
                      >
                        {cat.label.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  className="block text-[11px] font-mono-num uppercase mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Session Notes
                </label>
                <input
                  type="text"
                  value={blockModal.notes}
                  onChange={(e) =>
                    setBlockModal((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Optional deliverable or link..."
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-void)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div
                className="pt-3 border-t flex items-center justify-between gap-2"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                {blockModal.editId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(blockModal.editId)}
                    className="tactile-btn px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400"
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBlockModal((prev) => ({ ...prev, open: false }))
                    }
                    className="tactile-btn instrument-sub px-3.5 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="tactile-btn px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--bg-void)'
                    }}
                  >
                    Save Block
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ADD D-DAY MILESTONE / DEADLINE
          ==================================================================== */}
      {milestoneModal.open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setMilestoneModal((prev) => ({ ...prev, open: false }));
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            className="instrument-card w-full max-w-sm p-6"
            style={{ boxShadow: 'var(--modal-shadow)' }}
          >
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold">Add D-Day Milestone</h3>
              </div>
              <button
                onClick={() =>
                  setMilestoneModal((prev) => ({ ...prev, open: false }))
                }
                className="p-1 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="mt-4 space-y-4">
              <div>
                <label
                  className="block text-[11px] font-mono-num uppercase mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Milestone Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={milestoneModal.title}
                  onChange={(e) =>
                    setMilestoneModal((prev) => ({
                      ...prev,
                      title: e.target.value
                    }))
                  }
                  placeholder="e.g., v3.0 Launch, Systems Final Exam"
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-void)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-mono-num uppercase mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={milestoneModal.dateKey}
                  onChange={(e) =>
                    setMilestoneModal((prev) => ({
                      ...prev,
                      dateKey: e.target.value
                    }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono-num outline-none"
                  style={{
                    backgroundColor: 'var(--bg-void)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMilestoneModal((prev) => ({ ...prev, open: false }))
                  }
                  className="tactile-btn instrument-sub px-3.5 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tactile-btn px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-void)'
                  }}
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: DATA VAULT & JSON BACKUP MANAGER
          ==================================================================== */}
      {vaultModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setVaultModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            className="instrument-card w-full max-w-md p-6"
            style={{ boxShadow: 'var(--modal-shadow)' }}
          >
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  Focus Flow Data Vault & Persistence
                </h3>
              </div>
              <button
                onClick={() => setVaultModalOpen(false)}
                className="p-1 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="instrument-sub p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Storage Engine:
                  </span>
                  <span className="font-mono-num font-semibold text-emerald-400">
                    {user ? 'Firestore Cloud + LocalStorage' : 'LocalStorage Vault'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Saved Tasks:
                  </span>
                  <span className="font-mono-num font-bold">
                    {(workspace.tasks || []).length} tasks
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Scheduled Calendar Blocks:
                  </span>
                  <span className="font-mono-num font-bold">
                    {totalBlocksCount} blocks
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Last Auto-Save:
                  </span>
                  <span className="font-mono-num text-[11px]">
                    {lastSavedTime.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleExportJsonBackup}
                  className="tactile-btn instrument-sub p-3 flex items-center justify-center gap-2 text-xs font-semibold hover:border-indigo-500"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span>Export JSON</span>
                </button>

                <label className="tactile-btn instrument-sub p-3 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer hover:border-emerald-500">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Import JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: SETTINGS & INSTRUMENT CUSTOMIZATION STUDIO (S)
          ==================================================================== */}
      {settingsModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            className="instrument-card w-full max-w-lg p-6"
            style={{ boxShadow: 'var(--modal-shadow)' }}
          >
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div className="flex items-center gap-2">
                <SettingsIcon
                  className="w-4 h-4"
                  style={{ color: settings.accentColor || '#6366F1' }}
                />
                <h3 className="text-sm font-bold">
                  Instrument Settings & Customization
                </h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Category Tabs */}
            <div className="instrument-sub p-1 flex items-center gap-1 my-4">
              {[
                { id: 'timer', label: 'Timer & Stopwatch' },
                { id: 'calendar', label: 'Calendar & Planner' },
                { id: 'appearance', label: 'Theme & Accent' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSettingsTab(t.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    settingsTab === t.id ? 'font-semibold shadow-xs' : 'opacity-70'
                  }`}
                  style={{
                    backgroundColor:
                      settingsTab === t.id ? 'var(--bg-elevated)' : 'transparent',
                    border:
                      settingsTab === t.id
                        ? '1px solid var(--border-strong)'
                        : '1px solid transparent'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: TIMER & STOPWATCH CUSTOMIZATION */}
            {settingsTab === 'timer' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-[11px] font-mono-num uppercase mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Custom Preset Durations (Minutes)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { key: 'pomodoro', label: 'Focus' },
                      { key: 'deep', label: 'Deep Flow' },
                      { key: 'short', label: 'Short Break' },
                      { key: 'long', label: 'Long Rest' }
                    ].map((preset) => (
                      <div key={preset.key} className="instrument-sub p-2.5">
                        <div
                          className="text-[10px] font-mono-num mb-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {preset.label}
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="240"
                          value={settings.timerPresets[preset.key]}
                          onChange={(e) =>
                            updateTimerPresetDuration(preset.key, e.target.value)
                          }
                          className="w-full rounded px-2 py-1 text-sm font-mono-num font-bold outline-none"
                          style={{
                            backgroundColor: 'var(--bg-void)',
                            border: '1px solid var(--border-strong)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="instrument-sub p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">
                        Auto-Start Break Timer
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Automatically begin Short Break when Focus session completes
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoStartBreaks}
                      onChange={(e) =>
                        updateUserSetting('autoStartBreaks', e.target.checked)
                      }
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="instrument-sub p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">
                        Harmonic Completion Chime
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Play resonant Web Audio chord when timer or stopwatch logs
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundChime}
                      onChange={(e) =>
                        updateUserSetting('soundChime', e.target.checked)
                      }
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CALENDAR & DAY PLANNER CUSTOMIZATION */}
            {settingsTab === 'calendar' && (
              <div className="space-y-3.5">
                <div className="instrument-sub p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">
                      Calendar Week Start Day
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Choose whether Monthly Calendar starts on Sunday or Monday
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
                    <button
                      onClick={() => updateUserSetting('weekStartsOnMonday', false)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-num ${
                        !settings.weekStartsOnMonday
                          ? 'bg-indigo-500 text-white font-semibold'
                          : 'opacity-70'
                      }`}
                    >
                      SUN
                    </button>
                    <button
                      onClick={() => updateUserSetting('weekStartsOnMonday', true)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-num ${
                        settings.weekStartsOnMonday
                          ? 'bg-indigo-500 text-white font-semibold'
                          : 'opacity-70'
                      }`}
                    >
                      MON
                    </button>
                  </div>
                </div>

                <div className="instrument-sub p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Time Format</div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Display hours in 12-hour (AM/PM) or 24-hour military format
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
                    <button
                      onClick={() => updateUserSetting('use24Hour', false)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-num ${
                        !settings.use24Hour
                          ? 'bg-indigo-500 text-white font-semibold'
                          : 'opacity-70'
                      }`}
                    >
                      12H
                    </button>
                    <button
                      onClick={() => updateUserSetting('use24Hour', true)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-num ${
                        settings.use24Hour
                          ? 'bg-indigo-500 text-white font-semibold'
                          : 'opacity-70'
                      }`}
                    >
                      24H
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="instrument-sub p-3">
                    <label
                      className="block text-[10px] font-mono-num uppercase mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Timeline Start Hour
                    </label>
                    <select
                      value={settings.dayStartHour}
                      onChange={(e) =>
                        updateUserSetting('dayStartHour', Number(e.target.value))
                      }
                      className="w-full rounded px-2 py-1.5 text-xs font-mono-num outline-none"
                      style={{
                        backgroundColor: 'var(--bg-void)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {[4, 5, 6, 7, 8, 9, 10].map((h) => (
                        <option key={h} value={h}>
                          {formatMins12(h * 60, settings.use24Hour)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="instrument-sub p-3">
                    <label
                      className="block text-[10px] font-mono-num uppercase mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Timeline End Hour
                    </label>
                    <select
                      value={settings.dayEndHour}
                      onChange={(e) =>
                        updateUserSetting('dayEndHour', Number(e.target.value))
                      }
                      className="w-full rounded px-2 py-1.5 text-xs font-mono-num outline-none"
                      style={{
                        backgroundColor: 'var(--bg-void)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {[19, 20, 21, 22, 23, 24].map((h) => (
                        <option key={h} value={h}>
                          {h === 24
                            ? 'Midnight (24:00)'
                            : formatMins12(h * 60, settings.use24Hour)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="instrument-sub p-3">
                    <label
                      className="block text-[10px] font-mono-num uppercase mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Default Block Length
                    </label>
                    <select
                      value={settings.defaultBlockMins}
                      onChange={(e) =>
                        updateUserSetting('defaultBlockMins', Number(e.target.value))
                      }
                      className="w-full rounded px-2 py-1.5 text-xs font-mono-num outline-none"
                      style={{
                        backgroundColor: 'var(--bg-void)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1h)</option>
                      <option value={90}>90 Minutes (1.5h)</option>
                      <option value={120}>120 Minutes (2h)</option>
                    </select>
                  </div>

                  <div className="instrument-sub p-3">
                    <label
                      className="block text-[10px] font-mono-num uppercase mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Daily Capacity Target
                    </label>
                    <select
                      value={settings.dailyCapacityHours}
                      onChange={(e) =>
                        updateUserSetting(
                          'dailyCapacityHours',
                          Number(e.target.value)
                        )
                      }
                      className="w-full rounded px-2 py-1.5 text-xs font-mono-num outline-none"
                      style={{
                        backgroundColor: 'var(--bg-void)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {[8, 10, 12, 14, 16, 18].map((hrs) => (
                        <option key={hrs} value={hrs}>
                          {hrs}.0 Hours / Day
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: APPEARANCE & ACCENT COLOR */}
            {settingsTab === 'appearance' && (
              <div className="space-y-4">
                <div className="instrument-sub p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Surface Atmosphere</div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Switch between Obsidian Dark Room and Alabaster Paper
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="tactile-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--bg-void)'
                    }}
                  >
                    {isDark ? (
                      <>
                        <Moon className="w-3.5 h-3.5" />
                        <span>Obsidian Dark</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5" />
                        <span>Alabaster Light</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-mono-num uppercase mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Instrument Accent Token
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {ACCENT_THEMES.map((theme) => {
                      const active = settings.accentColor === theme.hex;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => updateUserSetting('accentColor', theme.hex)}
                          className="tactile-btn instrument-sub p-2.5 flex flex-col items-center gap-1.5"
                          style={{
                            borderColor: active
                              ? theme.hex
                              : 'var(--border-hairline)'
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-full shadow-sm"
                            style={{ backgroundColor: theme.hex }}
                          />
                          <span className="text-[10px] font-medium truncate w-full text-center">
                            {theme.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div
              className="mt-6 pt-3 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <button
                onClick={() => {
                  updateWorkspace((prev) => ({
                    ...prev,
                    settings: DEFAULT_SETTINGS
                  }));
                  showToast('Restored default instrument settings');
                }}
                className="text-xs font-mono-num opacity-70 hover:opacity-100 hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                Reset to Defaults
              </button>

              <button
                onClick={() => setSettingsModalOpen(false)}
                className="tactile-btn px-4 py-2 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: settings.accentColor || '#6366F1',
                  color: '#FFFFFF'
                }}
              >
                Done & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          COMMAND PALETTE (⌘K / Ctrl+K)
          ==================================================================== */}
      {cmdPaletteOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCmdPaletteOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            className="instrument-card w-full max-w-lg overflow-hidden"
            style={{ boxShadow: 'var(--modal-shadow)' }}
          >
            <div
              className="p-3.5 border-b flex items-center gap-3"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <input
                type="text"
                autoFocus
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Type a command or jump to view..."
                className="bg-transparent border-none outline-none text-xs flex-1"
                style={{ color: 'var(--text-primary)' }}
              />
              <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded instrument-sub">
                ESC
              </span>
            </div>

            <div className="p-2 max-h-72 overflow-y-auto space-y-1">
              {[
                {
                  label: 'Switch to Focus Studio',
                  kbd: '1',
                  run: () => setActiveView('focus')
                },
                {
                  label: 'Switch to Calendar & Day Planner',
                  kbd: '2',
                  run: () => setActiveView('calendar')
                },
                {
                  label: 'Switch to Time Management & Capacity',
                  kbd: '3',
                  run: () => setActiveView('timemgmt')
                },
                {
                  label: 'Toggle Persistent Spotify Sonic Deck',
                  kbd: 'M',
                  run: () => setSpotifyDrawerOpen((p) => !p)
                },
                {
                  label: 'Open Settings & Customization Studio',
                  kbd: 'S',
                  run: () => setSettingsModalOpen(true)
                },
                {
                  label: 'Switch Focus Studio to Stopwatch Mode',
                  kbd: 'Stopwatch',
                  run: () => {
                    setActiveView('focus');
                    setClockEngine('stopwatch');
                  }
                },
                {
                  label: 'Schedule New Time Block on Selected Date',
                  kbd: 'N',
                  run: () => openNewBlockModal(Math.max(startHour * 60, 9 * 60))
                },
                {
                  label: 'Auto-Schedule Open Tasks into Free Slots',
                  kbd: 'Auto',
                  run: () => handleAutoScheduleOpenTasks()
                },
                {
                  label: 'Open Data Vault & Export JSON Backup',
                  kbd: 'Vault',
                  run: () => setVaultModalOpen(true)
                },
                {
                  label: 'Toggle Obsidian Dark / Alabaster Daylight Mode',
                  kbd: 'Theme',
                  run: () => toggleTheme()
                }
              ]
                .filter((c) =>
                  c.label.toLowerCase().includes(cmdQuery.toLowerCase().trim())
                )
                .map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCmdPaletteOpen(false);
                      cmd.run();
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between hover:bg-indigo-500/15 text-xs"
                  >
                    <span>{cmd.label}</span>
                    <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded instrument-sub">
                      {cmd.kbd}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SONNER-STYLE TOAST WITH OPTIONAL UNDO
          ==================================================================== */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50">
          <div
            className="instrument-card px-4 py-2.5 flex items-center gap-3 border"
            style={{
              borderColor: 'var(--border-strong)',
              boxShadow: 'var(--modal-shadow)'
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium">{toast.message}</span>
            {toast.undoAction && (
              <button
                onClick={() => {
                  toast.undoAction();
                  setToast(null);
                }}
                className="text-xs font-mono-num font-semibold text-indigo-400 hover:underline flex items-center gap-1 ml-2"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}