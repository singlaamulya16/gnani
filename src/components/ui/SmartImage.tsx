import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
}

/** Image that swaps to a designed fallback if the network image fails. */
export function SmartImage({ src, alt, className, fallback }: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}
