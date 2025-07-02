import './CliDisplay.css';

interface CliDisplayProps {
  lines: string[];
  isBackground?: boolean;
}

const CliDisplay = ({ lines, isBackground }: CliDisplayProps) => {
  return (
    <div
      className={`cli-display${isBackground ? ' cli-background' : ''}`}
      style={isBackground ? { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '100%' } : {}}
    >
      {lines.map((line, index) => (
        <p key={index} className="cli-line">
          <span className="cli-prompt">$</span> {line}
        </p>
      ))}
      <div className="cli-cursor"></div>
    </div>
  );
};

export default CliDisplay; 