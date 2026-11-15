import {
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  animate,
} from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAppStore, type SheetSnap } from '@/store/appStore';

/** Sheet top as fraction of shell content area — half = exact 50/50 with map */
const SNAP: Record<SheetSnap, number> = {
  peek: 0.58,
  half: 0.5,
  full: 0.06,
};

interface BottomSheetProps {
  children: ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  const snap = useAppStore((s) => s.sheetSnap);
  const setSheetSnap = useAppStore((s) => s.setSheetSnap);
  const y = useMotionValue(0);
  const controls = useDragControls();
  const reduce = useReducedMotion();
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight - 56 : 640,
  );

  useEffect(() => {
    const measure = () => {
      const shell = document.querySelector('[data-app-shell-main]');
      setHeight(shell instanceof HTMLElement ? shell.clientHeight : window.innerHeight - 56);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const target = height * SNAP[snap];
    if (reduce) {
      y.set(target);
      return;
    }
    void animate(y, target, { type: 'spring', stiffness: 340, damping: 36 });
  }, [snap, y, reduce, height]);

  return (
    <motion.section
      style={{ y }}
      drag="y"
      dragControls={controls}
      dragConstraints={{
        top: height * SNAP.full,
        bottom: height * SNAP.peek,
      }}
      dragElastic={0.08}
      onDragEnd={(_, info) => {
        const current = y.get();
        const projected = current + info.velocity.y * 0.18;
        const candidates: SheetSnap[] = ['full', 'half', 'peek'];
        let best: SheetSnap = 'half';
        let bestDist = Infinity;
        for (const c of candidates) {
          const dist = Math.abs(projected - height * SNAP[c]);
          if (dist < bestDist) {
            bestDist = dist;
            best = c;
          }
        }
        setSheetSnap(best);
      }}
      className="absolute inset-x-0 top-0 z-30 flex h-full flex-col rounded-t-2xl bg-surface shadow-[0_-6px_24px_rgb(17_28_41/0.08)] lg:hidden"
    >
      <div
        className="flex cursor-grab justify-center py-1.5 active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
      >
        <span className="h-1 w-9 rounded-full bg-surface-high" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-1">{children}</div>
    </motion.section>
  );
}
