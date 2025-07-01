import { useEffect, useRef, useState } from 'react'
import './App.css'
import HelpModal from './HelpModal'; // Import the new modal component
import CliDisplay from './CliDisplay'; // Import the new CLI component
import {
  ShareIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon, // Import the icon for the help button
} from '@heroicons/react/24/solid'
import {
  initialTutorialState,
  getDialogForStage,
  shouldAdvanceStage,
  nextStage,
} from './StoryMode';
import type { TutorialState } from './StoryMode';

const BLOCK_SIZE = 50
const NORMAL_FALL_SPEED = 0.5; // pixels per frame
const BUG_FALL_SPEED = 0.75;  // bugs fall 50% faster
const BASE_SPAWN_INTERVAL = 4800; // ms
const MIN_SPAWN_INTERVAL = 900; // ms
const MERGE_ANIMATION_DURATION = 350; // ms

// Virtual game area for consistent gameplay
const VIRTUAL_WIDTH = 450;
const VIRTUAL_HEIGHT = 900;

// Define Task type
interface Task {
  id: number
  x: number // will be calculated from lane
  y: number
  action: string
  type: 'feature' | 'bug' | 'traffic'
  requiredActions: string[]
  progress: number // how many actions have been completed
  lane: number // 0 = production, 1+ = branches
  branchColor: string // color for the branch line
  fadingBranch?: boolean // for merge animation
  isMergingBack?: boolean // new: for merge animation
  totalClicks?: number; // Total clicks needed for CODE tasks
  clicks?: number;      // Current clicks for CODE tasks
  lastClickTime?: number; // For rapid click check
  isBuilding?: boolean; // For the build/merge cooldown
}

// BranchLine type for true git-branch effect
interface BranchLine {
  id: number
  fromLane: number
  toLane: number
  color: string
  branchY: number
  currentY: number
  mergeY: number | null
  opacity?: number
  fading?: boolean
  speed: number // new: each branch has its own scroll speed
}

const BRANCH_COLORS = ['#7c3aed', '#22d3ee', '#facc15', '#ef4444', '#10b981', '#f472b6']
const LANE_WIDTH = 60 // px, horizontal distance between lanes
const LANE_START_X = 32 // px, left margin for production lane

// Helper to get a random task type and its required actions
function getRandomTaskTypeAndActions(): Omit<Task, 'id' | 'x' | 'y' | 'action' | 'progress' | 'lane' | 'branchColor'> {
    // Define the shape of our task templates
    const types: Array<{
        type: 'feature' | 'bug' | 'traffic';
        requiredActions: string[];
        totalClicks?: number;
    }> = [
        // Add more instances of feature and bug to make them more common
        { type: 'feature', requiredActions: ['BRANCH', 'CODE', 'MERGE'], totalClicks: Math.floor(Math.random() * 9) + 2 },
        { type: 'feature', requiredActions: ['BRANCH', 'CODE', 'MERGE'], totalClicks: Math.floor(Math.random() * 9) + 2 },
        { type: 'bug', requiredActions: ['BRANCH', 'CODE', 'MERGE'], totalClicks: Math.floor(Math.random() * 9) + 2 },
        { type: 'bug', requiredActions: ['BRANCH', 'CODE', 'MERGE'], totalClicks: Math.floor(Math.random() * 9) + 2 },
        { type: 'traffic', requiredActions: ['METRICS', Math.random() < 0.5 ? 'SCALE UP' : 'SCALE DOWN'] },
    ];
    const idx = Math.floor(Math.random() * types.length);
    return types[idx];
}

// Helper to convert hex to rgba for the color fade effect
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getLaneX(lane: number) {
  return LANE_START_X + lane * LANE_WIDTH;
}

function getNextAvailableLane(tasks: Task[]): number {
  // Only consider lanes of active (not completed) tasks
  const lanes = tasks.map(t => t.lane)
  let lane = 1
  while (lanes.includes(lane)) lane++
  return lane
}

