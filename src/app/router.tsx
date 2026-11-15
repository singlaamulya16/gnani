import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AdminPage } from '@/pages/AdminPage';
import { AgentPage } from '@/pages/AgentPage';
import { WhatsAppPage } from '@/pages/WhatsAppPage';
import { AmbulancePage } from '@/pages/AmbulancePage';
import { BloodPage } from '@/pages/BloodPage';
import { DoctorsPage } from '@/pages/DoctorsPage';
import { DonorHomePage } from '@/pages/DonorHomePage';
import { DonorRegisterPage } from '@/pages/DonorRegisterPage';
import { DriverPage } from '@/pages/DriverPage';
import { HomePage } from '@/pages/HomePage';
import { HospitalDashboardPage } from '@/pages/HospitalDashboardPage';
import { HospitalsPage } from '@/pages/HospitalsPage';
import { MapPage } from '@/pages/MapPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PharmacyPage } from '@/pages/PharmacyPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterProviderPage } from '@/pages/RegisterProviderPage';
import { RequestsPage } from '@/pages/RequestsPage';
import { SosPage } from '@/pages/SosPage';
import { VoicePage } from '@/pages/VoicePage';
import { useAppStore } from '@/store/appStore';

function RequireOnboarded({ children }: { children: ReactNode }) {
  const onboarded = useAppStore((s) => s.onboarded);
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/driver" element={<DriverPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        element={
          <RequireOnboarded>
            <AppShell />
          </RequireOnboarded>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="sos" element={<SosPage />} />
        <Route path="agent" element={<AgentPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="hospitals" element={<HospitalsPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="pharmacy" element={<PharmacyPage />} />
        <Route path="blood" element={<BloodPage />} />
        <Route path="ambulance" element={<AmbulancePage />} />
        <Route path="voice" element={<VoicePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="register" element={<RegisterProviderPage />} />
        <Route path="donor/register" element={<DonorRegisterPage />} />
        <Route path="donor" element={<DonorHomePage />} />
        <Route path="hospital/dashboard" element={<HospitalDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
