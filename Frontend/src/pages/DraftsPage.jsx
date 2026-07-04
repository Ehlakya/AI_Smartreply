import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emailService } from '../services/email.service';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Paperclip, ChevronLeft, Send, Trash2, Search, ChevronRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from 'use-debounce';

import BulkActionBar from '../components/BulkActionBar';
import { showUndoToast } from '../utils/toastUtils';

export default function DraftsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const token = localStorage.getItem('accessToken');

  // Fetch Drafts
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['drafts', user?._id, page, debouncedSearch],
    queryFn: () => emailService.getDrafts(page, 20, debouncedSearch),
    keepPreviousData: true,
    enabled: !!token && !!user?._id
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries(['drafts']);
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

    try {
      if (action === 'trash') {
        // Since they are drafts, we might want to just permanently delete them instead of trash
        await emailService.bulkDelete(ids);
        toast.success('Drafts deleted');
      } else {
        await emailService.bulkAction(ids, action);
        toast.success('Action completed');
      }
      
      queryClient.invalidateQueries(['drafts']);
      setSelectedEmails(new Set());
      
      if (selectedEmail && ids.includes(selectedEmail._id) && action === 'trash') {
        setSelectedEmail(null);
      }
    } catch (error) {
      toast.error('Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !data && page === 1 && !debouncedSearch) {
    return <div className="flex h-full items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const emails = data?.data?.emails || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="flex h-full relative overflow-hidden glass rounded-[2.5rem]">
      
      <BulkActionBar 
        selectedCount={selectedEmails.size}
        onClearSelection={() => setSelectedEmails(new Set())}
        onBulkAction={handleBulkAction}
        isProcessing={isProcessing}
        folder="drafts"
      />

      {/* Email List View */}
      <div className={`min-w-0 w-full h-full flex flex-col transition-all duration-300 ${selectedEmail ? 'md:w-1/3 border-r border-white/10 hidden md:flex' : 'w-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Drafts</h1>
            <button 
              onClick={handleRefresh} 
              disabled={isFetching}
              className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50"
              title="Refresh Drafts"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-w-0 relative">
          {isFetching && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10 flex items-center gap-2 z-10">
              <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
            </div>
          )}
          {emails.length === 0 ? (
            <div className="text-center mt-10 text-foreground/50">No drafts found.</div>
          ) : (
            emails.map((email) => (
              <motion.div 
                key={email._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 rounded-2xl cursor-pointer transition border border-white/5 group ${
                  selectedEmail?._id === email._id ? 'bg-primary/20 border-primary/50' : 'bg-white/5 hover:bg-white/10'
                } min-w-0 flex gap-3`}
              >
                {/* Checkbox Column */}
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
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-foreground/70 shrink-0">
                        {email.receiverEmail ? email.receiverEmail.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="truncate font-semibold flex-1 min-w-0">
                        {email.receiverEmail || '(No Recipient)'}
                      </div>
                    </div>
                    <span className="text-xs text-foreground/60 flex-shrink-0 ml-2">
                      {new Date(email.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium mb-1 truncate text-danger/80">Draft</div>
                  <div className="text-sm mb-1 truncate font-medium">{email.subject || '(No Subject)'}</div>
                  <div className="text-xs text-foreground/60 truncate">{email.snippet || '(No Body)'}</div>
                  
                  <div className="mt-3 flex gap-2 justify-between items-center h-6">
                    <div className="flex gap-2">
                      {email.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-foreground/60" />}
                    </div>

                    {/* Hover Quick Actions */}
                    <div className="hidden group-hover:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('trash', [email._id]); }} className="p-1.5 hover:bg-danger/20 text-danger rounded-lg transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {emails.length > 0 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
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
            className="absolute inset-0 md:relative md:flex-1 bg-background md:bg-transparent z-10 flex flex-col h-full"
          >
            <DraftDetailView 
              email={selectedEmail} 
              onBack={() => setSelectedEmail(null)} 
              onUpdate={() => {
                queryClient.invalidateQueries(['drafts']);
                setSelectedEmail(null);
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraftDetailView({ email, onBack, onUpdate }) {
  const [fullEmail, setFullEmail] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Editable fields
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Fetch full email details on mount
  useEffect(() => {
    let isMounted = true;
    emailService.getEmailById(email._id)
      .then(res => {
        if (isMounted) {
          const fetchedEmail = res.data.email;
          setFullEmail(fetchedEmail);
          setTo(fetchedEmail.receiverEmail || '');
          setSubject(fetchedEmail.subject === '(No Subject)' ? '' : (fetchedEmail.subject || ''));
          setBody(fetchedEmail.body || '');
        }
      })
      .catch(() => toast.error('Failed to load draft details.'));
    
    return () => { isMounted = false; };
  }, [email._id]);

  const handleUpdate = async () => {
    setIsProcessing(true);
    try {
      await emailService.updateDraft(email._id, to, subject, body);
      toast.success('Draft saved successfully!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save draft.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async () => {
    setIsProcessing(true);
    try {
      // First update the draft to ensure we send latest changes
      await emailService.updateDraft(email._id, to, subject, body);
      // Then send
      await emailService.sendDraft(email._id);
      toast.success('Draft sent successfully!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to send draft.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await emailService.deleteDraft(email._id);
      toast.success('Draft deleted.');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete draft.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background/50 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft /></button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">Edit Draft</h2>
          </div>
        </div>
        <button 
          onClick={handleDelete}
          disabled={isDeleting || isProcessing}
          className="p-2 rounded-full hover:bg-danger/20 text-danger transition disabled:opacity-50"
          title="Delete Draft"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col">
        {!fullEmail ? (
          <div className="flex justify-center p-10"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="flex flex-col h-full bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
            
            <div className="flex items-center gap-4">
              <span className="w-16 text-sm text-foreground/60 font-semibold">To:</span>
              <input 
                type="text" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                placeholder="Recipient Email"
                className="flex-1 bg-background/50 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-16 text-sm text-foreground/60 font-semibold">Subject:</span>
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Subject"
                className="flex-1 bg-background/50 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex flex-col flex-1 gap-2 pt-2">
              <span className="text-sm text-foreground/60 font-semibold">Message:</span>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 bg-background/50 border border-white/10 rounded-lg p-4 text-sm outline-none focus:border-primary/50 resize-none custom-scrollbar"
                placeholder="Type your message here..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button 
                onClick={handleUpdate}
                disabled={isProcessing || isDeleting}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-foreground text-sm font-bold shadow-lg transition flex gap-2 items-center disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
              <button 
                onClick={handleSend}
                disabled={isProcessing || isDeleting || !to}
                className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/80 text-white text-sm font-bold shadow-lg shadow-primary/20 transition flex gap-2 items-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
