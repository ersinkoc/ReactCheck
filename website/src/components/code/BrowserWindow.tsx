import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Star, MoreHorizontal } from 'lucide-react';

interface BrowserWindowProps {
  url?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BrowserWindow({
  url = "http://localhost:3000",
  title = "React App",
  children,
  className,
}: BrowserWindowProps) {
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
        </div>
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="w-16" />
      </div>

      {/* Browser toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#141414] border-b border-border">
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <RotateCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[#0d0d0d] rounded-md border border-border">
          <Lock className="w-3.5 h-3.5 text-healthy" />
          <span className="text-sm text-muted-foreground font-mono">{url}</span>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <Star className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Browser content */}
      <div className="bg-[#0d0d0d] min-h-[300px]">
        {children}
      </div>
    </div>
  );
}
