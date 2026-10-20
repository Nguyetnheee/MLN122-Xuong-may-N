import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ContractPage } from './pages/student/ContractPage';
import { JoinPage } from './pages/student/JoinPage';
import { PayslipPage } from './pages/student/PayslipPage';
import { RevealPage } from './pages/student/RevealPage';
import { SewingPage } from './pages/student/SewingPage';

// Màn chủ xưởng tải riêng khi cần: điện thoại sinh viên không phải tải thư viện QR, trang thử tải…
const RequireOwner = lazy(() => import('./state/OwnerRoom').then((m) => ({ default: m.RequireOwner })));
const LoginPage = lazy(() => import('./pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })));
const LobbyPage = lazy(() => import('./pages/admin/LobbyPage').then((m) => ({ default: m.LobbyPage })));
const LivePage = lazy(() => import('./pages/admin/LivePage').then((m) => ({ default: m.LivePage })));
const LedgerPage = lazy(() => import('./pages/admin/LedgerPage').then((m) => ({ default: m.LedgerPage })));
const LoadTestPage = lazy(() => import('./pages/admin/LoadTestPage').then((m) => ({ default: m.LoadTestPage })));

/** Mỗi lần đổi màn thì cuộn về đầu trang */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          {/* Sinh viên */}
          <Route path="/" element={<JoinPage />} />
          <Route path="/hop-dong" element={<ContractPage />} />
          <Route path="/may-ao" element={<SewingPage />} />
          <Route path="/phieu-luong" element={<PayslipPage />} />
          <Route path="/lat-bai" element={<RevealPage />} />

          {/* Chủ xưởng */}
          <Route path="/admin/dang-nhap" element={<LoginPage />} />
          <Route element={<RequireOwner />}>
            <Route path="/admin" element={<LobbyPage />} />
            <Route path="/admin/dang-chay" element={<LivePage />} />
            <Route path="/admin/so-sach" element={<LedgerPage />} />
            <Route path="/admin/thu-tai" element={<LoadTestPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
