// Top-level route table. Maps URL paths to page components under src/pages/.
// TODO: populate remaining routes as each Stitch screen is implemented
// (documents, intelligence, verification, consent, audit, settings).

import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { App } from '@/app/App';
import { HomePage } from '@/pages/home/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OfficerLoginPage } from '@/pages/auth/OfficerLoginPage';
import { LogoutPage } from '@/pages/auth/LogoutPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerTendersPage } from '@/pages/officer/OfficerTendersPage';
import { TenderViewPage } from '@/pages/officer/tenders/TenderViewPage';
import { CreateTenderInfoPage } from '@/pages/officer/CreateTenderInfoPage';
import { CreateTenderDocumentsPage } from '@/pages/officer/CreateTenderDocumentsPage';
import { CreateTenderRequirementsPage } from '@/pages/officer/CreateTenderRequirementsPage';
import { CreateTenderRulesPage } from '@/pages/officer/CreateTenderRulesPage';
import { CreateTenderReviewPage } from '@/pages/officer/CreateTenderReviewPage';
import { BidAssessmentWorkspacePage } from '@/pages/officer/bids/BidAssessmentWorkspacePage';
import { BidResultPage } from '@/pages/officer/bids/BidResultPage';
import { AuditTrailPage } from '@/pages/officer/audit/AuditTrailPage';
import { ReviewsPage } from '@/pages/officer/reviews/ReviewsPage';
import { VerificationPage } from '@/pages/officer/verification/VerificationPage';
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
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/officer/dashboard" element={<OfficerDashboardPage />} />
          <Route path="/officer/tenders" element={<OfficerTendersPage />} />
          <Route path="/officer/tenders/new" element={<CreateTenderInfoPage />} />
          <Route path="/officer/tenders/new/documents" element={<CreateTenderDocumentsPage />} />
          <Route path="/officer/tenders/new/requirements" element={<CreateTenderRequirementsPage />} />
          <Route path="/officer/tenders/new/rules" element={<CreateTenderRulesPage />} />
          <Route path="/officer/tenders/new/review" element={<CreateTenderReviewPage />} />
          <Route path="/officer/tenders/:slug" element={<TenderViewPage />} />
          <Route path="/officer/bids" element={<BidAssessmentWorkspacePage />} />
          <Route path="/officer/bids/:ref/:bidId" element={<BidResultPage />} />
          {/* Older URL family kept working — same components, one workspace. */}
          <Route path="/officer/assessment" element={<BidAssessmentWorkspacePage />} />
          <Route path="/officer/assessment/:ref/:bidId" element={<BidResultPage />} />
          <Route path="/officer/reviews" element={<ReviewsPage />} />
          <Route path="/officer/verification" element={<VerificationPage />} />
          <Route path="/officer/audit" element={<AuditTrailPage />} />
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
