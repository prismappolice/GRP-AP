import React from 'react';
import { Clock } from 'lucide-react';

export const formatLastLogin = (value) => {
  if (!value) return 'No previous login recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No previous login recorded';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
};

export const LastLoginNotice = ({ value, className = '' }) => (
  <div className={`inline-flex max-w-full items-center gap-2 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm text-[#1E3A8A] ${className}`}>
    <Clock className="h-4 w-4 flex-shrink-0" />
    <span className="font-semibold">Last login:</span>
    <span className="truncate">{formatLastLogin(value)}</span>
  </div>
);
