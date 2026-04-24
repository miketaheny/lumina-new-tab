import React from 'react';
import type { KindlingTag } from '@lumina/core';

export type StatusFilter = 'all' | 'unread' | 'read';
export type SortOrder = 'date' | 'title';

interface KindlingFiltersProps {
  tags: KindlingTag[];
  activeTag: string;
  statusFilter: StatusFilter;
  sortOrder: SortOrder;
  onTagChange: (tag: string) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSortChange: (sort: SortOrder) => void;
}

export function KindlingFilters({
  tags,
  activeTag,
  statusFilter,
  sortOrder,
  onTagChange,
  onStatusChange,
  onSortChange,
}: KindlingFiltersProps) {
  return (
    <div style={containerStyle}>
      <div style={rowStyle}>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={{
              ...chipStyle,
              ...(statusFilter === opt.value ? chipActiveStyle : {}),
            }}
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <span style={dividerStyle} />
        <button
          style={{ ...chipStyle, ...(activeTag === 'all' ? chipActiveStyle : {}) }}
          onClick={() => onTagChange('all')}
        >
          All tags
        </button>
        {tags.map(tag => (
          <button
            key={tag.name}
            style={{
              ...chipStyle,
              ...(activeTag === tag.name ? {
                background: `${tag.color}33`,
                borderColor: `${tag.color}88`,
                color: tag.color,
              } : {}),
            }}
            onClick={() => onTagChange(activeTag === tag.name ? 'all' : tag.name)}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color, flexShrink: 0, display: 'inline-block', marginRight: 4 }} />
            {tag.name}
          </button>
        ))}
      </div>
      <div style={sortRowStyle}>
        <span style={sortLabelStyle}>Sort:</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={{
              ...sortBtnStyle,
              ...(sortOrder === opt.value ? sortBtnActiveStyle : {}),
            }}
            onClick={() => onSortChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: 'Date', value: 'date' },
  { label: 'Title', value: 'title' },
];

const containerStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexShrink: 0,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
  padding: '8px 12px 6px',
  alignItems: 'center',
};

const chipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '3px 9px',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.45)',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.1s',
  whiteSpace: 'nowrap',
};

const chipActiveStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.2)',
  borderColor: 'rgba(167,139,250,0.4)',
  color: 'white',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 14,
  background: 'rgba(255,255,255,0.1)',
  alignSelf: 'center',
  flexShrink: 0,
  margin: '0 2px',
};

const sortRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 12px 8px',
};

const sortLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.3)',
  fontFamily: 'Inter, sans-serif',
};

const sortBtnStyle: React.CSSProperties = {
  padding: '2px 9px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.4)',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
};

const sortBtnActiveStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.15)',
  borderColor: 'rgba(167,139,250,0.3)',
  color: 'rgba(255,255,255,0.85)',
};
