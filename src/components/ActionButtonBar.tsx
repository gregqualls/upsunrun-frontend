import React from 'react';

interface ActionButtonBarProps {
  isRunning: boolean;
  isProfileActive: boolean;
  profileCooldown: boolean;
  profileTimer: number;
  handleAction: (action: string) => void;
  iconMap: Record<string, { icon: React.ComponentType<{ className?: string }> }>;
}

const ActionButtonBar: React.FC<ActionButtonBarProps> = ({
  isRunning,
  isProfileActive,
  profileCooldown,
  profileTimer,
  handleAction,
  iconMap,
}) => (
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
          );
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
          );
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
);

export default ActionButtonBar;
