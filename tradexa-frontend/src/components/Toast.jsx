import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

const iconsByType = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const colorsByType = {
  success: "border-emerald-500/20 bg-slate-900/90 text-emerald-400",
  info: "border-sky-500/20 bg-slate-900/90 text-sky-400",
  warning: "border-amber-500/20 bg-slate-900/90 text-amber-400",
  error: "border-red-500/20 bg-slate-900/90 text-red-400",
};

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const Icon = iconsByType[toast.type] || Info;
  const colors = colorsByType[toast.type] || colorsByType.info;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md ${colors}`}
        >
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
            <p className="mt-1 text-xs text-slate-300">{toast.message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
