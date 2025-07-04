import React from 'react';
import { Bars3Icon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';

interface HeaderProps {
  title?: string;
  isRunning: boolean;
  onMenuClick: () => void;
  onPlayPause: () => void;
}

const Header: React.FC<HeaderProps> = ({ title = 'Upsun Run', isRunning, onMenuClick, onPlayPause }) => (
  <div className="sleek-header">
    {/* Menu button on the left */}
    <button className="header-btn sleek-btn" style={{minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={onMenuClick}>
      <Bars3Icon style={{width: 28, height: 28}} />
    </button>
    {/* Title centered */}
    <div className="header-title" style={{margin: 0}}>
      {title.split(' ').map((word, i) => i === 1 ? <span key={i} style={{ fontWeight: 700, letterSpacing: 1 }}>{word}</span> : word + ' ')}
    </div>
    {/* Play/Pause button on the right */}
    <button
      onClick={onPlayPause}
      className={`header-btn sleek-btn ${!isRunning ? 'resume-btn' : ''}`}
      style={{minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}} 
      aria-label={isRunning ? 'Pause' : 'Resume'}
    >
      {isRunning ? <PauseIcon style={{width: 28, height: 28}} /> : <PlayIcon style={{width: 28, height: 28}} />}
    </button>
  </div>
);

export default Header;
