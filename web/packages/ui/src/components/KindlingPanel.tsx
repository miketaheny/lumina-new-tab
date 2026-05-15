import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@lumina/core';
import type { KindlingData, KindlingItem } from '@lumina/core';
import { KindlingItemRow } from './KindlingItem';
import { KindlingFilters } from './KindlingFilters';
import type { StatusFilter, SortOrder } from './KindlingFilters';
import { KindlingModal } from './KindlingModal';

export function KindlingPanel() {
  const [data, setData] = useState<KindlingData>({ items: [], tags: [], updatedAt: '' });
  const [activeTag, setActiveTag] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date');
  const [editItem, setEditItem] = useState<KindlingItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    storage.getKindling().then(setData);
  }, []);

  const persist = useCallback(async (next: KindlingData) => {
    setData(next);
    await storage.setKindling(next);
  }, []);

  function handleToggleRead(id: string) {
    const now = new Date().toISOString();
    const next: KindlingData = {
      ...data,
      items: data.items.map(i =>
        i.id === id ? { ...i, readAt: i.readAt ? null : now, updatedAt: now } : i
      ),
      updatedAt: now,
    };
    persist(next);
  }

  function handleDelete(id: string) {
    const now = new Date().toISOString();
    persist({ ...data, items: data.items.filter(i => i.id !== id), updatedAt: now });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function openAdd() {
    setEditItem(null);
    setShowModal(true);
  }

  function openEdit(item: KindlingItem) {
    setEditItem(item);
    setShowModal(true);
  }

  const filtered = useMemo(() => {
    let items = data.items;
    if (activeTag !== 'all') {
      items = items.filter(i => i.tags.includes(activeTag));
    }
    if (statusFilter === 'unread') items = items.filter(i => !i.readAt);
    else if (statusFilter === 'read') items = items.filter(i => !!i.readAt);

    return [...items].sort((a, b) =>
      sortOrder === 'title'
        ? (a.title ?? '').localeCompare(b.title ?? '')
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [data.items, activeTag, statusFilter, sortOrder]);

  function emptyMessage(): string {
    if (activeTag !== 'all' && statusFilter !== 'all') return `Nothing ${statusFilter} tagged "${activeTag}".`;
    if (activeTag !== 'all') return `No links tagged "${activeTag}".`;
    if (statusFilter === 'unread') return 'Nothing unread yet.';
    if (statusFilter === 'read') return 'Nothing read yet.';
    return 'Kindling is empty. Add a link to get started.';
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={headerTitleStyle}>Kindling</span>
        <button style={addBtnStyle} onClick={openAdd} title="Add link">
          <PlusSvg />
          <span>Add link</span>
        </button>
      </div>

      <KindlingFilters
        tags={data.tags}
        activeTag={activeTag}
        statusFilter={statusFilter}
        sortOrder={sortOrder}
        onTagChange={setActiveTag}
        onStatusChange={setStatusFilter}
        onSortChange={setSortOrder}
      />

      <div style={listStyle}>
        {filtered.length === 0 ? (
          <div style={emptyStyle}>{emptyMessage()}</div>
        ) : (
          filtered.map(item => (
            <KindlingItemRow
              key={item.id}
              item={item}
              tags={data.tags}
              onToggleRead={handleToggleRead}
              onEdit={openEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          ))
        )}
      </div>

      {showModal && (
        <KindlingModal
          editItem={editItem}
          data={data}
          onSave={next => { persist(next); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.7)',
  fontFamily: 'Inter, sans-serif',
};

const addBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 11px',
  borderRadius: 8,
  border: '1px solid rgba(167,139,250,0.3)',
  background: 'rgba(167,139,250,0.1)',
  color: '#c4b5fd',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  fontWeight: 600,
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

const emptyStyle: React.CSSProperties = {
  padding: '28px 16px',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.25)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.6,
};

function PlusSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
