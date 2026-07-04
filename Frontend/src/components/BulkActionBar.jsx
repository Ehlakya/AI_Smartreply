import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Archive, Mail, MailOpen, Star, AlertOctagon, X, CheckSquare, ShieldBan } from 'lucide-react';

export default function BulkActionBar({ 
  selectedCount, 
  onClearSelection, 
  onBulkAction, 
  isProcessing,
  folder
}) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-primary/90 backdrop-blur-xl text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20"
      >
        <div className="flex items-center gap-2 border-r border-white/20 pr-4">
          <CheckSquare className="w-4 h-4" />
          <span className="font-bold text-sm">{selectedCount} Selected</span>
          <button onClick={onClearSelection} className="ml-2 p-1 hover:bg-white/20 rounded-full transition">
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {folder !== 'trash' && folder !== 'drafts' && (
            <>
              {folder !== 'archive' && (
                <ActionButton icon={<Archive className="w-4 h-4" />} title="Archive" onClick={() => onBulkAction('archive')} disabled={isProcessing} />
              )}
              {folder === 'archive' && (
                <ActionButton icon={<Archive className="w-4 h-4 rotate-180" />} title="Unarchive" onClick={() => onBulkAction('unarchive')} disabled={isProcessing} />
              )}
              {folder !== 'spam' && (
                <ActionButton icon={<ShieldBan className="w-4 h-4" />} title="Report Spam" onClick={() => onBulkAction('spam')} disabled={isProcessing} />
              )}
              <ActionButton icon={<Trash2 className="w-4 h-4" />} title="Delete" onClick={() => onBulkAction('trash')} disabled={isProcessing} />
            </>
          )}

          {folder === 'drafts' && (
             <ActionButton icon={<Trash2 className="w-4 h-4" />} title="Delete Drafts" onClick={() => onBulkAction('trash')} disabled={isProcessing} />
          )}

          {folder === 'trash' && (
            <>
              <ActionButton icon={<Archive className="w-4 h-4" />} title="Restore" onClick={() => onBulkAction('restore')} disabled={isProcessing} />
              <ActionButton icon={<Trash2 className="w-4 h-4 text-red-200" />} title="Delete Forever" onClick={() => onBulkAction('permanent_delete')} disabled={isProcessing} />
            </>
          )}

          {folder === 'spam' && (
            <ActionButton icon={<ShieldBan className="w-4 h-4 text-green-200" />} title="Not Spam" onClick={() => onBulkAction('unspam')} disabled={isProcessing} />
          )}

          {folder !== 'drafts' && (
            <>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <ActionButton icon={<MailOpen className="w-4 h-4" />} title="Mark as Read" onClick={() => onBulkAction('read')} disabled={isProcessing} />
              <ActionButton icon={<Mail className="w-4 h-4" />} title="Mark as Unread" onClick={() => onBulkAction('unread')} disabled={isProcessing} />
              <ActionButton icon={<Star className="w-4 h-4 text-yellow-300" />} title="Star" onClick={() => onBulkAction('star')} disabled={isProcessing} />
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionButton({ icon, title, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 hover:bg-white/20 rounded-xl transition disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
