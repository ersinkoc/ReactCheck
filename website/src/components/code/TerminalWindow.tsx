import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Terminal } from 'lucide-react';

interface TerminalLine {
  type: 'command' | 'output' | 'empty';
  text: string;
  delay?: number;
}

interface TerminalWindowProps {
  lines: TerminalLine[];
  title?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  typingSpeed?: number;
}

export function TerminalWindow({
  lines,
  title = "Terminal",
  className,
  autoPlay = true,
  loop = false,
  typingSpeed = 30,
}: TerminalWindowProps) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; type: string }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!autoPlay) {
      setDisplayedLines(lines.map(l => ({ text: l.text, type: l.type })));
      return;
    }

    if (currentLineIndex >= lines.length) {
      if (loop) {
        setTimeout(() => {
          setDisplayedLines([]);
          setCurrentLineIndex(0);
          setCurrentCharIndex(0);
        }, 3000);
      }
      return;
    }

    const currentLine = lines[currentLineIndex];

    if (currentLine.type === 'command' && !isTyping) {
      setIsTyping(true);
      setDisplayedLines(prev => [...prev, { text: '', type: 'command' }]);
    }

    if (currentLine.type === 'command' && isTyping) {
      if (currentCharIndex < currentLine.text.length) {
        const timeout = setTimeout(() => {
          setDisplayedLines(prev => {
            const newLines = [...prev];
            newLines[newLines.length - 1] = {
              text: currentLine.text.slice(0, currentCharIndex + 1),
              type: 'command'
            };
            return newLines;
          });
          setCurrentCharIndex(prev => prev + 1);
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        }, currentLine.delay || 300);
        return () => clearTimeout(timeout);
      }
    }

    if (currentLine.type === 'output' || currentLine.type === 'empty') {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => [...prev, { text: currentLine.text, type: currentLine.type }]);
        setCurrentLineIndex(prev => prev + 1);
      }, currentLine.delay || 100);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, isTyping, lines, autoPlay, loop, typingSpeed]);

  const handleCopy = async () => {
    const commands = lines
      .filter(l => l.type === 'command')
      .map(l => l.text)
      .join('\n');
    await navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "rounded-lg border border-border overflow-hidden bg-[#0d0d0d]",
      "shadow-2xl",
      className
    )}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <Terminal className="w-4 h-4 text-muted-foreground ml-2" />
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          title="Copy commands"
        >
          {copied ? (
            <Check className="w-4 h-4 text-healthy" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Terminal content */}
      <div className="p-4 font-mono text-sm min-h-[200px] max-h-[400px] overflow-auto">
        {displayedLines.map((line, index) => (
          <div key={index} className="leading-relaxed">
            {line.type === 'command' && (
              <div className="flex items-start">
                <span className="text-healthy mr-2">$</span>
                <span className="text-foreground">
                  {line.text}
                  {index === displayedLines.length - 1 && isTyping && (
                    <span className="terminal-cursor" />
                  )}
                </span>
              </div>
            )}
            {line.type === 'output' && (
              <div
                className="text-muted-foreground pl-4"
                dangerouslySetInnerHTML={{ __html: line.text }}
              />
            )}
            {line.type === 'empty' && <div className="h-5" />}
          </div>
        ))}
        {displayedLines.length === 0 && (
          <div className="flex items-start">
            <span className="text-healthy mr-2">$</span>
            <span className="terminal-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
