import React, { useState, useMemo, useCallback, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

export const CodeBlock = memo(function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  highlightLines = [],
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const customStyle = useMemo(() => ({
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: 'hsl(0 0% 6%)',
      margin: 0,
      padding: '1rem',
      fontSize: '13px',
      lineHeight: '1.6',
      borderRadius: filename ? '0 0 0.5rem 0.5rem' : '0.5rem',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
  }), [filename]);

  const lineProps = useCallback((lineNumber: number) => {
    const style: React.CSSProperties = {
      display: 'block',
      width: '100%',
    };
    if (highlightLines.includes(lineNumber)) {
      style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      style.borderLeft = '3px solid #3b82f6';
      style.marginLeft = '-3px';
      style.paddingLeft = '3px';
    }
    return { style };
  }, [highlightLines]);

  return (
    <div className={cn("rounded-lg overflow-hidden border border-border", className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
          <span className="text-sm text-muted-foreground font-mono">{filename}</span>
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
      )}
      <div className="relative">
        {!filename && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded hover:bg-white/10 transition-colors z-10"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-healthy" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          lineNumberStyle={{
            minWidth: '2.5rem',
            paddingRight: '1rem',
            color: 'hsl(0 0% 40%)',
            userSelect: 'none',
          }}
          lineProps={lineProps}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});
