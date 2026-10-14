import React, { useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: { message: string; type?: ToastType; duration?: number }) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (options: { message: string; type?: ToastType; duration?: number }) => {
      const id = crypto.randomUUID();
      const { message, type = "info", duration = 3000 } = options;
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const handleClose = () => {
    onRemove();
  };

  const colors = {
    success: "bg-gradient-to-r from-green-500 to-green-600 text-white",
    error: "bg-gradient-to-r from-red-500 to-red-600 text-white",
    info: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    warning: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white",
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
  };

  return (
    <motion.div
      layout
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
      className={`${colors[toast.type]} shadow-2xl shadow-black/40 flex items-center gap-3 pointer-events-auto p-4 mx-auto w-full px-8 py-4 rounded-b-2xl backdrop-blur-md border-b border-white/20`}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex-shrink-0"
      >
        {icons[toast.type]}
      </motion.div>
      <span className="flex-1 text-sm font-semibold">{toast.message}</span>
      <button
        onClick={handleClose}
        className="p-2 hover:bg-white/20 rounded-lg transition-all flex-shrink-0 hover:scale-110"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
