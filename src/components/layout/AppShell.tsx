import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastViewport } from '@/components/ui';
import { MapPanel } from '@/components/map/MapPanel';
import { VoiceTag } from '@/components/voice/VoiceTag';
import { useGeolocationBootstrap } from '@/hooks/useGeolocation';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { fadeOnly, fastTransition, pageVariants } from '@/lib/motion';
import { useAppStore } from '@/store/appStore';
import { BottomNav } from './BottomNav';
import { BottomSheet } from './BottomSheet';
import { ContentPanel } from './ContentPanel';
import { TopBar } from './TopBar';

export function AppShell() {
  useGeolocationBootstrap();
  const desktop = useIsDesktop();
  const location = useLocation();
  const reduce = useReducedMotion();
  const variants = reduce ? fadeOnly : pageVariants;
  const isHome = location.pathname === '/';
  const mapFocus = location.pathname === '/map';
  const setSheetSnap = useAppStore((s) => s.setSheetSnap);

  useEffect(() => {
    setSheetSnap(mapFocus ? 'peek' : 'half');
  }, [mapFocus, setSheetSnap]);

  const page = (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={fastTransition}
        className="min-h-0 flex-1"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg text-[14px] leading-snug">
      <TopBar />
      <ToastViewport />

      <div className="relative flex min-h-0 flex-1 pt-16">
        {isHome ? (
          /* Home: full-width landing page (hero → map → services) */
          <div className="h-[calc(100dvh-4rem)] w-full overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
            {page}
          </div>
        ) : desktop ? (
          <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1440px]">
            <ContentPanel className="lg:w-1/2">{page}</ContentPanel>
            {/* Boxed map with breathing room */}
            <div className="relative flex w-1/2 flex-col px-4 pb-4 pt-5">
              <div className="relative flex-1 overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-float)]">
                <MapPanel className="h-full" />
              </div>
            </div>
          </div>
        ) : (
          <div data-app-shell-main className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
            <div className="h-1/2 min-h-[220px] px-3 pb-3 pt-2">
              <div className="relative h-full overflow-hidden rounded-[22px] border border-border shadow-[var(--shadow-card)]">
                <MapPanel className="h-full" />
              </div>
            </div>
            <BottomSheet>{page}</BottomSheet>
          </div>
        )}
      </div>

      {location.pathname !== '/voice' && <VoiceTag />}
      {!desktop && <BottomNav />}
    </div>
  );
}
