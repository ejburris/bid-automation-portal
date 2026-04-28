import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Bids from "./pages/Bids";
import Parameters from "./pages/Parameters";
import ImportParameters from "./pages/ImportParameters";
import ParametersSetup from "./pages/ParametersSetup";
import Addendums from "./pages/Addendums";
import FollowUps from "./pages/FollowUps";
import Integration from "./pages/Integration";
import OutlookSettings from "./pages/OutlookSettings";
import GoogleDriveSettings from "./pages/GoogleDriveSettings";
import { DashboardNav } from "./components/DashboardNav";
import ProposalDetail from "./pages/ProposalDetail";
import ProposalPreviewPage from "./pages/ProposalPreviewPage";
import ProposalView from "./pages/ProposalView";
import PipelineView from "./pages/PipelineView";
import GenerateProposal from "./pages/GenerateProposal";
import AwardTracking from "./pages/AwardTracking";
import NewBid from "./pages/NewBid";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/bids" component={Bids} />
      <Route path="/pipeline" component={PipelineView} />
      <Route path="/new-bid" component={NewBid} />
      <Route path="/proposals/:bidId" component={ProposalDetail} />
      <Route path="/proposal-view/:bidId" component={ProposalView} />
      <Route path="/proposal-preview/:bidId" component={ProposalPreviewPage} />
      <Route path="/proposals/new" component={GenerateProposal} />
      <Route path="/parameters" component={Parameters} />
      <Route path="/parameters/setup" component={ParametersSetup} />
      <Route path="/import" component={ImportParameters} />
      <Route path="/addendums" component={Addendums} />
      <Route path="/followups" component={FollowUps} />
      <Route path="/integration" component={Integration} />
      <Route path="/settings/outlook" component={OutlookSettings} />
      <Route path="/settings/google-drive" component={GoogleDriveSettings} />
      <Route path="/award-tracking" component={AwardTracking} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <DashboardNav />
          <main className="container mx-auto px-4 py-8">
            <Router />
          </main>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
