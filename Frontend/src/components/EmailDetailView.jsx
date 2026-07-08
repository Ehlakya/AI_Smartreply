import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Archive, Trash2, Mail, Star, Sparkles, RefreshCw, AlertCircle, Send, Paperclip, Copy, Languages, Plus, Minus, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailService } from '../services/email.service';
import { aiService } from '../services/ai.service';

export default function EmailDetailView({ email, onBack, onUpdate, onBulkAction }) {
  const [fullEmail, setFullEmail] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [replyTone, setReplyTone] = useState('Professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    emailService.getEmailById(email._id)
      .then(res => {
        if (isMounted) {
          setFullEmail(res.data.email);
          if (!email.isRead && onUpdate) {
            onUpdate();
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
      onBack();
    } catch (error) {
      toast.error('Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const tones = [
    'Professional', 'Formal', 'Friendly', 'Short & Simple', 'Detailed', 
    'Thank You', 'Apology', 'Follow-up', 'Meeting Confirmation', 'Custom Prompt'
  ];

  const generateAI = async (text, isRegenerate = false) => {
    if (isGenerating || isRefining) return;
    setIsGenerating(true);
    try {
      if (!isRegenerate) {
        const sumRes = await aiService.summarizeEmail(text);
        if (sumRes.isRateLimit) throw new Error(sumRes.message || 'Rate limit exceeded');
        if (sumRes.summary) setAiSummary(sumRes.summary);
      }

      const toneToUse = replyTone === 'Custom Prompt' ? customPrompt : replyTone;
      if (replyTone === 'Custom Prompt' && !customPrompt) {
        toast.error('Please enter a custom prompt.');
        setIsGenerating(false);
        return;
      }

      const repRes = await aiService.generateReply(text, toneToUse);
      if (repRes.isRateLimit) throw new Error(repRes.message || 'Rate limit exceeded');
      if (repRes.reply) setAiReply(repRes.reply);
      
      toast.success(isRegenerate ? 'Regenerated successfully!' : 'Groq AI generated successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Groq AI generation failed.';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const refineReply = async (instruction) => {
    if (!aiReply || isGenerating || isRefining) return;
    setIsRefining(true);
    try {
      const res = await aiService.refineReply(aiReply, instruction);
      if (res.isRateLimit) throw new Error(res.message || 'Rate limit exceeded');
      if (res.reply) setAiReply(res.reply);
      toast.success('Reply refined!');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to refine reply.';
      toast.error(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiReply);
    toast.success('Copied to clipboard!');
  };

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
          {onBulkAction && (
            <>
              <button onClick={() => onBulkAction('archive', [email._id])} className="p-2 hover:bg-white/10 rounded-full transition" title="Archive"><Archive className="w-5 h-5" /></button>
              <button onClick={() => onBulkAction('trash', [email._id])} className="p-2 hover:bg-danger/20 text-danger rounded-full transition" title="Delete"><Trash2 className="w-5 h-5" /></button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg">
          {fullEmail ? (
            <div className="flex flex-col">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${fullEmail.senderName || fullEmail.senderEmail}`} 
                    className="w-12 h-12 rounded-full bg-white/10 p-1"
                    alt="avatar"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="font-bold text-lg truncate">{fullEmail.senderName || fullEmail.senderEmail.split('@')[0]}</div>
                    <div className="text-xs text-foreground/60 truncate">&lt;{fullEmail.senderEmail}&gt;</div>
                  </div>
                </div>
                <div className="text-sm text-foreground/50 whitespace-nowrap ml-4">
                  {new Date(fullEmail.receivedAt).toLocaleString()}
                </div>
              </div>

              <div className="mb-6 space-y-1 text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex gap-2">
                  <span className="text-foreground/50 w-8">To:</span>
                  <span className="truncate">{fullEmail.receiverEmail}</span>
                </div>
                {fullEmail.cc && (
                  <div className="flex gap-2">
                    <span className="text-foreground/50 w-8">CC:</span>
                    <span className="truncate">{fullEmail.cc}</span>
                  </div>
                )}
                {fullEmail.bcc && (
                  <div className="flex gap-2">
                    <span className="text-foreground/50 w-8">BCC:</span>
                    <span className="truncate">{fullEmail.bcc}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                <h3 className="font-bold text-xl">{fullEmail.subject}</h3>
              </div>

              {fullEmail.attachments && typeof fullEmail.attachments === 'object' && Object.keys(fullEmail.attachments).length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {Array.isArray(fullEmail.attachments) ? fullEmail.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm border border-white/10">
                      <Paperclip className="w-4 h-4 text-primary" />
                      <span className="truncate max-w-[150px]">{att.filename || 'Attachment'}</span>
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm border border-white/10">
                      <Paperclip className="w-4 h-4 text-primary" />
                      <span className="truncate max-w-[150px]">Attachments Available</span>
                    </div>
                  )}
                </div>
              )}

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

        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-6 rounded-2xl border border-primary/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-primary w-7 h-7" />
              <h3 className="text-xl font-bold">AI Reply Assistant</h3>
            </div>

            {aiSummary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h4 className="font-semibold text-sm mb-2 text-foreground/70 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Email Summary
                </h4>
                <p className="bg-background/50 backdrop-blur-sm p-4 rounded-xl text-sm border-l-4 border-l-secondary leading-relaxed">{aiSummary}</p>
              </motion.div>
            )}

            {!aiReply && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 bg-background/50 p-4 rounded-xl border border-white/10">
                  <span className="text-sm font-semibold text-foreground/80">Select Style:</span>
                  <select 
                    value={replyTone}
                    onChange={(e) => setReplyTone(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-primary/50 flex-1 min-w-[200px]"
                  >
                    {tones.map(t => (
                      <option key={t} value={t} className="bg-background">{t}</option>
                    ))}
                  </select>
                </div>

                {replyTone === 'Custom Prompt' && (
                  <input
                    type="text"
                    placeholder="E.g., Tell them I am on vacation until next Monday..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
                  />
                )}

                <button 
                  onClick={() => generateAI(fullEmail?.body || email.snippet)}
                  disabled={!fullEmail || isGenerating}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-primary/50 transition flex justify-center items-center gap-2 disabled:opacity-50 hover:-translate-y-0.5"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Generate AI Reply'}
                </button>
              </div>
            )}

            {aiReply && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-foreground/70 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Edit & Refine Draft
                  </h4>
                </div>
                
                <div className="relative">
                  {isRefining && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                  <textarea 
                    value={aiReply}
                    onChange={(e) => setAiReply(e.target.value)}
                    className="w-full bg-background/80 backdrop-blur-md border border-white/20 rounded-xl p-5 text-sm min-h-[250px] outline-none focus:border-primary shadow-inner transition-colors custom-scrollbar leading-relaxed resize-y"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => generateAI(fullEmail?.body || email.snippet, true)} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </button>
                  <button onClick={() => refineReply('Improve grammar and clarity')} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Improve
                  </button>
                  <button onClick={() => refineReply('Make it shorter and more concise')} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <Minus className="w-3.5 h-3.5" /> Shorter
                  </button>
                  <button onClick={() => refineReply('Make it longer and more detailed')} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Longer
                  </button>
                  <button onClick={() => refineReply('Make the tone more formal and professional')} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5" /> Professional
                  </button>
                  <button onClick={() => refineReply('Make the tone more friendly and casual')} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Friendly
                  </button>
                  <button onClick={() => refineReply('Translate to Spanish')} disabled={isRefining} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" /> Translate
                  </button>
                  <div className="flex-1"></div>
                  <button onClick={copyToClipboard} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button 
                    onClick={handleSendReply}
                    disabled={isSending || !aiReply}
                    className="px-8 py-3 rounded-xl bg-success hover:bg-success/80 text-white text-sm font-bold shadow-lg shadow-success/20 transition flex gap-2 items-center disabled:opacity-50 hover:-translate-y-0.5"
                  >
                    {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isSending ? 'Sending via Gmail...' : 'Send Reply'}
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
