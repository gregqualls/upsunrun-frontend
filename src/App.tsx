import { useEffect, useRef, useState } from 'react'
import './App.css'

const BLOCK_SIZE = 50
const FALL_SPEED = 0.5 // pixels per frame
const SPAWN_INTERVAL = 4800 // ms

// Define Task type
interface Task {
  id: number
  x: number
  y: number
  action: string
  type: 'feature' | 'bug' | 'traffic'
  requiredActions: string[]
  progress: number // how many actions have been completed
}

// Helper to get a random horizontal position
function getRandomX(gameWidth: number) {
  return Math.floor(Math.random() * (gameWidth - BLOCK_SIZE))
}

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
        const gameWidth = gameRef.current?.clientWidth || 400
        return [
          ...prev,
          {
            id: nextTaskId.current++,
            x: getRandomX(gameWidth),
            y: 0,
            action: requiredActions[0], // show the first required action as the current
            type,
            requiredActions,
            progress: 0,
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
      const idx = prev.findIndex(
        (task) => task.requiredActions[task.progress] === action
      )
      if (idx === -1) return prev
      const updated = [...prev]
      const task = updated[idx]
      const newProgress = task.progress + 1
      setAnimatingTaskId(task.id)
      setTimeout(() => setAnimatingTaskId(null), 200)
      if (newProgress >= task.requiredActions.length) {
        updated.splice(idx, 1)
        setScore((s) => s + 1)
      } else {
        updated[idx] = { ...task, progress: newProgress, action: task.requiredActions[newProgress] }
      }
      return updated
    })
  }

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
          {/* Render all falling tasks */}
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-block ${task.type} ${animatingTaskId === task.id ? 'task-animating' : ''}`}
              style={{
                left: task.x,
                top: task.y,
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
