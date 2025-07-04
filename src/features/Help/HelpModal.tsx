import Modal from '../../components/Modal';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <h2>How to Play Upsun Run</h2>
    <p>Your goal is to complete tasks by hitting the correct buttons as they fall. Don't let any task hit the bottom! Watch the <strong>CLI display</strong> at the top to see your commands execute.</p>
    <h3>Game Modes</h3>
    <ul>
      <li><strong>Easy Mode:</strong> The standard experience.</li>
      <li><strong>Hard Mode:</strong> Tasks fall twice as fast, but you get double the points! You can only change modes before starting a game.</li>
    </ul>
    <h3>Task Types</h3>
    <ul>
      <li><strong>FEATURE (Purple):</strong> Represents a new feature. Requires you to BRANCH, CODE, and then MERGE.</li>
      <li><strong>BUG (Red):</strong> A bug fix. Falls faster than features! Requires BRANCH, CODE, and MERGE.</li>
      <li><strong>TRAFFIC (Blue):</strong> A production issue. First, hit METRICS. This will reveal if you need to SCALE UP (Green) or SCALE DOWN (Red).</li>
    </ul>
    <h3>Core Actions</h3>
    <ul>
      <li><strong>BRANCH/MERGE:</strong> These actions have a 1-second "build time" where they will pulse before completing.</li>
      <li><strong>METRICS:</strong> Has a 1-second "analyzing" time before revealing the required scale action.</li>
      <li><strong>CODE:</strong> Your main action! Click this rapidly for features and bugs. The block's color will become more solid as you progress.</li>
    </ul>
    <h3>Special Actions</h3>
    <ul>
      <li><strong>PROFILE:</strong> A 10-second boost that cuts the required 'CODE' clicks in half. The game area will glow green. This has a 10-second cooldown after use.</li>
      <li><strong>PAUSE/RESUME:</strong> Toggles the game state. This modal also pauses the game.</li>
    </ul>
  </Modal>
);

export default HelpModal; 