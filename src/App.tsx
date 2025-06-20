import { useEffect, useRef, useState } from 'react'
import './App.css'

const BLOCK_SIZE = 50
const FALL_SPEED = 0.5 // pixels per frame
const SPAWN_INTERVAL = 4800 // ms

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
  // Find the rightmost lane currently in use, or 0 if none
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

  // Animate falling tasks
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTasks((prev) => {
        const gameHeight = gameRef.current?.clientHeight || 500
        // Move all tasks down
        const moved = prev.map((task) => ({ ...task, y: task.y + FALL_SPEED }))
        // Check if any task hit the bottom
        const hitBottom = moved.some((task) => task.y + BLOCK_SIZE >= gameHeight)
        if (hitBottom) {
          setIsRunning(false)
          setGameOver(true)
          return moved.map((task) => ({ ...task, y: Math.min(task.y, gameHeight - BLOCK_SIZE) }))
        }
        return moved
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
  }

  // Handle action button press
  const handleAction = (action: string) => {
    if (!isRunning) return
    setTasks((prev) => {
      // Find the first task that matches the current action
      const idx = prev.findIndex(
        (task) => task.requiredActions[task.progress] === action
      )
      if (idx === -1) return prev
      const updated = [...prev]
      const task = updated[idx]
      const newProgress = task.progress + 1
      setAnimatingTaskId(task.id)
      setTimeout(() => setAnimatingTaskId(null), 200)
      let newTask = { ...task }
      if (action === 'BRANCH') {
        // Move to next available lane and assign a branch color
        const nextLane = getNextAvailableLane(prev)
        newTask = {
          ...task,
          lane: nextLane,
          x: getLaneX(nextLane),
          branchColor: BRANCH_COLORS[nextLane % BRANCH_COLORS.length],
          progress: newProgress,
          action: task.requiredActions[newProgress],
        }
      } else if (action === 'MERGE') {
        // Move back to production lane, mark branch for fading
        newTask = {
          ...task,
          lane: 0,
          x: getLaneX(0),
          fadingBranch: true,
          progress: newProgress,
          action: task.requiredActions[newProgress],
        }
      } else {
        newTask = { ...task, progress: newProgress, action: task.requiredActions[newProgress] }
      }
      // Remove task if completed
      if (newProgress >= task.requiredActions.length) {
        updated.splice(idx, 1)
        setScore((s) => s + 1)
      } else {
        updated[idx] = newTask
      }
      return updated
    })
  }

  // Calculate the number of lanes to render lines for
  const maxLane = Math.max(0, ...tasks.map(t => t.lane))
  // Get the height of the game area for line rendering
  const gameAreaHeight = gameRef.current?.clientHeight || 500

  return (
    <div className="game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Game Title at the very top */}
      <div className="game-title-top">Upsun Run</div>
      {/* Centered game area and score */}
      <div className="game-content">
        <div className="game-score">Score: {score}</div>
        <div
          ref={gameRef}
          className="game-area"
        >
          {/* Render branch/production lines for each lane */}
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
                  opacity: 0.5,
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
