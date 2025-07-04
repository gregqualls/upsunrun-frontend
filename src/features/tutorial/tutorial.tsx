// tutorial.ts

import React from 'react';
import type { ReactNode } from 'react';

type TutorialStage = 1 | 2 | 3 | 4 | 5;

interface TutorialProgress {
  features: number;
  bugs: number;
  profiler: number;
  infra: number;
}

interface TutorialState {
  mode: boolean;
  stage: TutorialStage;
  dialog: ReactNode | null;
  paused: boolean;
  progress: TutorialProgress;
  profilerCycleComplete?: boolean;
}

const initialTutorialState: TutorialState = {
  mode: true,
  stage: 1,
  dialog: (
    <>
      <b>Welcome, Junior Developer!</b> Your first assignment is to deliver some new features.<br /><br />
      <b>How to create a new feature:</b>
      <ul style={{ textAlign: 'left', margin: '12px 0' }}>
        <li>Each falling block is a feature request.</li>
        <li>Use the <b>BRANCH</b> button to start a new branch.</li>
        <li>Use the <b>CODE</b> button to work on the feature (may require multiple clicks).</li>
        <li>Use the <b>MERGE</b> button to finish and deploy the feature.</li>
        <li>Complete features before they reach the bottom!</li>
      </ul>
    </>
  ),
  paused: true,
  progress: { features: 0, bugs: 0, profiler: 0, infra: 0 },
  profilerCycleComplete: false,
};

export function getDialogForStage(stage: TutorialStage): React.ReactNode | null {
  switch (stage) {
    case 2:
      return (
        <>
          <b>Management is impressed with your rapid delivery of new features.</b><br /><br />
          You are now being trusted with bug fixes as well!<br /><br />
          <b>How to play:</b>
          <ul style={{ textAlign: 'left', margin: '12px 0' }}>
            <li>Bug tasks (<span style={{ color: '#e11d48' }}>red</span>) are now included.</li>
            <li>Bug fixes have higher priority and fall twice as fast as features.</li>
            <li>Complete bug fixes quickly, but don't neglect your feature requests!</li>
            <li>Use <b>BRANCH</b>, <b>CODE</b>, and <b>MERGE</b> for both features and bugs.</li>
          </ul>
        </>
      );
    case 3:
      return (
        <>
          <b>You've proven yourself! We're giving you access to the Profiler to boost your productivity.</b><br /><br />
          <b>How to play:</b>
          <ul style={{ textAlign: 'left', margin: '12px 0' }}>
            <li>Bug tasks (<span style={{ color: '#e11d48' }}>red</span>) require the same actions as features, but fall faster.</li>
            <li>The <b>PROFILE</b> button gives you a temporary boost: <b>CODE</b> actions require half as many clicks for 10 seconds.</li>
            <li>Use <b>PROFILE</b> wisely! It has a cooldown.</li>
          </ul>
        </>
      );
    case 4:
      return (
        <>
          <b>The lead developer just quit! You're now in charge of infrastructure.</b><br /><br />
          <b>How to play:</b>
          <ul style={{ textAlign: 'left', margin: '12px 0' }}>
            <li>You will now see TRAFFIC tasks (<span style={{ color: '#2563eb' }}>blue</span>).</li>
            <li>Use the <b>METRICS</b> button to analyze, then <b>SCALE UP</b> or <b>SCALE DOWN</b> as needed.</li>
            <li>Keep the system running smoothly and costs low!</li>
          </ul>
        </>
      );
    case 5:
      return (
        <>
          <b>Congratulations! You've mastered the basics.</b><br /><br />
          You're ready for the full upsun.run experience!<br /><br />
          <b>Tips:</b>
          <ul style={{ textAlign: 'left', margin: '12px 0' }}>
            <li>Complete tasks quickly for a high score.</li>
            <li>Use <b>PROFILE</b> and scaling wisely.</li>
            <li>Don't let any task hit the bottom!</li>
          </ul>
        </>
      );
    default:
      return null;
  }
}

export function shouldAdvanceStage(stage: TutorialStage, progress: TutorialProgress): boolean {
  if (stage === 1 && progress.features >= 5) return true;
  if (stage === 2 && progress.bugs >= 3 && progress.features >= 5) return true;
  if (stage === 3 && progress.profiler >= 1) return true;
  if (stage === 4 && progress.infra >= 4) return true;
  return false;
}

export function nextStage(stage: TutorialStage): TutorialStage {
  if (stage < 5) return (stage + 1) as TutorialStage;
  return 5;
} 

export type { TutorialStage, TutorialProgress, TutorialState };
export { initialTutorialState }; 