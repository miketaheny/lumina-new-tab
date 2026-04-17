import React from 'react';

interface QuickLinkSectionProps {
  id: string;
  label: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export function QuickLinkSectionComponent({
  id,
  label,
  collapsed,
  onToggle,
  children,
}: QuickLinkSectionProps) {
  return (
    <div style={sectionStyle}>
      <button
        style={headerStyle}
        onClick={() => onToggle(id)}
        aria-expanded={!collapsed}
      >
        <span style={chevronStyle(collapsed)}>›</span>
        <span style={labelStyle}>{label}</span>
      </button>
      {!collapsed && (
        <div style={bodyStyle}>
          {children}
        </div>
      )}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 6,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 2px',
  width: '100%',
  textAlign: 'left',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 4,
};

function chevronStyle(collapsed: boolean): React.CSSProperties {
  return {
    fontSize: 16,
    lineHeight: 1,
    transition: 'transform 0.2s',
    transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
    display: 'inline-block',
    color: 'rgba(255,255,255,0.3)',
  };
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.38)',
};

const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
