import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService } from '../services/email.service';
import { aiService } from '../services/ai.service';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, Mail, Paperclip, ChevronLeft, Send, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InboxPage() {
  const [page, setPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem('accessToken');

  // Fetch Inbox Emails
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['inbox', page],
    queryFn: () => emailService.getInbox(page, 20),
    keepPreviousData: true,
    enabled: !!token
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: () => emailService.syncEmails(),
    onSuccess: (res) => {
      toast.success(`Synced ${res.data?.syncedCount || 0} new emails!`);
      queryClient.invalidateQueries(['inbox']);
    },
    onError: () => toast.error('Failed to sync emails.')
  });

  const handleRefresh = () => syncMutation.mutate();

  if (isLoading && !data) {
    return <div className="flex h-full items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const emails = data?.data?.emails || [];

  return (
    <div className="flex h-full relative overflow-hidden glass rounded-[2.5rem]">
      {/* Email List View */}
      <div className={`w-full h-full flex flex-col transition-all duration-300 ${selectedEmail ? 'md:w-1/3 border-r border-white/10 hidden md:flex' : 'w-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <button 
            onClick={handleRefresh} 
            disabled={syncMutation.isLoading || isFetching}
            className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncMutation.isLoading || isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {emails.length === 0 ? (
            <div className="text-center mt-10 text-foreground/50">No emails found.</div>
          ) : (
            emails.map((email) => (
              <motion.div 
                key={email._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 rounded-2xl cursor-pointer transition border border-white/5 ${
                  selectedEmail?._id === email._id ? 'bg-primary/20 border-primary/50' : 'bg-white/5 hover:bg-white/10'
                } ${!email.isRead ? 'border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${email.senderName || email.senderEmail}`} 
                      className="w-10 h-10 rounded-full bg-white/10 p-1"
                      alt="avatar"
                    />
                    <div className="truncate w-32 md:w-48 font-semibold">
                      {email.senderName || email.senderEmail.split('@')[0]}
                    </div>
                  </div>
                  <span className="text-xs text-foreground/60">
                    {new Date(email.receivedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="text-sm font-medium mb-1 truncate">{email.subject}</div>
                <div className="text-xs text-foreground/60 truncate">{email.snippet}</div>
                
                <div className="mt-3 flex gap-2">
                  {email.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                  {email.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-foreground/60" />}
                </div>
              </motion.div>
            ))
          )}
        </div>
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
            <EmailDetailView email={selectedEmail} onBack={() => setSelectedEmail(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Component for viewing a single email and interacting with Groq AI
 */
function EmailDetailView({ email, onBack }) {
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
      .then(res => { if(isMounted) setFullEmail(res.data.email); })
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/5">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 md:hidden"><ChevronLeft /></button>
        <div className="flex-1">
          <h2 className="text-xl font-bold truncate">{email.subject}</h2>
          <p className="text-sm text-foreground/60">{email.senderName} &lt;{email.senderEmail}&gt;</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Full Email Body */}
        <div className="bg-white/5 p-6 rounded-2xl">
          {fullEmail ? (
            fullEmail.htmlBody ? (
               <div dangerouslySetInnerHTML={{ __html: fullEmail.htmlBody }} className="prose prose-invert max-w-none text-sm" />
            ) : (
               <div className="whitespace-pre-wrap text-sm">{fullEmail.body}</div>
            )
          ) : (
            <div className="flex justify-center"><RefreshCw className="w-6 h-6 animate-spin" /></div>
          )}
        </div>

        {/* AI Actions */}
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-6 rounded-2xl border border-primary/30">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-primary w-6 h-6" />
            <h3 className="text-lg font-bold">Groq AI Assistant</h3>
          </div>

          <button 
            onClick={() => generateAI(fullEmail?.body || email.snippet)}
            disabled={!fullEmail || isGenerating}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-primary/50 transition flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Generate Summary & Reply'}
          </button>

          {aiSummary && (
            <div className="mt-6">
              <h4 className="font-semibold text-sm mb-2 text-foreground/70">AI Summary</h4>
              <p className="bg-white/10 p-4 rounded-xl text-sm border-l-4 border-l-secondary">{aiSummary}</p>
            </div>
          )}

          {aiReply && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm text-foreground/70">Draft Reply ({replyTone})</h4>
                <select 
                  value={replyTone}
                  onChange={(e) => setReplyTone(e.target.value)}
                  className="bg-background border border-white/10 rounded-lg px-2 py-1 text-xs outline-none"
                >
                  {tones.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <textarea 
                value={aiReply}
                onChange={(e) => setAiReply(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm min-h-[150px] outline-none focus:border-primary/50"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button 
                  onClick={() => generateAI(fullEmail?.body || email.snippet)} 
                  disabled={isGenerating || isSending}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button 
                  onClick={handleSendReply}
                  disabled={isSending || !aiReply}
                  className="px-6 py-2 rounded-lg bg-success hover:bg-success/80 text-white text-sm font-bold shadow-lg shadow-success/20 transition flex gap-2 items-center disabled:opacity-50"
                >
                  {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
