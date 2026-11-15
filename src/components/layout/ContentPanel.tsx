import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ContentPanelProps {
  children: ReactNode;
  className?: string;
}

export function ContentPanel({ children, className }: ContentPanelProps) {
  return (
    <section
      className={cn(
        'flex h-full min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden bg-bg lg:w-1/2 lg:border-r lg:border-border lg:bg-bg lg:px-6 lg:py-5',
        className,
      )}
    >
      {children}
    </section>
  );
}
