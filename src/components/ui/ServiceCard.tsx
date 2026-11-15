import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { staggerItem } from '@/lib/motion';
import { Icon, type IconName } from './Icon';

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: IconName;
  tone?: 'teal' | 'sos' | 'slate' | 'mint';
  active?: boolean;
  onClick?: () => void;
  index?: number;
}

const tones: Record<NonNullable<ServiceCardProps['tone']>, string> = {
  teal: 'bg-primary-soft text-primary',
  sos: 'bg-sos-soft text-sos',
  slate: 'bg-surface-high text-text-secondary',
  mint: 'bg-primary-fixed/40 text-primary-dark',
};

export function ServiceCard({
  title,
  subtitle,
  icon,
  tone = 'teal',
  active,
  onClick,
  index = 0,
}: ServiceCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      variants={reduce ? undefined : staggerItem}
      custom={index}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        'group flex min-h-[72px] flex-col gap-1 rounded-xl bg-surface p-2 text-left shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-float)]',
        active && 'ring-2 ring-primary',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md',
          tones[tone],
        )}
      >
        <Icon name={icon} size={15} />
      </span>
      <span>
        <span className="block font-[family-name:var(--font-sans)] text-xs font-semibold leading-tight text-text group-hover:text-primary">
          {title}
        </span>
        <span className="block text-[11.5px] leading-tight text-text-secondary">{subtitle}</span>
      </span>
    </motion.button>
  );
}
