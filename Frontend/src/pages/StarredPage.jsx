import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService } from '../services/email.service';
import { aiService } from '../services/ai.service';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, Mail, Paperclip, ChevronLeft, Send, Sparkles, AlertCircle, Search, ChevronRight, Archive, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from 'use-debounce';

import BulkActionBar from '../components/BulkActionBar';
import { showUndoToast } from '../utils/toastUtils';

export default function StarredPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const token = localStorage.getItem('accessToken');

  // Fetch Starred Emails
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['starred', user?._id, page, debouncedSearch],
    queryFn: () => emailService.getStarred(page, 20, debouncedSearch),
    keepPreviousData: true,
    enabled: !!token && !!user?._id
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries(['starred']);
  };

  const handleToggleStar = async (e, email) => {
    e.stopPropagation();
    try {
      await emailService.toggleStar(email._id, !email.isStarred);
      toast.success(email.isStarred ? 'Removed from starred' : 'Starred successfully');
      queryClient.invalidateQueries(['starred']);
      if (selectedEmail?._id === email._id && email.isStarred) {
        setSelectedEmail(null);
      }
    } catch (error) {
      toast.error('Failed to update star status');
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
    
    const inverseActions = {
      archive: 'unarchive',
      trash: 'restore',
      spam: 'unspam',
      read: 'unread',
      unread: 'read'
    };

    try {
      await emailService.bulkAction(ids, action);
      queryClient.invalidateQueries(['starred']);
      setSelectedEmails(new Set());
      
      if (['archive', 'trash', 'spam', 'unstar'].includes(action)) {
        showUndoToast(`Action completed.`, async () => {
          await emailService.bulkAction(ids, action === 'unstar' ? 'star' : inverseActions[action]);
          queryClient.invalidateQueries(['starred']);
          toast.success('Action undone');
        });
      } else {
        toast.success('Action completed');
      }

      if (selectedEmail && ids.includes(selectedEmail._id) && ['archive', 'trash', 'spam', 'unstar'].includes(action)) {
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
        folder="starred"
      />

      {/* Email List View */}
      <div className={`min-w-0 w-full h-full flex flex-col transition-all duration-300 ${selectedEmail ? 'md:w-1/3 border-r border-white/10 hidden md:flex' : 'w-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Starred</h1>
            <button 
              onClick={handleRefresh} 
              disabled={isFetching}
              className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50"
              title="Refresh Starred"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text"
              placeholder="Search starred emails..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset page on new search
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
            <div className="text-center mt-10 text-foreground/50">No starred emails found.</div>
          ) : (
            emails.map((email) => (
              <motion.div 
                key={email._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 rounded-2xl cursor-pointer transition border border-white/5 group ${
                  selectedEmail?._id === email._id ? 'bg-primary/20 border-primary/50' : 'bg-white/5 hover:bg-white/10'
                } ${!email.isRead ? 'border-l-4 border-l-primary' : ''} min-w-0 flex gap-3`}
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
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${email.senderName || email.senderEmail}`} 
                      className="w-10 h-10 rounded-full bg-white/10 p-1 flex-shrink-0"
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
                    
                    {/* Hover Quick Actions */}
                    <div className="hidden group-hover:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('archive', [email._id]); }} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Archive"><Archive className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('trash', [email._id]); }} className="p-1.5 hover:bg-danger/20 text-danger rounded-lg transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction(email.isRead ? 'unread' : 'read', [email._id]); }} className="p-1.5 hover:bg-white/20 rounded-lg transition" title={email.isRead ? "Mark Unread" : "Mark Read"}><Mail className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBulkAction('unstar', [email._id]); }} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Unstar"><Star className={`w-4 h-4 text-yellow-400 fill-yellow-400`} /></button>
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
            <EmailDetailView email={selectedEmail} onBack={() => setSelectedEmail(null)} onUpdate={() => queryClient.invalidateQueries(['starred'])} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Component for viewing a single email and interacting with Groq AI
 */
function EmailDetailView({ email, onBack, onUpdate }) {
  const [fullEmail, setFullEmail] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [replyTone, setReplyTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isSending, setIsSending] = useState(false);

  // Fetch full email details on mount
  useEffect(() => {
    let isMounted = true;
    emailService.getEmailById(email._id)
      .then(res => {
        if (isMounted) {
          setFullEmail(res.data.email);
          if (!email.isRead) {
            onUpdate(); // Trigger refresh if it was unread so list updates
          }
        }
      })
      .catch(() => toast.error('Failed to load email details.'));
    
    return () => { isMounted = false; };
  }, [email._id]);

  const handleSendReply = async () => {
    if (!aiReply) return;
    setIsSending(true);
    try {
      await emailService.sendReply(email._id, aiReply, `Re: ${email.subject}`);
      toast.success('Reply sent successfully via Gmail!');
      setAiReply('');
    } catch (error) {
      toast.error('Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const tones = [
    'Professional', 'Friendly', 'Formal', 'Quick', 'Detailed', 
    'Meeting Confirmation', 'Thank You', 'Apology'
  ];

  const generateAI = async (text) => {
    setIsGenerating(true);
    try {
      const sumRes = await aiService.summarizeEmail(text);
      if (sumRes.summary) setAiSummary(sumRes.summary);

      const repRes = await aiService.generateReply(text, replyTone);
      if (repRes.reply) setAiReply(repRes.reply);
      
      toast.success('Groq AI generated successfully!');
    } catch (error) {
      toast.error('Groq AI generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background/50 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/5 shrink-0">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{email.subject}</h2>
          <p className="text-sm text-foreground/60 truncate">{email.senderName} &lt;{email.senderEmail}&gt;</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Full Email Body */}
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

        {/* AI Actions */}
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-6 rounded-2xl border border-primary/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-primary w-7 h-7" />
              <h3 className="text-xl font-bold">Groq AI Assistant</h3>
            </div>

            <button 
              onClick={() => generateAI(fullEmail?.body || email.snippet)}
              disabled={!fullEmail || isGenerating}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-primary/50 transition flex justify-center items-center gap-2 disabled:opacity-50 hover:-translate-y-0.5"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Generate Summary & Reply'}
            </button>

            {aiSummary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <h4 className="font-semibold text-sm mb-2 text-foreground/70 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> AI Summary
                </h4>
                <p className="bg-background/50 backdrop-blur-sm p-4 rounded-xl text-sm border-l-4 border-l-secondary leading-relaxed">{aiSummary}</p>
              </motion.div>
            )}

            {aiReply && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-sm text-foreground/70 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Draft Reply
                  </h4>
                  <div className="flex items-center gap-2 bg-background/50 px-2 py-1 rounded-lg border border-white/10">
                    <span className="text-xs text-foreground/60">Tone:</span>
                    <select 
                      value={replyTone}
                      onChange={(e) => setReplyTone(e.target.value)}
                      className="bg-transparent text-xs font-semibold outline-none cursor-pointer"
                    >
                      {tones.map(t => (
                        <option key={t} value={t} className="bg-background">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea 
                  value={aiReply}
                  onChange={(e) => setAiReply(e.target.value)}
                  className="w-full bg-background/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-sm min-h-[150px] outline-none focus:border-primary/50 transition-colors custom-scrollbar leading-relaxed"
                />
                <div className="mt-4 flex justify-end gap-3">
                  <button 
                    onClick={() => generateAI(fullEmail?.body || email.snippet)} 
                    disabled={isGenerating || isSending}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <button 
                    onClick={handleSendReply}
                    disabled={isSending || !aiReply}
                    className="px-6 py-2 rounded-xl bg-success hover:bg-success/80 text-white text-sm font-bold shadow-lg shadow-success/20 transition flex gap-2 items-center disabled:opacity-50 hover:-translate-y-0.5"
                  >
                    {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
