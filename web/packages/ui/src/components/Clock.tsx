import React, { useState, useEffect } from 'react';

interface ClockProps {
  greetingName?: string;
  greetingCustom?: boolean;
  greetingCustomText?: string;
  showClock?: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface TimeState {
  timeStr: string;
  dateStr: string;
  greetingStr: string;
}

function computeTime(
  greetingName: string,
  greetingCustom: boolean,
  greetingCustomText: string,
): TimeState {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const hr = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  const timeStr = `${hr}:${String(m).padStart(2, '0')} ${ampm}`;

  const dateStr = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  let greetingStr: string;
  if (greetingCustom) {
    greetingStr = greetingCustomText ?? '';
  } else {
    const base = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const name = greetingName?.trim();
    greetingStr = name ? `${base}, ${name}` : base;
  }

  return { timeStr, dateStr, greetingStr };
}

export function Clock({
  greetingName = '',
  greetingCustom = false,
  greetingCustomText = '',
  showClock = true,
}: ClockProps) {
  const [time, setTime] = useState<TimeState>(() =>
    computeTime(greetingName, greetingCustom, greetingCustomText),
  );

  useEffect(() => {
    const tick = () =>
      setTime(computeTime(greetingName, greetingCustom, greetingCustomText));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [greetingName, greetingCustom, greetingCustomText]);

  return (
    <>
      <div id="topbar">
        <div id="clock-wrap">
          {showClock && <div id="clock">{time.timeStr}</div>}
          <div id="date">{time.dateStr}</div>
        </div>
      </div>

      <div id="hero">
        <div id="greeting">{time.greetingStr}</div>
      </div>
    </>
  );
}
