import React, { useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    classes: "bg-white border-l-4 border-emerald-500 text-slate-900",
    iconClass: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    classes: "bg-white border-l-4 border-rose-500 text-slate-900",
    iconClass: "text-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-white border-l-4 border-amber-500 text-slate-900",
    iconClass: "text-amber-500",
  },
  info: {
    icon: Info,
    classes: "bg-white border-l-4 border-[#294998] text-slate-900",
    iconClass: "text-[#294998]",
  },
};

const Toast = ({ message, type = "success", onClose, duration = 6000 }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { onCloseRef.current && onCloseRef.current(); } catch {}
    }, duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.success;
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-[10px] shadow-[0_10px_15px_-3px_rgba(15,23,42,0.08),_0_4px_6px_-4px_rgba(15,23,42,0.04)] border border-slate-200 max-w-sm animate-in slide-in-from-top-2 fade-in-0 duration-300 ${config.classes}`}
      role="alert"
    >
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.iconClass}`} />
      <p className="text-[13px] font-[500] leading-[18px] flex-1">{message}</p>
      <button
        onClick={onClose}
        className="h-4 w-4 shrink-0 text-slate-400 hover:text-slate-700 transition-colors mt-0.5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;