function App() {
  // Each task: { id, x, y, action, type, requiredActions, progress }
  const [tasks, setTasks] = useState<Task[]>([])
  const [isRunning, setIsRunning] = useState(false); // Game doesn't start automatically
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [spawnInterval, setSpawnInterval] = useState(BASE_SPAWN_INTERVAL);
  const gameRef = useRef<HTMLDivElement>(null)
  const nextTaskId = useRef(0)
  const [animatingTaskId, setAnimatingTaskId] = useState<number | null>(null)
  const [branchLines, setBranchLines] = useState<BranchLine[]>([])
  
  // New state for Profile Boost
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [profileCooldown, setProfileCooldown] = useState(false);
  const [profileTimer, setProfileTimer] = useState(0);
  const profileIntervalRef = useRef<number | null>(null);

  // New state for Help Modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const wasRunningBeforeModal = useRef(false);

  // New state for Difficulty
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');

  // New state to track if the game has started
  const [gameHasStarted, setGameHasStarted] = useState(false);

  // New state for the fake CLI
  const [cliLines, setCliLines] = useState<string[]>(['Welcome to upsun.run!']);
  
  // Helper to add lines to the CLI output, keeping the full history
  const addCliLines = (newLines: string[]) => {
    setCliLines(prevLines => [...prevLines, ...newLines]);
  };

  // Helper to animate CLI output line by line
  const animateCliLines = async (lines: string[], delay: number = 200) => {
    for (const line of lines) {
      addCliLines([line]);
       
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  };

  // New state for game area size
  const [gameAreaSize, setGameAreaSize] = useState({ width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT });

  // Calculate scale factor for rendering
  useEffect(() => {
    function updateSize() {
      if (gameRef.current) {
        const rect = gameRef.current.getBoundingClientRect();
        // Fit to aspect ratio, but never exceed VIRTUAL_WIDTH/VIRTUAL_HEIGHT
        const width = rect.width;
        const height = rect.height;
        setGameAreaSize({ width, height });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const scaleX = gameAreaSize.width / VIRTUAL_WIDTH;
  const scaleY = gameAreaSize.height / VIRTUAL_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  // Effect to pause game when modal opens and manage body class for scrolling
  useEffect(() => {
    if (isHelpModalOpen) {
      document.body.classList.add('modal-open');
      wasRunningBeforeModal.current = isRunning;
      setIsRunning(false);
    } else {
      document.body.classList.remove('modal-open');
      // Only resume if the game was running before the modal was opened
      if (wasRunningBeforeModal.current) {
        setIsRunning(true);
      }
    }
  }, [isHelpModalOpen, isRunning]);

  // New, robust useEffect for managing the profile boost timer
  useEffect(() => {
    // Don't run timers if the game is paused
    if (!isRunning) {
      if (profileIntervalRef.current) clearInterval(profileIntervalRef.current);
      return;
    }

    // Timer is active
    if (profileTimer > 0) {
      profileIntervalRef.current = window.setInterval(() => {
        setProfileTimer((t) => t - 1);
      }, 1000);
    } else { // Timer reached 0, transition to the next state
      if (isProfileActive) {
        // Boost ended, start cooldown
        setIsProfileActive(false);
        setProfileCooldown(true);
        setProfileTimer(10); // Reset timer for cooldown
      } else if (profileCooldown) {
        // Cooldown ended
        setProfileCooldown(false);
        // Only increment profiler progress after first cooldown in stage 3
        setTutorial((s: TutorialState) => {
          if (
            s.mode &&
            s.stage === 3 &&
            !s.profilerCycleComplete &&
            s.progress.profiler === 0
          ) {
            return {
              ...s,
              progress: { ...s.progress, profiler: 1 },
              profilerCycleComplete: true,
            };
          }
          return s;
        });
      }
    }

    // Cleanup: clear the interval when the component unmounts or dependencies change
    return () => {
      if (profileIntervalRef.current) {
        clearInterval(profileIntervalRef.current);
      }
    };
  }, [isRunning, profileTimer, isProfileActive, profileCooldown]);

  // Decrease spawn interval every 10 points
  useEffect(() => {
    const decrease = Math.floor(score / 10);
    let newInterval = BASE_SPAWN_INTERVAL * Math.pow(0.9, decrease); // 10% faster every 10 points
    if (newInterval < MIN_SPAWN_INTERVAL) newInterval = MIN_SPAWN_INTERVAL;
    setSpawnInterval(newInterval);
  }, [score]);

  // Animate falling tasks and scrolling branch lines
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      // 1. "Paper moves up": All existing branch lines scroll up based on their individual speed
      setBranchLines((lines) =>
        lines.map((line) => ({
          ...line,
          branchY: line.branchY - line.speed,
          currentY: line.currentY - line.speed,
          mergeY: line.mergeY !== null ? line.mergeY - line.speed : null,
          opacity: line.opacity !== undefined ? Math.max(0, line.opacity - 0.001) : 1,
        })).filter(line => (line.mergeY || line.currentY) > -50 && line.opacity > 0)
      )

      // 2. "Pen draws down": Tasks fall at different speeds
      setTasks((prevTasks) => {
        const gameHeight = gameRef.current?.clientHeight || 500
        const movedTasks = prevTasks.map((task) => {
          // Task now falls even while building
          const speed = task.type === 'bug' ? BUG_FALL_SPEED : NORMAL_FALL_SPEED;
          return { ...task, y: task.y + speed };
        });

        // 3. Re-peg the end of active lines to their tasks
        setBranchLines((currentLines) =>
          currentLines.map((line) => {
            const task = movedTasks.find((t) => t.id === line.id)
            if (task && line.mergeY === null) {
              return { ...line, currentY: task.y + BLOCK_SIZE / 2 }
            }
            return line
          })
        )

        // Check for game over
        const hitBottom = movedTasks.some((task) => task.y + BLOCK_SIZE >= gameHeight)
        if (hitBottom) {
          setIsRunning(false)
          setGameOver(true)
          return movedTasks.map((task) => ({ ...task, y: Math.min(task.y, gameHeight - BLOCK_SIZE) }))
        }
        return movedTasks
      })
    }, 16)
    return () => clearInterval(interval)
  }, [isRunning])

  // Story mode state (single object)
  const [tutorial, setTutorial] = useState<TutorialState>(() => {
    // Check localStorage for tutorial completion
    if (typeof window !== 'undefined' && localStorage.getItem('tutorialCompleted') === 'true') {
      return { ...initialTutorialState, mode: false, dialog: null, paused: false };
    }
    return initialTutorialState;
  });

  // Track if the game was running before story dialog
  const wasRunningBeforeStory = useRef(false);

  // Story mode: control which tasks spawn
  useEffect(() => {
    if (!isRunning || (tutorial.mode && tutorial.paused)) return;
    const currentSpawnInterval = difficulty === 'hard' ? spawnInterval / 2 : spawnInterval;
    const interval = setInterval(() => {
      setTasks((prev) => {
        let type: 'feature' | 'bug' | 'traffic' = 'feature';
        let requiredActions: string[] = ['BRANCH', 'CODE', 'MERGE'];
        let totalClicks = Math.floor(Math.random() * 9) + 2;
        if (tutorial.mode) {
          if (tutorial.stage === 1) {
            // Only features
            type = 'feature';
            requiredActions = ['BRANCH', 'CODE', 'MERGE'];
          } else if (tutorial.stage === 2) {
            // Features and bugs
            type = Math.random() < 0.5 ? 'feature' : 'bug';
            requiredActions = ['BRANCH', 'CODE', 'MERGE'];
          } else if (tutorial.stage === 3) {
            // Features, bugs, profiler enabled
            type = Math.random() < 0.5 ? 'feature' : 'bug';
            requiredActions = ['BRANCH', 'CODE', 'MERGE'];
          } else if (tutorial.stage === 4) {
            // All types
            const r = Math.random();
            if (r < 0.4) {
              type = 'feature';
              requiredActions = ['BRANCH', 'CODE', 'MERGE'];
            } else if (r < 0.7) {
              type = 'bug';
              requiredActions = ['BRANCH', 'CODE', 'MERGE'];
            } else {
              type = 'traffic';
              requiredActions = ['METRICS', Math.random() < 0.5 ? 'SCALE UP' : 'SCALE DOWN'];
            }
          }
        } else {
          // Normal game
          const t = getRandomTaskTypeAndActions();
          type = t.type;
          requiredActions = t.requiredActions;
          totalClicks = t.totalClicks || totalClicks;
        }
        return [
          ...prev,
          {
            id: nextTaskId.current++,
            x: getLaneX(0),
            y: 0,
            action: requiredActions[0],
            type,
            requiredActions,
            progress: 0,
            lane: 0,
            branchColor: BRANCH_COLORS[0],
            totalClicks: totalClicks,
            clicks: 0,
          },
        ];
      });
    }, currentSpawnInterval);
    return () => clearInterval(interval);
  }, [isRunning, difficulty, spawnInterval, tutorial.mode, tutorial.stage, tutorial.paused]);

  // Tutorial mode: track progress and advance stages
  useEffect(() => {
    if (!tutorial.mode) return;
    if (shouldAdvanceStage(tutorial.stage, tutorial.progress)) {
      const next = nextStage(tutorial.stage);
      setTutorial((s: TutorialState) => ({
        ...s,
        paused: true,
        dialog: getDialogForStage(next),
        stage: next,
      }));
    }
  }, [tutorial.stage, tutorial.progress, tutorial.mode]);

  // Pause/resume game when tutorial dialog opens/closes
  useEffect(() => {
    if (!tutorial.mode) return;
    if (tutorial.dialog) {
      wasRunningBeforeStory.current = isRunning;
      setIsRunning(false);
    } else if (!tutorial.dialog && tutorial.paused === false && wasRunningBeforeStory.current) {
      setIsRunning(true);
    }
  }, [tutorial.dialog, tutorial.mode, tutorial.paused, isRunning]);

  // Tutorial mode: handle dialog continue
  const handleTutorialContinue = () => {
    if (tutorial.stage === 5) {
      setTutorial((s: TutorialState) => ({ ...s, mode: false, dialog: null, paused: false }));
      setIsRunning(true);
      return;
    }
    setTutorial((s: TutorialState) => ({ ...s, dialog: null, paused: false }));
    setIsRunning(true);
  };

  // Reset game
  const handleReset = () => {
    setTasks([])
    setIsRunning(true)
    setGameOver(false)
    nextTaskId.current = 0
    setScore(0)
    setBranchLines([]) // clear all branch lines
  }

  // New: Handle starting the game for the first time
  const handleStartGame = () => {
    setGameHasStarted(true);
    setIsRunning(true);
  };

  // Red glow state for wrong action
  const [wrongGlow, setWrongGlow] = useState(false);

  // Handle action button press
  const handleAction = (action: string) => {
    // In story mode, pause input if dialog is up
    if (tutorial.mode && tutorial.paused) return;

    if (!isRunning) return;

    // --- Handle Profile Boost Activation (must be checked before finding a task) ---
    if (action === 'PROFILE') {
      if (!isProfileActive && !profileCooldown) {
        setIsProfileActive(true);
        setProfileTimer(10); // Start the 10-second timer
      }
      return; // Profile action is handled, exit.
    }

    // Find the first task that is not building
    const taskIndex = tasks.findIndex((task) => !task.isBuilding && task.requiredActions[task.progress] === action);
    // If no matching task, penalize the player (but ignore CODE action)
    if (taskIndex === -1) {
      if (action !== 'CODE') {
        setWrongGlow(true);
        setTimeout(() => setWrongGlow(false), 300);
      }
      return;
    }
    // Reset wrong glow on any correct action
    setWrongGlow(false);

    // Story mode: track progress
    if (tutorial.mode) {
      if (tutorial.stage === 1 && action === 'MERGE') {
        setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, features: s.progress.features + 1 } }));
      } else if (tutorial.stage === 2) {
        if (action === 'MERGE' && tasks[taskIndex].type === 'feature') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, features: s.progress.features + 1 } }));
        } else if (action === 'MERGE' && tasks[taskIndex].type === 'bug') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, bugs: s.progress.bugs + 1 } }));
        }
      } else if (tutorial.stage === 3) {
        if (action === 'MERGE' && tasks[taskIndex].type === 'feature') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, features: s.progress.features + 1 } }));
        } else if (action === 'MERGE' && tasks[taskIndex].type === 'bug') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, bugs: s.progress.bugs + 1 } }));
        }
      } else if (tutorial.stage === 4) {
        if (action === 'MERGE' && tasks[taskIndex].type === 'feature') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, features: s.progress.features + 1 } }));
        } else if (action === 'MERGE' && tasks[taskIndex].type === 'bug') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, bugs: s.progress.bugs + 1 } }));
        } else if (action === 'PROFILE') {
          setTutorial((s: TutorialState) => s.progress.profiler === 0 ? { ...s, progress: { ...s.progress, profiler: 1 } } : s);
        } else if ((action === 'SCALE UP' || action === 'SCALE DOWN') && tasks[taskIndex].type === 'traffic') {
          setTutorial((s: TutorialState) => ({ ...s, progress: { ...s.progress, infra: s.progress.infra + 1 } }));
        }
      }
    }

    const task = tasks[taskIndex];

    // --- Cooldown Logic for BRANCH, MERGE, SCALE, and METRICS ---
    if (action === 'BRANCH' || action === 'MERGE' || action === 'SCALE UP' || action === 'SCALE DOWN' || action === 'METRICS') {
      // 1. Immediately set the building state for UI feedback
      setTasks(current => current.map(t => t.id === task.id ? { ...t, isBuilding: true } : t));
      
      // 2. Animate realistic CLI lines for the action
      if (action === 'BRANCH') {
        const branchLines = [
          `upsun environment:branch feature-${task.id}`,
          'Validating submodules',
          'Validating configuration files',
          'Configuring resources',
          `  Using resources from environment 'main'`,
          `Building application 'app' (runtime type: nodejs:20)` ,
          'Generating runtime configuration.',
          'Executing build hook...',
          `added ${Math.floor(Math.random()*200+50)} packages, and audited ${Math.floor(Math.random()*200+100)} packages in 4s`,
          'found 0 vulnerabilities',
        ];
        animateCliLines(branchLines).then(() => {
          setTimeout(() => {
            addCliLines(['Success.']);
            setTasks(current => {
              const idx = current.findIndex(t => t.id === task.id);
              if (idx === -1) return current;
              const updated = [...current];
              const taskToUpdate = updated[idx];
              const newProgress = taskToUpdate.progress + 1;
              const isComplete = newProgress >= taskToUpdate.requiredActions.length;
              let newTask = { 
                ...taskToUpdate,
                progress: newProgress, 
                action: isComplete ? '' : taskToUpdate.requiredActions[newProgress],
                isBuilding: false
              };
              const nextLane = getNextAvailableLane(updated);
              newTask = {
                ...newTask,
                lane: nextLane,
                x: getLaneX(nextLane),
                branchColor: BRANCH_COLORS[nextLane % BRANCH_COLORS.length],
              };
              setBranchLines((lines) => [...lines, {
                id: taskToUpdate.id,
                fromLane: 0,
                toLane: nextLane,
                color: newTask.branchColor,
                branchY: taskToUpdate.y + BLOCK_SIZE / 2,
                mergeY: null,
                currentY: taskToUpdate.y + BLOCK_SIZE / 2,
                opacity: 1,
                speed: taskToUpdate.type === 'bug' ? BUG_FALL_SPEED : NORMAL_FALL_SPEED,
              }]);
              if (isComplete) {
                updated.splice(idx, 1);
                setScore((s) => s + (difficulty === 'hard' ? 2 : 1));
              } else {
                updated[idx] = newTask;
              }
              return updated;
            });
          }, 500);
        });
        return;
      } else if (action === 'MERGE') {
        const mergeLines = [
          `upsun environment:merge feature-${task.id}`,
          'Validating submodules',
          'Validating configuration files',
          'Configuring resources',
          `  Using resources from environment 'main'`,
          `Deploying application 'app' (runtime type: nodejs:20)` ,
          'Generating runtime configuration.',
          'Executing deploy hook...',
        ];
        animateCliLines(mergeLines).then(() => {
          setTimeout(() => {
            addCliLines(['Success.']);
            setTasks(current => {
              const idx = current.findIndex(t => t.id === task.id);
              if (idx === -1) return current;
              const updated = [...current];
              const taskToUpdate = updated[idx];
              const newProgress = taskToUpdate.progress + 1;
              const isComplete = newProgress >= taskToUpdate.requiredActions.length;
              let newTask = { 
                ...taskToUpdate,
                progress: newProgress, 
                action: isComplete ? '' : taskToUpdate.requiredActions[newProgress],
                isBuilding: false
              };
              const mergeYPos = taskToUpdate.y + BLOCK_SIZE / 2;
              newTask = {
                ...newTask,
                lane: 0,
                x: getLaneX(0),
                isMergingBack: true,
              };
              setBranchLines((lines) =>
                lines.map((line) =>
                  line.id === taskToUpdate.id && line.mergeY === null ? { ...line, mergeY: mergeYPos, currentY: mergeYPos } : line
                )
              );
              if (isComplete) {
                updated[idx] = newTask;
                setTimeout(() => {
                  setTasks((current) => current.filter((t) => t.id !== taskToUpdate.id));
                  setScore((s) => s + (difficulty === 'hard' ? 2 : 1));
                }, MERGE_ANIMATION_DURATION);
              } else {
                updated[idx] = newTask;
              }
              return updated;
            });
          }, 500);
        });
        return;
      } else {
        // SCALE UP, SCALE DOWN, METRICS: keep as before
        switch(action) {
          case 'SCALE UP': addCliLines(['upsun resources:set --count frontend:6', 'Scaling resources...']); break;
          case 'SCALE DOWN': addCliLines(['upsun resources:set --count frontend:3', 'Scaling resources...']); break;
          case 'METRICS': addCliLines(['upsun metrics:all --live', 'Analyzing metrics...']); break;
        }
        setTimeout(() => {
          addCliLines(['Success.']);
          setTasks(current => {
            const idx = current.findIndex(t => t.id === task.id);
            if (idx === -1) return current;
            const updated = [...current];
            const taskToUpdate = updated[idx];
            const newProgress = taskToUpdate.progress + 1;
            const isComplete = newProgress >= taskToUpdate.requiredActions.length;
            const newTask = { 
              ...taskToUpdate,
              progress: newProgress, 
              action: isComplete ? '' : taskToUpdate.requiredActions[newProgress],
              isBuilding: false
            };
            if (isComplete) {
              updated.splice(idx, 1);
              setScore((s) => s + (difficulty === 'hard' ? 2 : 1));
            } else {
              updated[idx] = newTask;
            }
            return updated;
          });
        }, 1000);
        return;
      }
    }

    // --- Logic for non-cooldown actions (e.g., CODE) ---
    setTasks((prev) => {
      const idx = prev.findIndex((task) => task.requiredActions[task.progress] === action);
      if (idx === -1) return prev; // Should not happen due to outer check, but good practice

      const updated = [...prev];
      let task = { ...updated[idx] };
      
      setAnimatingTaskId(task.id);
      setTimeout(() => setAnimatingTaskId(null), 200);

      if (action === 'CODE' && task.totalClicks && task.clicks !== undefined) {
        const now = Date.now();
        const newClickCount = (task.lastClickTime && now - task.lastClickTime > 1000) ? 1 : task.clicks + 1;
        
        const requiredClicks = isProfileActive ? Math.ceil(task.totalClicks / 2) : task.totalClicks;

        if (newClickCount >= requiredClicks) {
          const newProgress = task.progress + 1;
          const isComplete = newProgress >= task.requiredActions.length;
          task = { 
            ...task, 
            progress: newProgress,
            clicks: newClickCount,
            action: isComplete ? '' : task.requiredActions[newProgress] 
          };
        } else {
          task = { ...task, clicks: newClickCount, lastClickTime: now };
        }
        updated[idx] = task;
        return updated;
      }
      
      const newProgress = task.progress + 1;
      const isComplete = newProgress >= task.requiredActions.length;
      const newTask = { ...task, progress: newProgress, action: isComplete ? '' : task.requiredActions[newProgress] };

      // Handle task completion for non-merge, non-branch actions
      if (isComplete) {
        updated.splice(idx, 1);
        setScore((s) => s + (difficulty === 'hard' ? 2 : 1));
      } else {
        updated[idx] = newTask;
      }

      return updated;
    });
  };

  // Calculate the number of lanes to render lines for
  const maxLane = Math.max(0, ...tasks.map(t => t.lane))

  // A single, correct function for the entire git-branch line path.
  function getBranchLinePath(line: BranchLine) {
    const prodX = getLaneX(line.fromLane) + BLOCK_SIZE / 2;
    const devX = getLaneX(line.toLane) + BLOCK_SIZE / 2;
    const radius = 16;
    
    const verticalEndY = line.mergeY !== null ? line.mergeY : line.currentY;

    // 1. Start at production lane at the branch point
    const path = [
      `M${prodX},${line.branchY}`
    ];

    // 2. Horizontal line to the start of the curve
    path.push(`H${devX - radius}`);

    // 3. 90-degree curve down-right
    path.push(`A${radius},${radius} 0 0,1 ${devX},${line.branchY + radius}`);
    
    // 4. Vertical line down the dev lane
    path.push(`V${verticalEndY - radius}`);

    // 5. If merged, add the mirrored merge-back curve and line
    if (line.mergeY !== null) {
      // Curve down-left (using sweep-flag 1 for the correct mirrored arc)
      path.push(`A${radius},${radius} 0 0,1 ${devX - radius},${verticalEndY}`);
      // Horizontal line back to production
      path.push(`H${prodX}`);
    }

    return path.join(' ');
  }

  const iconMap: { [key: string]: { icon: React.ElementType, color?: string } } = {
    BRANCH: { icon: ShareIcon },
    MERGE: { icon: ArrowsRightLeftIcon },
    'SCALE UP': { icon: ArrowTrendingUpIcon, color: '#10b981' },
    'SCALE DOWN': { icon: ArrowTrendingDownIcon, color: '#ef4444' },
    METRICS: { icon: ChartBarIcon },
    PROFILE: { icon: UserCircleIcon },
  }

  // Show the full CLI history in the background, building up from the bottom
  const bgLines = cliLines;

  // Track if tutorial has been completed
  const [tutorialCompleted, setTutorialCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutorialCompleted') === 'true';
    }
    return false;
  });

  // When tutorial is skipped or completed, set localStorage
  useEffect(() => {
    if (!tutorial.mode) {
      setTutorialCompleted(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tutorialCompleted', 'true');
      }
    }
  }, [tutorial.mode]);

  return (
    <div className="game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      {/* Story Mode Dialog */}
      {tutorial.mode && tutorial.dialog && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
            <h2>Tutorial Mode</h2>
            {tutorial.dialog}
            <div style={{ marginTop: 16 }}>
              <button className="restart-btn" onClick={handleTutorialContinue}>Continue</button>
              {/* Skip tutorial button only on first dialog */}
              {tutorial.stage === 1 && (
                <button
                  className="restart-btn"
                  style={{ marginLeft: 8, background: '#444', color: '#fff', border: '1px solid #888' }}
                  onClick={() => {
                    setTutorial((s: TutorialState) => ({ ...s, mode: false, dialog: null, paused: false }));
                    setIsRunning(true);
                  }}
                >
                  Skip tutorial
                </button>
              )}
            </div>
            {/* For testing: skip stage link in every dialog */}
            <div style={{ marginTop: 8 }}>
              <a
                href="#"
                style={{ color: '#7c3aed', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}
                onClick={(e) => {
                  e.preventDefault();
                  const next = nextStage(tutorial.stage);
                  setTutorial((s: TutorialState) => ({
                    ...s,
                    paused: true,
                    dialog: getDialogForStage(next),
                    stage: next,
                  }));
                }}
              >
                Skip this stage
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Game Title at the very top */}
      <div className="game-title-top two-row-header">
        <div className="header-controls-row centered-controls">
          <button 
            className="difficulty-btn sleek-btn"
            onClick={() => setDifficulty(d => d === 'easy' ? 'hard' : 'easy')}
            disabled={tasks.length > 0 && !gameOver}
          >
            {difficulty === 'easy' ? 'Easy' : 'Hard'} Mode
          </button>
          {tutorialCompleted && !tutorial.mode && (
            <button
              className="restart-btn sleek-btn"
              onClick={() => {
                setTutorial({ ...initialTutorialState });
                setIsRunning(false);
              }}
            >
              Show Tutorial
            </button>
          )}
          <button onClick={() => setIsHelpModalOpen(true)} className="header-btn sleek-btn">
            <QuestionMarkCircleIcon />
          </button>
          <button
            onClick={() => setIsRunning((r) => !r)}
            className={`header-btn sleek-btn ${!isRunning ? 'resume-btn' : ''}`}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>
        <div className="header-title-row">
          <div className="header-title">
            Upsun <span style={{ fontWeight: 700, letterSpacing: 1 }}>Run</span>
          </div>
      </div>
      </div>
      {/* Centered game area and score */}
      <div className="game-content">
        <div className="game-score">Score: {score}</div>
      <div
        ref={gameRef}
          className={`game-area${isProfileActive ? ' profile-active' : ''}${wrongGlow ? ' wrong-glow' : ''}`}
          style={{ position: 'relative' }}
        >
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: 'top left', width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <CliDisplay lines={bgLines} isBackground />
            {/* SVG for branch lines */}
            <svg
              width={VIRTUAL_WIDTH}
              height={VIRTUAL_HEIGHT}
              style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 0 }}
            >
              {branchLines.map((line) => (
                <path
                  key={line.id}
                  d={getBranchLinePath(line)}
                  stroke={line.color}
                  strokeWidth={6}
                  fill="none"
                  opacity={line.opacity !== undefined ? line.opacity : 0.7}
                  style={{ transition: 'opacity 0.3s' }}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            {/* Render branch/production lines for each lane (background, optional) */}
            {Array.from({ length: maxLane + 1 }).map((_, laneIdx) => {
              const taskInLane = tasks.find(t => t.lane === laneIdx)
              const color = taskInLane ? taskInLane.branchColor : BRANCH_COLORS[laneIdx % BRANCH_COLORS.length]
              return (
                <div
                  key={laneIdx}
        style={{
                    position: 'absolute',
                    left: getLaneX(laneIdx) + BLOCK_SIZE / 2 - 4,
                    top: 0,
                    width: 8,
                    height: VIRTUAL_HEIGHT,
                    background: color,
                    borderRadius: 4,
                    opacity: 0.15,
                    zIndex: 0,
                  }}
                />
              )
            })}
        {/* Render all falling tasks */}
            {tasks.map((task) => {
              const style: React.CSSProperties = {
                left: getLaneX(task.lane),
                top: task.y,
                zIndex: 1,
              };
              const isCodeTask = task.requiredActions[task.progress] === 'CODE' && task.totalClicks && task.clicks !== undefined;
              if (isCodeTask) {
                const color = task.type === 'feature' ? '#10b981' : '#ef4444';
                const alpha = 0.2 + (task.clicks! / task.totalClicks!) * 0.8;
                style.backgroundColor = hexToRgba(color, alpha);
              }
              if (task.type === 'traffic') {
                const currentAction = task.requiredActions[task.progress];
                const actionInfo = iconMap[currentAction];
                if (currentAction.startsWith('SCALE') && actionInfo?.color) {
                  style.backgroundColor = actionInfo.color;
                } else {
                  style.backgroundColor = '#2563eb';
                }
              }
              const isBuilding = task.isBuilding;
              const currentAction = task.requiredActions[task.progress];
              return (
          <div
            key={task.id}
                  className={`task-block ${task.type} ${task.type === 'traffic' ? currentAction : ''} ${animatingTaskId === task.id ? 'task-animating' : ''} ${isBuilding ? 'task-building' : ''}`}
                  style={style}
                >
                  <div className="task-type">{task.type.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isBuilding && currentAction === 'BRANCH' && 'BUILDING...'}
                    {isBuilding && currentAction === 'MERGE' && 'MERGING...'}
                    {isBuilding && (currentAction === 'SCALE UP' || currentAction === 'SCALE DOWN') && 'SCALING...'}
                    {isBuilding && currentAction === 'METRICS' && 'ANALYZING...'}
                    {!isBuilding && (() => {
                      const actionInfo = iconMap[currentAction];
                      if (actionInfo && (currentAction.startsWith('SCALE'))) {
                        const Icon = actionInfo.icon;
                        return (
                          <>
                            <Icon className="task-action-icon" />
                            <span>{currentAction}</span>
                          </>
                        )
                      }
                      return currentAction;
                    })()}
                  </div>
                  {/* Hide progress text for multi-click CODE tasks and building tasks */}
                  {!isCodeTask && !isBuilding && (
                    <div className="task-progress">{task.progress+1}/{task.requiredActions.length}</div>
                  )}
          </div>
              )
            })}
          </div>
          {/* Move the action buttons OUTSIDE the scaled/absolute div, as the last child of .game-area */}
          <div className="action-buttons-container flex-action-row">
            <div className="action-grid">
              <div className="action-row">
                {['SCALE UP', 'METRICS', 'BRANCH'].map((action) => {
                  const Icon = iconMap[action].icon;
                  return (
          <button
            key={action}
                      className={`hex-btn ${action === 'SCALE UP' ? 'scale-up-btn' : ''}`}
            disabled={!isRunning}
            onClick={() => handleAction(action)}
          >
                      <Icon className="btn-icon" />
            {action}
          </button>
                  )
                })}
              </div>
              <div className="action-row">
                {['SCALE DOWN', 'PROFILE', 'MERGE'].map((action) => {
                  const Icon = iconMap[action].icon;
                  const isProfileButton = action === 'PROFILE';
                  const isProfileDisabled = isProfileActive || profileCooldown;
                  return (
                    <button
                      key={action}
                      className={`hex-btn ${
                        action === 'SCALE DOWN' ? 'scale-down-btn' : ''
                      } ${
                        isProfileButton && isProfileActive ? 'profile-active-btn' : ''
                      }`}
                      disabled={!isRunning || (isProfileButton && isProfileDisabled)}
                      onClick={() => handleAction(action)}
                    >
                      <Icon className="btn-icon" />
                      {isProfileButton && (isProfileActive || profileCooldown) ? `${profileTimer}s` : action}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="code-btn-wrapper">
              <button
                className="code-btn"
                disabled={!isRunning}
                onClick={() => handleAction('CODE')}
              >
                CODE
              </button>
            </div>
          </div>
          {gameOver && (
            <div className="game-over">
              Game Over<br />
              <button onClick={handleReset} className="restart-btn">Restart</button>
            </div>
          )}
          {!gameHasStarted && !gameOver && (
            <div className="game-over">
              <button onClick={handleStartGame} className="restart-btn">Start Game</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
