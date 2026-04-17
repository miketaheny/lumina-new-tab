import { useState, useEffect, useRef } from 'react';

let toastListener: ((msg: string) => void) | null = null;

export function showToast(message: string) {
  toastListener?.(message);
}

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    toastListener = (message) => {
      setMsg(message);
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    };
    return () => { toastListener = null; };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: visible
        ? 'translateX(-50%) translateY(0)'
        : 'translateX(-50%) translateY(20px)',
      background: 'rgba(20, 16, 40, 0.95)',
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      color: 'rgba(255,255,255,0.85)',
      padding: '10px 20px',
      borderRadius: 12,
      fontSize: 13,
      fontFamily: 'Inter, sans-serif',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'none',
      zIndex: 200,
      whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}
