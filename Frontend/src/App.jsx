import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SyncScreen from './pages/SyncScreen';
import InboxPage from './pages/InboxPage';
import SentPage from './pages/SentPage';
import DraftsPage from './pages/DraftsPage';
import StarredPage from './pages/StarredPage';
import TrashPage from './pages/TrashPage';
import SpamPage from './pages/SpamPage';
import ArchivePage from './pages/ArchivePage';

import ConfigurationPage from './pages/ConfigurationPage';
import PriorityMailPage from './pages/PriorityMailPage';
import TeamMailPage from './pages/TeamMailPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/sync" element={<SyncScreen />} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<div className="p-8 glass rounded-3xl h-full"><h1 className="text-4xl font-bold text-primary">AI Mail Reply Assistant</h1><p className="mt-4 opacity-70">Welcome! Please select a folder from the sidebar.</p></div>} />
                  <Route path="dashboard" element={<div className="p-8 glass rounded-3xl h-full">Dashboard Analytics View</div>} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="priority" element={<PriorityMailPage />} />
                  <Route path="team" element={<TeamMailPage />} />
                  <Route path="settings" element={<ConfigurationPage />} />
                  <Route path="others" element={<div className="p-8 glass rounded-3xl h-full">Other Mail View</div>} />
                  <Route path="spam" element={<SpamPage />} />
                  <Route path="archive" element={<ArchivePage />} />
                  <Route path="sent" element={<SentPage />} />
                  <Route path="drafts" element={<DraftsPage />} />
                  <Route path="starred" element={<StarredPage />} />
                  <Route path="trash" element={<TrashPage />} />
                  
                  <Route path="ai" element={<div className="p-8 glass rounded-3xl h-full">AI Assistant View</div>} />
                  <Route path="history" element={<div className="p-8 glass rounded-3xl h-full">AI History View</div>} />
                  <Route path="contacts" element={<div className="p-8 glass rounded-3xl h-full">Contacts View</div>} />
                </Route>
              </Route>
            </Routes>
            <Toaster position="bottom-right" />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
