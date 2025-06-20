import { useEffect, useRef, useState } from 'react'
import './App.css'

const BLOCK_SIZE = 50
const FALL_SPEED = 0.5 // pixels per frame
const SPAWN_INTERVAL = 4800 // ms
const MERGE_ANIMATION_DURATION = 350; // ms

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
}

const BRANCH_COLORS = ['#7c3aed', '#22d3ee', '#facc15', '#ef4444', '#10b981', '#f472b6']
const LANE_WIDTH = 60 // px, horizontal distance between lanes
const LANE_START_X = 32 // px, left margin for production lane

// Helper to get a random task type and its required actions
function getRandomTaskTypeAndActions(): { type: 'feature' | 'bug' | 'traffic'; requiredActions: string[] } {
  const types: { type: 'feature' | 'bug' | 'traffic'; requiredActions: string[] }[] = [
    { type: 'feature', requiredActions: ['BRANCH', 'CODE', 'MERGE'] },
    { type: 'bug', requiredActions: ['BRANCH', 'CODE', 'CODE', 'MERGE'] },
    { type: 'traffic', requiredActions: ['METRICS', 'SCALE'] },
  ]
  const idx = Math.floor(Math.random() * types.length)
  return types[idx]
}

function getLaneX(lane: number) {
  return LANE_START_X + lane * LANE_WIDTH
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
  const [isRunning, setIsRunning] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const gameRef = useRef<HTMLDivElement>(null)
  const nextTaskId = useRef(0)
  const [animatingTaskId, setAnimatingTaskId] = useState<number | null>(null)
  const [branchLines, setBranchLines] = useState<BranchLine[]>([])

  // Animate falling tasks and scrolling branch lines
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      // 1. "Paper moves up": All existing branch lines scroll up
      setBranchLines((lines) =>
        lines.map((line) => ({
          ...line,
          branchY: line.branchY - FALL_SPEED,
          currentY: line.currentY - FALL_SPEED,
          mergeY: line.mergeY !== null ? line.mergeY - FALL_SPEED : null,
          opacity: line.opacity !== undefined ? Math.max(0, line.opacity - 0.001) : 1,
        })).filter(line => (line.mergeY || line.currentY) > -50 && line.opacity > 0)
      )

      // 2. "Pen draws down": Tasks fall
      setTasks((prevTasks) => {
        const gameHeight = gameRef.current?.clientHeight || 500
        const movedTasks = prevTasks.map((task) => ({ ...task, y: task.y + FALL_SPEED }))

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

  // Spawn new tasks at intervals
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTasks((prev) => {
        const { type, requiredActions } = getRandomTaskTypeAndActions()
        // Always spawn in production lane (0)
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
          },
        ]
      })
    }, SPAWN_INTERVAL)
    return () => clearInterval(interval)
  }, [isRunning])

  // Reset game
  const handleReset = () => {
    setTasks([])
    setIsRunning(true)
    setGameOver(false)
    nextTaskId.current = 0
    setScore(0)
    setBranchLines([]) // clear all branch lines
  }

  // Handle action button press
  const handleAction = (action: string) => {
    if (!isRunning) return
    setTasks((prev) => {
      const idx = prev.findIndex((task) => task.requiredActions[task.progress] === action)
      if (idx === -1) return prev
      const updated = [...prev]
      const task = updated[idx]
      const newProgress = task.progress + 1
      
      // Restore the animation trigger
      setAnimatingTaskId(task.id);
      setTimeout(() => setAnimatingTaskId(null), 200);

      let newTask = { ...task }

      if (action === 'BRANCH') {
        const nextLane = getNextAvailableLane(prev)
        newTask = {
          ...task,
          lane: nextLane,
          x: getLaneX(nextLane),
          progress: newProgress,
          action: task.requiredActions[newProgress],
          branchColor: BRANCH_COLORS[nextLane % BRANCH_COLORS.length],
        }
        setBranchLines((lines) => [...lines, {
          id: task.id,
          fromLane: 0,
          toLane: nextLane,
          color: newTask.branchColor,
          branchY: task.y + BLOCK_SIZE / 2,
          mergeY: null,
          currentY: task.y + BLOCK_SIZE / 2,
          opacity: 1,
        }])
        updated[idx] = newTask
        return updated
      }

      if (action === 'MERGE') {
        const mergeYPos = task.y + BLOCK_SIZE / 2
        // 1. Move task visually to production lane
        newTask = { ...task, lane: 0, x: getLaneX(0), isMergingBack: true, progress: newProgress, action: task.requiredActions[newProgress] }
        updated[idx] = newTask
        
        // 2. Set mergeY to complete the line path
        setBranchLines(lines => lines.map(line => line.id === task.id && line.mergeY === null ? { ...line, mergeY: mergeYPos, currentY: mergeYPos } : line ))

        // 3. After animation, remove the task
        setTimeout(() => {
          setTasks(current => current.filter(t => t.id !== task.id))
          setScore(s => s + 1)
        }, MERGE_ANIMATION_DURATION)
        
        return updated
      }
      
      // Handle other actions
      newTask = { ...task, progress: newProgress, action: task.requiredActions[newProgress] }
      updated[idx] = newTask
      return updated
    })
  }

  // Calculate the number of lanes to render lines for
  const maxLane = Math.max(0, ...tasks.map(t => t.lane))
  // Get the height of the game area for line rendering
  const gameAreaHeight = gameRef.current?.clientHeight || 500
  const gameAreaWidth = gameRef.current?.clientWidth || 400

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

  return (
    <div className="game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Game Title at the very top */}
      <div className="game-title-top" style={{ position: 'relative' }}>
        Upsun Run
        {/* Pause/Resume button in top right */}
        <button
          onClick={() => setIsRunning((r) => !r)}
          style={{
            position: 'absolute',
            right: 16,
            top: 0,
            padding: '6px 18px',
            fontSize: 16,
            borderRadius: 8,
            border: 'none',
            background: isRunning ? '#444' : '#7c3aed',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #0006',
            zIndex: 10,
          }}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
      </div>
      {/* Centered game area and score */}
      <div className="game-content">
        <div className="game-score">Score: {score}</div>
        <div
          ref={gameRef}
          className="game-area"
          style={{ position: 'relative' }}
        >
          {/* SVG for branch lines */}
          <svg
            width={gameAreaWidth}
            height={gameAreaHeight}
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
            // Find a task in this lane to get its color, default to production color
            const taskInLane = tasks.find(t => t.lane === laneIdx)
            const color = taskInLane ? taskInLane.branchColor : BRANCH_COLORS[laneIdx % BRANCH_COLORS.length]
            return (
              <div
                key={laneIdx}
                style={{
                  position: 'absolute',
                  left: getLaneX(laneIdx) + BLOCK_SIZE / 2 - 4, // center line under block
                  top: 0,
                  width: 8,
                  height: gameAreaHeight,
                  background: color,
                  borderRadius: 4,
                  opacity: 0.15,
                  zIndex: 0,
                }}
              />
            )
          })}
          {/* Render all falling tasks */}
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-block ${task.type} ${animatingTaskId === task.id ? 'task-animating' : ''}`}
              style={{
                left: getLaneX(task.lane),
                top: task.y,
                zIndex: 1,
              }}
            >
              <div className="task-type">{task.type.toUpperCase()}</div>
              <div>{task.requiredActions[task.progress]}</div>
              <div className="task-progress">{task.progress+1}/{task.requiredActions.length}</div>
            </div>
          ))}
          {gameOver && (
            <div className="game-over">
              Game Over<br />
              <button onClick={handleReset} className="restart-btn">Restart</button>
            </div>
          )}
        </div>
      </div>
      {/* Action buttons at the bottom, two rows */}
      <div className="action-buttons-rows">
        <div className="action-row">
          {['BRANCH', 'MERGE', 'SCALE'].map((action) => (
            <button
              key={action}
              className="hex-btn"
              disabled={!isRunning}
              onClick={() => handleAction(action)}
            >
              {action}
            </button>
          ))}
        </div>
        <div className="action-row">
          {['CODE', 'METRICS', 'PROFILE'].map((action) => (
            <button
              key={action}
              className="hex-btn"
              disabled={!isRunning}
              onClick={() => handleAction(action)}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
