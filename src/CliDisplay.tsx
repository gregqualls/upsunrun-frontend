import './CliDisplay.css';

interface CliDisplayProps {
  lines: string[];
}

const CliDisplay = ({ lines }: CliDisplayProps) => {
  return (
    <div className="cli-display">
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