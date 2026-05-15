import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@lumina/core';
import type { QuickLink, QuickLinksData, LuminaSettings } from '@lumina/core';
import { QuickLinkItem } from './QuickLinkItem';
import { QuickLinkSectionComponent } from './QuickLinkSection';
import { QuickLinkModal } from './QuickLinkModal';

interface QuickLinksProps {
  onDirty?: () => void;
}

export function QuickLinks({ onDirty }: QuickLinksProps) {
  const [data, setData] = useState<QuickLinksData | null>(null);
  const [settings, setSettings] = useState<LuminaSettings | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragSrcId = useRef<string | null>(null);
  const [editTarget, setEditTarget] = useState<QuickLink | null>(null);

  useEffect(() => {
    Promise.all([storage.getQuickLinks(), storage.getSettings()]).then(([ql, s]) => {
      setData(ql);
      setSettings(s);
    });
  }, []);

  const saveData = useCallback(async (next: QuickLinksData) => {
    setData(next);
    await storage.setQuickLinks({ ...next, updatedAt: new Date().toISOString() });
    onDirty?.();
  }, [onDirty]);

  const saveSettings = useCallback(async (next: LuminaSettings) => {
    setSettings(next);
    await storage.setSettings({ ...next, updatedAt: new Date().toISOString() });
    onDirty?.();
  }, [onDirty]);

  function openAddModal() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEditModal(id: string) {
    const link = data?.links.find(l => l.id === id);
    if (!link) return;
    setEditTarget(link);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  async function handleSave(linkData: Omit<QuickLink, 'id'> & { id?: string }) {
    if (!data) return;
    let next: QuickLinksData;
    if (linkData.id) {
      next = {
        ...data,
        links: data.links.map(l => l.id === linkData.id ? { ...l, ...linkData, id: l.id } : l),
      };
    } else {
      const newLink: QuickLink = {
        ...linkData,
        id: 'ql-' + Date.now(),
      };
      next = { ...data, links: [...data.links, newLink] };
    }
    await saveData(next);
    closeModal();
  }

  async function handleDelete(id: string) {
    if (!data) return;
    await saveData({ ...data, links: data.links.filter(l => l.id !== id) });
  }

  async function toggleIconsOnly() {
    if (!settings) return;
    await saveSettings({ ...settings, qlIconsOnly: !settings.qlIconsOnly });
  }

  async function toggleSection(sectionId: string) {
    if (!settings) return;
    const collapsed = { ...(settings.qlCollapsed ?? {}) };
    collapsed[sectionId] = !collapsed[sectionId];
    await saveSettings({ ...settings, qlCollapsed: collapsed });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    dragSrcId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragSrcId.current) setDragOverId(id);
  }

  async function handleDrop(e: React.DragEvent, toId: string) {
    e.preventDefault();
    setDragOverId(null);
    const fromId = dragSrcId.current;
    dragSrcId.current = null;
    if (!fromId || fromId === toId || !data) return;

    const fromIdx = data.links.findIndex(l => l.id === fromId);
    const toIdx = data.links.findIndex(l => l.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;

    const links = [...data.links];
    const [moved] = links.splice(fromIdx, 1);
    links.splice(toIdx, 0, moved);
    await saveData({ ...data, links });
  }

  function handleDragEnd() {
    dragSrcId.current = null;
    setDragOverId(null);
  }

  if (!data || !settings) return null;

  const iconsOnly = settings.qlIconsOnly;
  const visibleLinks = data.links.filter(l => !l.fromBookmark);

  const sections = data.sections.length > 0 ? data.sections : [{ id: 'default', label: 'Quick Links' }];
  const useSections = data.sections.length > 1;

  return (
    <div style={containerStyle} onDragEnd={handleDragEnd}>
      <div style={headerRowStyle}>
        <span style={headerLabelStyle}>Quick Links</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{
              ...iconToggleBtnStyle,
              background: iconsOnly ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.06)',
              borderColor: iconsOnly ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)',
              color: iconsOnly ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
            }}
            title={iconsOnly ? 'Switch to list view' : 'Switch to icons view'}
            onClick={toggleIconsOnly}
          >
            <GridSvg />
          </button>
          <button
            style={addBtnStyle}
            title="Add quick link"
            onClick={openAddModal}
          >
            <PlusSvg />
          </button>
        </div>
      </div>

      {visibleLinks.length === 0 && (
        <div style={emptyStyle}>
          No quick links yet.{' '}
          <button style={emptyAddBtnStyle} onClick={openAddModal}>Add one</button>
        </div>
      )}

      {visibleLinks.length > 0 && (
        <div style={iconsOnly ? iconGridStyle : listStyle}>
          {useSections
            ? sections.map(section => {
                const sectionLinks = visibleLinks.filter(l => l.section === section.id);
                if (sectionLinks.length === 0) return null;
                const collapsed = !!(settings.qlCollapsed?.[section.id]);
                return (
                  <QuickLinkSectionComponent
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    collapsed={collapsed}
                    onToggle={toggleSection}
                  >
                    {sectionLinks.map(link => (
                      <QuickLinkItem
                        key={link.id}
                        link={link}
                        iconsOnly={iconsOnly}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragOver={dragOverId === link.id}
                      />
                    ))}
                  </QuickLinkSectionComponent>
                );
              })
            : visibleLinks.map(link => (
                <QuickLinkItem
                  key={link.id}
                  link={link}
                  iconsOnly={iconsOnly}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={dragOverId === link.id}
                />
              ))
          }
        </div>
      )}

      {modalOpen && (
        <QuickLinkModal
          link={editTarget}
          sections={sections}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      <style>{hoverCss}</style>
    </div>
  );
}

const hoverCss = `
  a:hover .ql-hover-actions,
  a:hover + .ql-hover-actions {
    opacity: 1 !important;
  }
  a:hover {
    background: rgba(255,255,255,0.09) !important;
  }
`;

const containerStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 44,
  animation: 'fadeUp 0.6s ease 0.4s both',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
};

const headerLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)',
};

const addBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.45)',
  transition: 'all 0.15s',
};

const iconToggleBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: '1px solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
};

const iconGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const emptyStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.3)',
  padding: '12px 0',
};

const emptyAddBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#a78bfa',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
  fontFamily: 'Inter, sans-serif',
};

function PlusSvg() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function GridSvg() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
