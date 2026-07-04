import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const PriorityBadge = ({ email }) => {
  const { aiPriority } = email;
  if (aiPriority === 'High') return <span className="flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs font-semibold shrink-0">🔴 High Priority</span>;
  if (aiPriority === 'Medium') return <span className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs font-semibold shrink-0">🟡 Medium Priority</span>;
  if (aiPriority === 'Low') return <span className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs font-semibold shrink-0">🟢 Low Priority</span>;
  return null;
};

export default function CategorizedEmailList({ 
  title, 
  icon: Icon,
  emails, 
  isLoading, 
  isFetching,
  page,
  totalPages,
  setPage,
  searchTerm,
  setSearchTerm,
  onRefresh
}) {
  return (
    <div className="p-8 glass rounded-3xl h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 text-primary rounded-2xl">
            <Icon size={24} />
          </div>
          <h1 className="text-3xl font-bold text-primary">{title}</h1>
          {isFetching && <div className="ml-4 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="relative w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search emails..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-white/5 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-white/50 space-y-4">
            <AlertCircle size={48} className="opacity-20" />
            <p className="text-lg">No emails found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {emails.map((email) => (
                <motion.div
                  key={email._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 p-5 rounded-2xl cursor-pointer transition-colors border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 group flex flex-col gap-3 shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-gradient-to-br from-primary/40 to-purple-500/40 flex items-center justify-center text-primary dark:text-white font-bold text-lg border border-primary/20 dark:border-white/10">
                        {email.senderName ? email.senderName.charAt(0).toUpperCase() : email.senderEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {email.senderName || email.senderEmail}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-white/50">{email.subject}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-gray-400 dark:text-white/40 whitespace-nowrap">
                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                      </span>
                      <PriorityBadge email={email} />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-white/60 line-clamp-2 pl-14">
                    {email.snippet}
                  </p>

                  {email.aiReason && (
                    <div className="ml-14 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 flex gap-3 mt-1">
                      <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-800 dark:text-white/80">{email.aiReason}</p>
                        <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1">AI Confidence: {email.aiConfidence}%</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
          <span className="text-sm text-gray-500 dark:text-white/50">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white disabled:opacity-50 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white disabled:opacity-50 rounded-xl transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
