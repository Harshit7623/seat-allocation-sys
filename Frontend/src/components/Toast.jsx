import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in`}>
      <Icon size={20} />
      <span>{message}</span>
    </div>
  );
};

export default Toast;