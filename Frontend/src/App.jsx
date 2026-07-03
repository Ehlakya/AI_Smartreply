import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SyncScreen from './pages/SyncScreen';
import InboxPage from './pages/InboxPage';

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
                  <Route path="priority" element={<div className="p-8 glass rounded-3xl h-full">Priority Mail View</div>} />
                  <Route path="team" element={<div className="p-8 glass rounded-3xl h-full">Team Mail View</div>} />
                  <Route path="others" element={<div className="p-8 glass rounded-3xl h-full">Other Mail View</div>} />
                  <Route path="spam" element={<div className="p-8 glass rounded-3xl h-full">Spam View</div>} />
                  <Route path="sent" element={<div className="p-8 glass rounded-3xl h-full">Sent Mail View</div>} />
                  <Route path="drafts" element={<div className="p-8 glass rounded-3xl h-full">Drafts View</div>} />
                  <Route path="starred" element={<div className="p-8 glass rounded-3xl h-full">Starred Mail View</div>} />
                  <Route path="trash" element={<div className="p-8 glass rounded-3xl h-full">Trash View</div>} />
                  
                  <Route path="ai" element={<div className="p-8 glass rounded-3xl h-full">AI Assistant View</div>} />
                  <Route path="history" element={<div className="p-8 glass rounded-3xl h-full">AI History View</div>} />
                  <Route path="contacts" element={<div className="p-8 glass rounded-3xl h-full">Contacts View</div>} />
                  <Route path="settings" element={<div className="p-8 glass rounded-3xl h-full">Settings View</div>} />
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
