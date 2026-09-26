// Top-level route table. Maps URL paths to page components under src/pages/.
// TODO: populate remaining routes as each Stitch screen is implemented
// (documents, intelligence, verification, consent, audit, settings).

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from '@/app/App';
import { HomePage } from '@/pages/home/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OfficerLoginPage } from '@/pages/auth/OfficerLoginPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerTendersPage } from '@/pages/officer/OfficerTendersPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { TenderListingPage } from '@/pages/tenders/TenderListingPage';
import { TenderDetailsPage } from '@/pages/tenders/TenderDetailsPage';
import { BidStep1Page } from '@/pages/tenders/bid/BidStep1Page';
import { BidStep2Page } from '@/pages/tenders/bid/BidStep2Page';
import { BidStep3Page } from '@/pages/tenders/bid/BidStep3Page';
import { MyBidsPage } from '@/pages/bids/MyBidsPage';
import { BidDetailsPage } from '@/pages/bids/BidDetailsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/officer/login" element={<OfficerLoginPage />} />
          <Route path="/officer/dashboard" element={<OfficerDashboardPage />} />
          <Route path="/officer/tenders" element={<OfficerTendersPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tenders" element={<TenderListingPage />} />
          <Route path="/tenders/:ref" element={<TenderDetailsPage />} />
          <Route path="/tenders/:ref/bid/1" element={<BidStep1Page />} />
          <Route path="/tenders/:ref/bid/2" element={<BidStep2Page />} />
          <Route path="/tenders/:ref/bid/3" element={<BidStep3Page />} />
          <Route path="/my-bids" element={<MyBidsPage />} />
          <Route path="/my-bids/:bidId" element={<BidDetailsPage />} />
        </Routes>
      </App>
    </BrowserRouter>
  );
}
