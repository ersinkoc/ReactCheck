import React, { useState, useMemo, useCallback, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check, File, ChevronRight, ChevronDown } from 'lucide-react';

interface FileTab {
  name: string;
  language: string;
  code: string;
  icon?: React.ReactNode;
}

interface IDEWindowProps {
  files: FileTab[];
  title?: string;
  className?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  activeFileIndex?: number;
}

export const IDEWindow = memo(function IDEWindow({
  files,
  title = "Code Editor",
  className,
  showLineNumbers = true,
  highlightLines = [],
  activeFileIndex = 0,
}: IDEWindowProps) {
  const [activeFile, setActiveFile] = useState(activeFileIndex);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(files[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [files, activeFile]);

  const customStyle = useMemo(() => ({
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: 'transparent',
      margin: 0,
      padding: '1rem',
      fontSize: '13px',
      lineHeight: '1.6',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
  }), []);

  const lineProps = useCallback((lineNumber: number) => {
    const style: React.CSSProperties = {
      display: 'block',
      width: '100%',
    };
    if (highlightLines.includes(lineNumber)) {
      style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      style.borderLeft = '2px solid #3b82f6';
      style.marginLeft = '-2px';
      style.paddingLeft = '2px';
    }
    return { style };
  }, [highlightLines]);

  const lineNumbers = useMemo(() =>
    files[activeFile].code.split('\n').map((_, i) => i + 1),
    [files, activeFile]
  );

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
          <span className="ml-3 text-sm text-muted-foreground">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-healthy" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        {files.length > 1 && (
          <div className="w-48 bg-[#141414] border-r border-border hidden md:block">
            <div className="p-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full p-1"
              >
                {sidebarOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>FILES</span>
              </button>
              {sidebarOpen && (
                <div className="mt-1 space-y-0.5">
                  {files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveFile(index)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1 text-sm rounded transition-colors",
                        activeFile === index
                          ? "bg-primary/20 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      )}
                    >
                      <File className="w-3.5 h-3.5" />
                      {file.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File tabs */}
          <div className="flex bg-[#1a1a1a] border-b border-border overflow-x-auto">
            {files.map((file, index) => (
              <button
                key={index}
                onClick={() => setActiveFile(index)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
                  activeFile === index
                    ? "bg-[#0d0d0d] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <File className="w-3.5 h-3.5" />
                {file.name}
              </button>
            ))}
          </div>

          {/* Code area with line numbers */}
          <div className="flex-1 overflow-auto max-h-[500px]">
            <div className="flex">
              {/* Line numbers */}
              {showLineNumbers && (
                <div className="flex-shrink-0 py-4 pr-0 pl-4 text-right select-none bg-[#0d0d0d] border-r border-border/50">
                  {lineNumbers.map((num) => (
                    <div
                      key={num}
                      className={cn(
                        "px-2 text-xs leading-[1.6] font-mono",
                        highlightLines.includes(num)
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground/50"
                      )}
                      style={{ fontSize: '13px', lineHeight: '1.6' }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              )}

              {/* Code */}
              <div className="flex-1 overflow-x-auto">
                <SyntaxHighlighter
                  language={files[activeFile].language}
                  style={customStyle}
                  showLineNumbers={false}
                  wrapLines={true}
                  lineProps={lineProps}
                >
                  {files[activeFile].code.trim()}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
