import toast from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';

export const showUndoToast = (message, onUndo) => {
  toast(
    (t) => (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onUndo();
          }}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition"
        >
          <RotateCcw className="w-3 h-3" />
          Undo
        </button>
      </div>
    ),
    {
      duration: 5000,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)'
      }
    }
  );
};
