import { useEffect, useRef, useState } from 'react'
import './App.css'

const ACTIONS = ['CODE', 'PROFILE', 'METRICS', 'SCALE', 'BRANCH', 'MERGE']
const GAME_HEIGHT = 500
const GAME_WIDTH = 400
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

// Helper to get a random action
function getRandomAction() {
  return ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
}
// Helper to get a random horizontal position
function getRandomX() {
  return Math.floor(Math.random() * (GAME_WIDTH - BLOCK_SIZE))
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
        // Move all tasks down
        const moved = prev.map((task) => ({ ...task, y: task.y + FALL_SPEED }))
        // Check if any task hit the bottom
        const hitBottom = moved.some((task) => task.y + BLOCK_SIZE >= GAME_HEIGHT)
        if (hitBottom) {
          setIsRunning(false)
          setGameOver(true)
          return moved.map((task) => ({ ...task, y: Math.min(task.y, GAME_HEIGHT - BLOCK_SIZE) }))
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
        return [
          ...prev,
          {
            id: nextTaskId.current++,
            x: getRandomX(),
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
    <div className="game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Game Title */}
      <div style={{ color: '#fff', fontSize: 32, fontWeight: 900, textAlign: 'center', marginTop: 32, letterSpacing: 2, textShadow: '0 2px 12px #7c3aed99' }}>
        Upsun Run
      </div>
      {/* Score display */}
      <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, textAlign: 'center', marginTop: 12 }}>
        Score: {score}
      </div>
      <div
        ref={gameRef}
        style={{
          position: 'relative',
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          margin: '40px auto',
          background: 'rgba(30,32,40,0.95)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 0 24px #222',
        }}
      >
        {/* Render all falling tasks */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className={animatingTaskId === task.id ? 'task-animating' : ''}
            style={{
              position: 'absolute',
              left: task.x,
              top: task.y,
              padding: '8px 16px',
              minWidth: 60,
              minHeight: 44,
              background:
                task.type === 'bug' ? '#e11d48' :
                task.type === 'traffic' ? '#2563eb' :
                '#7c3aed',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              boxShadow: '0 2px 8px #0006',
              userSelect: 'none',
              flexDirection: 'column',
              textAlign: 'center',
              textShadow: '0 1px 4px #0008',
              transition: 'transform 0.18s cubic-bezier(.4,2,.6,1)',
            }}
          >
            <div style={{fontSize: 12, fontWeight: 400}}>{task.type.toUpperCase()}</div>
            <div>{task.requiredActions[task.progress]}</div>
            <div style={{fontSize: 10, marginTop: 2}}>{task.progress+1}/{task.requiredActions.length}</div>
          </div>
        ))}
        {gameOver && (
          <div style={{
            position: 'absolute',
            top: '40%',
            left: 0,
            width: '100%',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: 16,
            borderRadius: 8,
          }}>
            Game Over<br />
            <button onClick={handleReset} style={{ marginTop: 12, padding: '8px 24px', fontSize: 18, borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700 }}>Restart</button>
          </div>
        )}
      </div>
      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
        {ACTIONS.map((action) => (
          <button
            key={action}
            className="hex-btn"
            style={{ minWidth: 64, minHeight: 64 }}
            disabled={!isRunning}
            onClick={() => handleAction(action)}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
