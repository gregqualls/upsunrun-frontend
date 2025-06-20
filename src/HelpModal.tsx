import { createPortal } from 'react-dom';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  if (!isOpen) {
    return null;
  }

  const modalMarkup = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>How to Play Upsun Run</h2>
        
        <p>Your goal is to complete tasks as they fall. Different tasks require different actions. Don't let any task hit the bottom!</p>

        <h3>Task Types</h3>
        <ul>
          <li><strong>FEATURE (Purple):</strong> Represents a new feature. Requires you to BRANCH, CODE, and then MERGE.</li>
          <li><strong>BUG (Red):</strong> A bug fix. Similar to a feature but falls faster! Requires BRANCH, CODE, and MERGE.</li>
          <li><strong>TRAFFIC (Blue/Orange):</strong> A production issue. First, hit METRICS to see the problem, then SCALE UP or SCALE DOWN as required.</li>
        </ul>

        <h3>Core Actions</h3>
        <ul>
          <li><strong>BRANCH:</strong> Moves a task from the 'main' lane to a new development lane. Has a 1-second build time.</li>
          <li><strong>CODE:</strong> Your main action! Click this rapidly to complete the coding step for features and bugs. The block's color will become more solid as you progress.</li>
          <li><strong>MERGE:</strong> Moves a completed feature or bug fix back to the main lane to score a point. Has a 1-second build time.</li>
          <li><strong>METRICS / SCALE:</strong> Use METRICS to diagnose a traffic issue, then use SCALE UP or SCALE DOWN to fix it. Scaling has a 1-second build time.</li>
        </ul>

        <h3>Special Actions</h3>
        <ul>
            <li><strong>PROFILE:</strong> A 10-second boost that cuts the required 'CODE' clicks in half. Has a 10-second cooldown after use.</li>
            <li><strong>PAUSE/RESUME:</strong> Toggles the game state.</li>
        </ul>
      </div>
    </div>
  );

  return createPortal(modalMarkup, document.body);
};

export default HelpModal; 