import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService } from '../services/email.service';
import { aiService } from '../services/ai.service';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, Paperclip, ChevronLeft, Send, Sparkles, Search, Archive, Trash2, ShieldBan, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import BulkActionBar from '../components/BulkActionBar';
import { showUndoToast } from '../utils/toastUtils';
import EmailDetailView from '../components/EmailDetailView';

export default function SentPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  // Bulk selection state
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const token = localStorage.getItem('accessToken');

  // Fetch Sent Emails
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sent', user?._id, page, searchTerm],
    queryFn: () => emailService.getSent(page, 20, searchTerm),
    keepPreviousData: true,
    enabled: !!token && !!user?._id
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: () => emailService.syncEmails(),
    onSuccess: (res) => {
      toast.success(`Synced ${res.data?.syncedCount || 0} new emails!`);
      queryClient.invalidateQueries(['sent']);
    },
    onError: () => toast.error('Failed to sync emails.')
  });

  const handleRefresh = () => syncMutation.mutate();

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
  };

  const handleNextPage = () => {
    if (data?.data?.page < data?.data?.totalPages) {
      setPage(p => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  };

  const toggleSelection = (e, emailId) => {
    e.stopPropagation();
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  const handleBulkAction = async (action, ids = Array.from(selectedEmails)) => {
    if (!ids.length) return;
    setIsProcessing(true);
    
    // Determine the inverse action for undo
    const inverseActions = {
      archive: 'unarchive',
      trash: 'restore',
      spam: 'unspam',
      read: 'unread',
      unread: 'read'
    };

    try {
      await emailService.bulkAction(ids, action);
      queryClient.invalidateQueries(['sent']);
      setSelectedEmails(new Set());
      
      // If action is reversible (delete, archive), show undo toast
      if (['archive', 'trash', 'spam'].includes(action)) {
        showUndoToast(`Emails moved.`, async () => {
          await emailService.bulkAction(ids, inverseActions[action]);
          queryClient.invalidateQueries(['sent']);
          toast.success('Action undone');
        });
      } else {
        toast.success('Action completed');
      }

      if (selectedEmail && ids.includes(selectedEmail._id) && ['archive', 'trash', 'spam'].includes(action)) {
        setSelectedEmail(null);
      }
    } catch (error) {
      toast.error('Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !data) {
    return <div className="flex h-full items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const emails = data?.data?.emails || [];

  return (
    <div className="flex h-full relative overflow-hidden glass rounded-[2.5rem]">
      
      <BulkActionBar 
        selectedCount={selectedEmails.size}
        onClearSelection={() => setSelectedEmails(new Set())}
        onBulkAction={handleBulkAction}
        isProcessing={isProcessing}
        folder="sent"
      />

      {/* Email List View */}
      <div className={`min-w-0 w-full h-full flex flex-col transition-all duration-300 ${selectedEmail ? 'md:w-1/3 border-r border-white/10 hidden md:flex' : 'w-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Sent Mail</h1>
            <button 
              onClick={handleRefresh} 
              disabled={syncMutation.isLoading || isFetching}
              className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${syncMutation.isLoading || isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-foreground/40" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 bg-background/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Search sent emails..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-w-0">
          {emails.length === 0 ? (
            <div className="text-center mt-10 text-foreground/50">
              {searchTerm ? 'No sent emails match your search.' : 'No sent emails found.'}
            </div>
          ) : (
            emails.map((email) => (
              <motion.div 
                key={email._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 rounded-2xl cursor-pointer transition border border-white/5 group ${
                  selectedEmail?._id === email._id ? 'bg-primary/20 border-primary/50' : 'bg-white/5 hover:bg-white/10'
                } min-w-0 flex gap-3`}
              >
                {/* Checkbox */}
                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedEmails.has(email._id)}
                    onChange={(e) => toggleSelection(e, email._id)}
                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary cursor-pointer mt-1"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="truncate w-32 md:w-48 font-semibold text-sm">
                        To: {email.receiverEmail}
                      </div>
                    </div>
                    <span className="text-xs text-foreground/60 shrink-0 ml-2">
                      {new Date(email.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium mb-1 truncate">{email.subject}</div>
                  <div className="text-xs text-foreground/60 truncate">{email.snippet}</div>
                  
                  <div className="mt-3 flex gap-2 justify-between items-center h-6">
                    <div className="flex gap-2">
                      {email.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-foreground/60" />}
                    </div>

                    {/* Hover Quick Actions */}
                    <div className="hidden group-hover:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('archive', [email._id]); }} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Archive"><Archive className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('trash', [email._id]); }} className="p-1.5 hover:bg-danger/20 text-danger rounded-lg transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction(email.isStarred ? 'unstar' : 'star', [email._id]); }} className="p-1.5 hover:bg-white/20 rounded-lg transition" title={email.isStarred ? "Unstar" : "Star"}><Star className={`w-4 h-4 ${email.isStarred ? 'text-yellow-400 fill-yellow-400' : ''}`} /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
        
        {/* Pagination Controls */}
        {data?.data?.totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
            <button 
              onClick={handlePrevPage} 
              disabled={page === 1}
              className="px-3 py-1 text-sm bg-white/10 rounded disabled:opacity-50 hover:bg-white/20 transition"
            >
              Prev
            </button>
            <span className="text-xs text-foreground/60">Page {page} of {data.data.totalPages}</span>
            <button 
              onClick={handleNextPage} 
              disabled={page === data.data.totalPages}
              className="px-3 py-1 text-sm bg-white/10 rounded disabled:opacity-50 hover:bg-white/20 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Email Detail View */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute inset-0 md:relative md:flex-1 bg-background md:bg-transparent z-10 flex flex-col h-full min-w-0"
          >
            <EmailDetailView email={selectedEmail} onBack={() => setSelectedEmail(null)} onUpdate={() => queryClient.invalidateQueries(['sent'])} onBulkAction={handleBulkAction} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

