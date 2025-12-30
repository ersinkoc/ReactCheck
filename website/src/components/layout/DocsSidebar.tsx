import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface SidebarSection {
  title: string;
  items: {
    name: string;
    href: string;
    badge?: string;
  }[];
}

interface DocsSidebarProps {
  sections: SidebarSection[];
  className?: string;
}

export function DocsSidebar({ sections, className }: DocsSidebarProps) {
  const location = useLocation();

  return (
    <aside className={cn("w-64 flex-shrink-0", className)}>
      <div className="sticky top-20 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href ||
                  location.hash === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 transition-transform",
                          isActive ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                        )}
                      />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
