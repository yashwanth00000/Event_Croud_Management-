'use client';

import { useId, useState } from 'react';

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
};

export default function PasswordInput({ value, onChange, autoComplete, minLength, maxLength, required = true }: PasswordInputProps) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);

  return <div className="relative mt-1">
    <input
      id={inputId}
      required={required}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      minLength={minLength}
      maxLength={maxLength}
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-20 font-normal text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
    />
    <button
      type="button"
      aria-controls={inputId}
      aria-pressed={visible}
      onClick={() => setVisible(current => !current)}
      className="absolute inset-y-0 right-2 my-auto h-9 rounded-md px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
    >{visible ? 'Hide' : 'Show'}</button>
  </div>;
}
