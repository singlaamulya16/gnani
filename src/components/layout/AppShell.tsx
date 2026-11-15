import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastViewport } from '@/components/ui';
import { MapPanel } from '@/components/map/MapPanel';
import { VoiceDock } from '@/components/voice/VoiceDock';
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
  const mapFocus = location.pathname === '/map';
  const setSheetSnap = useAppStore((s) => s.setSheetSnap);

  useEffect(() => {
    // Keep a true 50/50 split by default; Map tab still peeks a bit more map
    setSheetSnap(mapFocus ? 'peek' : 'half');
  }, [mapFocus, setSheetSnap]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg text-[13px] leading-snug">
      <TopBar />
      <ToastViewport />

      <div className="relative flex min-h-0 flex-1 pt-16 lg:pb-0">
        {desktop ? (
          <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1440px]">
            <ContentPanel className="lg:w-1/2">
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
            </ContentPanel>
            <div className="relative flex w-1/2 flex-col">
              <MapPanel className="flex-1" />
              <VoiceDock />
            </div>
          </div>
        ) : (
          <div
            data-app-shell-main
            className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden"
          >
            {/* Top 50%: live map */}
            <MapPanel className="h-1/2 min-h-[220px]" />
            <VoiceDock floating />
            {/* Bottom 50%: content sheet (half snap) */}
            <BottomSheet>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={fastTransition}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </BottomSheet>
          </div>
        )}
      </div>

      {!desktop && <BottomNav />}
    </div>
  );
}
