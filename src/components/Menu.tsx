import React from 'react';
import Modal from './Modal';
import { Cog6ToothIcon, AcademicCapIcon, ChartBarIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  tutorialMode: boolean;
  onTutorialToggle: (checked: boolean) => void;
  hardMode: boolean;
  onHardModeToggle: (checked: boolean) => void;
  hardModeDisabled: boolean;
  onHelp: () => void;
}

const Menu: React.FC<MenuProps> = ({
  isOpen,
  onClose,
  tutorialMode,
  onTutorialToggle,
  hardMode,
  onHardModeToggle,
  hardModeDisabled,
  onHelp,
}) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div style={{maxWidth: 340, minWidth: 240, margin: '60px auto', textAlign: 'left', position: 'relative'}}>
      <h3 style={{margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: 8}}><Cog6ToothIcon style={{width: 22, height: 22}} /> Game Settings</h3>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18}}>
        <span style={{display: 'flex', alignItems: 'center', gap: 8}}><AcademicCapIcon style={{width: 20, height: 20}} /> Tutorial</span>
        <label className="switch">
          <input type="checkbox" checked={tutorialMode} onChange={e => onTutorialToggle(e.target.checked)} />
          <span className="slider round"></span>
        </label>
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18}}>
        <span style={{display: 'flex', alignItems: 'center', gap: 8}}><ChartBarIcon style={{width: 20, height: 20}} /> Hard Mode</span>
        <label className="switch">
          <input type="checkbox" checked={hardMode} disabled={hardModeDisabled} onChange={e => onHardModeToggle(e.target.checked)} />
          <span className="slider round"></span>
        </label>
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
        <span style={{display: 'flex', alignItems: 'center', gap: 8}}><QuestionMarkCircleIcon style={{width: 20, height: 20}} /> Help</span>
        <button className="sleek-btn" style={{padding: '4px 14px', fontSize: 15}} onClick={onHelp}><QuestionMarkCircleIcon style={{width: 18, height: 18, marginRight: 4}} /> Help</button>
      </div>
    </div>
  </Modal>
);

export default Menu;
