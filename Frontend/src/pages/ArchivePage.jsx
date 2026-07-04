import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService } from '../services/email.service';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, Mail, Paperclip, ChevronLeft, Search, ChevronRight, Archive, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from 'use-debounce';
import BulkActionBar from '../components/BulkActionBar';
import { showUndoToast } from '../utils/toastUtils';

export default function ArchivePage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const token = localStorage.getItem('accessToken');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['archive', user?._id, page, debouncedSearch],
    queryFn: () => emailService.getArchive(page, 20, debouncedSearch),
    keepPreviousData: true,
    enabled: !!token && !!user?._id
  });

  const emails = data?.data?.emails || [];
  const totalPages = data?.data?.totalPages || 1;

  const handleRefresh = () => queryClient.invalidateQueries(['archive']);

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
    
    const inverseActions = {
      archive: 'unarchive',
      trash: 'restore',
      spam: 'unspam',
      read: 'unread',
      unread: 'read'
    };

    try {
      await emailService.bulkAction(ids, action);
      queryClient.invalidateQueries(['archive']);
      setSelectedEmails(new Set());
      
      if (['unarchive', 'trash', 'spam'].includes(action)) {
        showUndoToast(`Emails moved.`, async () => {
          await emailService.bulkAction(ids, action === 'unarchive' ? 'archive' : inverseActions[action]);
          queryClient.invalidateQueries(['archive']);
          toast.success('Action undone');
        });
      } else {
        toast.success('Action completed');
      }

      if (selectedEmail && ids.includes(selectedEmail._id) && ['unarchive', 'trash', 'spam'].includes(action)) {
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

  return (
    <div className="flex h-full relative overflow-hidden glass rounded-[2.5rem]">
      
      <BulkActionBar 
        selectedCount={selectedEmails.size}
        onClearSelection={() => setSelectedEmails(new Set())}
        onBulkAction={handleBulkAction}
        isProcessing={isProcessing}
        folder="archive"
      />

      <div className={`min-w-0 w-full h-full flex flex-col transition-all duration-300 ${selectedEmail ? 'md:w-1/3 border-r border-white/10 hidden md:flex' : 'w-full'}`}>
        
        <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Archive</h1>
            <button 
              onClick={handleRefresh} 
              disabled={isFetching}
              className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text"
              placeholder="Search archive..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-w-0 relative">
          {isFetching && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10 flex items-center gap-2 z-10">
              <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
            </div>
          )}
          {emails.length === 0 ? (
            <div className="text-center mt-10 text-foreground/50">Archive is empty.</div>
          ) : (
            emails.map((email) => (
              <motion.div 
                key={email._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 rounded-2xl cursor-pointer transition border border-white/5 group ${
                  selectedEmail?._id === email._id ? 'bg-primary/20 border-primary/50' : 'bg-white/5 hover:bg-white/10'
                } ${!email.isRead ? 'border-l-4 border-l-primary' : ''} min-w-0 relative flex gap-3`}
              >
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
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${email.senderName || email.senderEmail}`} 
                        className="w-8 h-8 rounded-full bg-white/10 p-1 flex-shrink-0"
                        alt="avatar"
                      />
                      <div className="truncate font-semibold flex-1 min-w-0">
                        {email.senderName || email.senderEmail.split('@')[0]}
                      </div>
                    </div>
                    <span className="text-xs text-foreground/60 flex-shrink-0 ml-2">
                      {new Date(email.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className={`text-sm mb-1 truncate ${!email.isRead ? 'font-bold' : 'font-medium'}`}>{email.subject}</div>
                  <div className="text-xs text-foreground/60 truncate">{email.snippet}</div>
                  
                  <div className="mt-3 flex gap-2 justify-between items-center h-6">
                    <div className="flex gap-2">
                      {email.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      {email.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-foreground/60" />}
                    </div>
                    
                    <div className="hidden group-hover:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('unarchive', [email._id]); }} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Unarchive (Move to Inbox)"><Archive className="w-4 h-4 rotate-180" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('trash', [email._id]); }} className="p-1.5 hover:bg-danger/20 text-danger rounded-lg transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

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

      <AnimatePresence>
        {selectedEmail && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute inset-0 md:relative md:flex-1 bg-background md:bg-transparent z-10 flex flex-col h-full"
          >
            <EmailDetailView email={selectedEmail} onBack={() => setSelectedEmail(null)} onUpdate={() => queryClient.invalidateQueries(['archive'])} onBulkAction={handleBulkAction} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmailDetailView({ email, onBack, onUpdate, onBulkAction }) {
  const [fullEmail, setFullEmail] = useState(null);

  useEffect(() => {
    let isMounted = true;
    emailService.getEmailById(email._id)
      .then(res => {
        if (isMounted) {
          setFullEmail(res.data.email);
          if (!email.isRead) {
            onUpdate();
          }
        }
      })
      .catch(() => toast.error('Failed to load email details.'));
    return () => { isMounted = false; };
  }, [email._id]);

  return (
    <div className="flex flex-col h-full w-full bg-background/50 backdrop-blur-md">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft /></button>
          <div className="flex-1 min-w-0 hidden md:block">
            <h2 className="text-xl font-bold truncate">{email.subject}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onBulkAction('unarchive', [email._id])} className="p-2 hover:bg-white/10 rounded-full transition" title="Unarchive (Move to Inbox)"><Archive className="w-5 h-5 rotate-180" /></button>
          <button onClick={() => onBulkAction('trash', [email._id])} className="p-2 hover:bg-danger/20 text-danger rounded-full transition" title="Delete"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg">
          {fullEmail ? (
            <div className="flex flex-col">
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${fullEmail.senderName || fullEmail.senderEmail}`} 
                    className="w-12 h-12 rounded-full bg-white/10 p-1"
                    alt="avatar"
                  />
                  <div>
                    <div className="font-bold text-lg">{fullEmail.senderName || fullEmail.senderEmail.split('@')[0]}</div>
                    <div className="text-sm text-foreground/60">{fullEmail.senderEmail}</div>
                  </div>
                </div>
                <div className="text-sm text-foreground/50">
                  {new Date(fullEmail.receivedAt).toLocaleString()}
                </div>
              </div>
              {fullEmail.htmlBody ? (
                 <div dangerouslySetInnerHTML={{ __html: fullEmail.htmlBody }} className="prose prose-invert max-w-none text-sm break-words" />
              ) : (
                 <div className="whitespace-pre-wrap text-sm font-sans">{fullEmail.body}</div>
              )}
            </div>
          ) : (
            <div className="flex justify-center p-10"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
