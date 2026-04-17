import React from 'react';

const DEFAULT_FOCUS_LINES = [
  'Core values, loud signal — ship the thing that sounds like you.',
  'Tune the message before you amp the budget.',
  "Great brands riff — they don't read from a script.",
  'Strategy is rhythm. Creative is melody. Ship the whole song.',
  'Make the work the work. Promote it after.',
  'A twelve-fret run: small moves, in order, no flash.',
  "Be useful before you're clever. Be clever before you're loud.",
  "If it doesn't move a number, it's a mood board.",
  'Brand is what you repeat. Growth is what compounds.',
  'Write like a person. Measure like an operator.',
];

interface FocusLineProps {
  focusLines?: string[] | null;
  focusText?: string;
}

function getActiveLine(focusLines: string[] | null | undefined): string {
  const lines = focusLines ?? DEFAULT_FOCUS_LINES;
  if (!lines.length) return '';
  const dayIdx = Math.floor(Date.now() / 86400000) % lines.length;
  return lines[dayIdx];
}

export function FocusLine({ focusLines, focusText }: FocusLineProps) {
  const text = focusText?.trim() || getActiveLine(focusLines);
  return <div id="focus">{text}</div>;
}
