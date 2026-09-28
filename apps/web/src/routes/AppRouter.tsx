// Top-level route table. Maps URL paths to page components under src/pages/.
// TODO: populate remaining routes as each Stitch screen is implemented
// (documents, intelligence, verification, consent, audit, settings).

import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { App } from '@/app/App';
import { HomePage } from '@/pages/home/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { RequireBidderAuth } from '@/routes/RequireBidderAuth';
import { RequireOfficerAuth } from '@/routes/RequireOfficerAuth';
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
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/officer/login" element={<OfficerLoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/officer/dashboard" element={<RequireOfficerAuth><OfficerDashboardPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders" element={<RequireOfficerAuth><OfficerTendersPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders/new" element={<RequireOfficerAuth><CreateTenderInfoPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders/new/documents" element={<RequireOfficerAuth><CreateTenderDocumentsPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders/new/requirements" element={<RequireOfficerAuth><CreateTenderRequirementsPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders/new/rules" element={<RequireOfficerAuth><CreateTenderRulesPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders/new/review" element={<RequireOfficerAuth><CreateTenderReviewPage /></RequireOfficerAuth>} />
          <Route path="/officer/tenders/:tenderNumber" element={<RequireOfficerAuth><TenderViewPage /></RequireOfficerAuth>} />
          <Route path="/officer/bids" element={<RequireOfficerAuth><BidAssessmentWorkspacePage /></RequireOfficerAuth>} />
          <Route path="/officer/bids/:bidId" element={<RequireOfficerAuth><BidResultPage /></RequireOfficerAuth>} />
          {/* Older URL family kept working — same components, one workspace. */}
          <Route path="/officer/assessment" element={<RequireOfficerAuth><BidAssessmentWorkspacePage /></RequireOfficerAuth>} />
          <Route path="/officer/assessment/:bidId" element={<RequireOfficerAuth><BidResultPage /></RequireOfficerAuth>} />
          <Route path="/officer/reviews" element={<RequireOfficerAuth><ReviewsPage /></RequireOfficerAuth>} />
          <Route path="/officer/verification" element={<RequireOfficerAuth><VerificationPage /></RequireOfficerAuth>} />
          <Route path="/officer/audit" element={<RequireOfficerAuth><AuditTrailPage /></RequireOfficerAuth>} />
          {/* Public reads — no login required, matches the gateway's /api/tenders permissions */}
          <Route path="/tenders" element={<TenderListingPage />} />
          <Route path="/tenders/:ref" element={<TenderDetailsPage />} />
          {/* Bidder-only — real session required, matches the gateway's requireAuth routes */}
          <Route path="/dashboard" element={<RequireBidderAuth><DashboardPage /></RequireBidderAuth>} />
          <Route path="/tenders/:ref/bid/1" element={<RequireBidderAuth><BidStep1Page /></RequireBidderAuth>} />
          <Route path="/tenders/:ref/bid/2" element={<RequireBidderAuth><BidStep2Page /></RequireBidderAuth>} />
          <Route path="/tenders/:ref/bid/3" element={<RequireBidderAuth><BidStep3Page /></RequireBidderAuth>} />
          <Route path="/my-bids" element={<RequireBidderAuth><MyBidsPage /></RequireBidderAuth>} />
          <Route path="/my-bids/:bidId" element={<RequireBidderAuth><BidDetailsPage /></RequireBidderAuth>} />
        </Routes>
      </App>
    </BrowserRouter>
  );
}
