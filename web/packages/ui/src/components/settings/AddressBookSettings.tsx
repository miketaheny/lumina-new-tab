import { useState, useEffect } from 'react';
import { storage } from '@lumina/core';
import type { AddressBookEntry } from '@lumina/core';

function generateId() {
  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const EMPTY_ENTRY: Omit<AddressBookEntry, 'id'> = {
  label: '',
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
};

const CHROME_STORAGE_KEY = 'lumina_address_book';

function syncToChromeStorage(entries: AddressBookEntry[]) {
  try {
    const g = globalThis as Record<string, unknown>;
    const c = g.chrome as { storage?: { local?: { set: (items: Record<string, unknown>) => void } } } | undefined;
    if (c?.storage?.local) {
      c.storage.local.set({ [CHROME_STORAGE_KEY]: entries });
    }
  } catch { /* web context — no chrome.storage */ }
}

export function AddressBookSettings() {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [editing, setEditing] = useState<AddressBookEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    storage.getSettings().then(s => {
      setEntries(s.addressBook ?? []);
    });
  }, []);

  async function saveEntries(next: AddressBookEntry[]) {
    setEntries(next);
    const s = await storage.getSettings();
    await storage.setSettings({ ...s, addressBook: next, updatedAt: new Date().toISOString() });
    syncToChromeStorage(next);
  }

  function handleAdd() {
    setEditing({ id: generateId(), ...EMPTY_ENTRY });
    setShowForm(true);
  }

  function handleEdit(entry: AddressBookEntry) {
    setEditing({ ...entry });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    await saveEntries(entries.filter(e => e.id !== id));
  }

  async function handleSave(entry: AddressBookEntry) {
    const exists = entries.some(e => e.id === entry.id);
    const next = exists
      ? entries.map(e => e.id === entry.id ? entry : e)
      : [...entries, entry];
    await saveEntries(next);
    setShowForm(false);
    setEditing(null);
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <span style={sectionLabelStyle}>Address Book</span>
        <button style={addBtnStyle} onClick={handleAdd}>+ Add Entry</button>
      </div>

      {entries.length === 0 ? (
        <p style={emptyStyle}>No entries yet. Add contacts for autofill.</p>
      ) : (
        <div style={listStyle}>
          {entries.map(entry => (
            <div key={entry.id} style={entryRowStyle}>
              <div style={entryInfoStyle}>
                <span style={entryNameStyle}>{entry.label || entry.name || 'Unnamed'}</span>
                {entry.email && <span style={entryDetailStyle}>{entry.email}</span>}
                {(entry.city || entry.state) && (
                  <span style={entryDetailStyle}>
                    {[entry.city, entry.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              <div style={entryActionsStyle}>
                <button style={iconBtnStyle} onClick={() => handleEdit(entry)} title="Edit">
                  <EditSvg />
                </button>
                <button style={{ ...iconBtnStyle, color: 'rgba(248,113,113,0.7)' }} onClick={() => handleDelete(entry.id)} title="Delete">
                  <TrashSvg />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && editing && (
        <AddressForm
          entry={editing}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

interface AddressFormProps {
  entry: AddressBookEntry;
  onSave: (entry: AddressBookEntry) => void;
  onCancel: () => void;
}

function AddressForm({ entry, onSave, onCancel }: AddressFormProps) {
  const [form, setForm] = useState<AddressBookEntry>({ ...entry });

  function set<K extends keyof AddressBookEntry>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!(form.name || form.firstName || form.lastName || '').trim()) return;
    onSave(form);
  }

  const hasName = !!(form.name || form.firstName || form.lastName || '').trim();

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>{entry.name ? 'Edit Entry' : 'Add Entry'}</span>
          <button style={iconBtnStyle} onClick={onCancel} title="Close"><CloseSvg /></button>
        </div>
        <div style={formBodyStyle}>
          <Field label="Label">
            <input style={inputStyle} value={form.label ?? ''} onChange={e => set('label', e.target.value)} placeholder="e.g. Home, Work" />
          </Field>
          <div style={twoColStyle}>
            <Field label="First Name">
              <input style={inputStyle} value={form.firstName ?? ''} onChange={e => set('firstName', e.target.value)} placeholder="First" />
            </Field>
            <Field label="Last Name">
              <input style={inputStyle} value={form.lastName ?? ''} onChange={e => set('lastName', e.target.value)} placeholder="Last" />
            </Field>
          </div>
          <Field label="Full Name">
            <input style={inputStyle} value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Full name (auto-derived if blank)" />
          </Field>
          <Field label="Email">
            <input style={inputStyle} value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" />
          </Field>
          <div style={twoColStyle}>
            <Field label="Phone">
              <input style={inputStyle} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" type="tel" />
            </Field>
            <Field label="Company">
              <input style={inputStyle} value={form.company ?? ''} onChange={e => set('company', e.target.value)} placeholder="Company" />
            </Field>
          </div>
          <Field label="Address Line 1">
            <input style={inputStyle} value={form.addressLine1 ?? ''} onChange={e => set('addressLine1', e.target.value)} placeholder="123 Main St" />
          </Field>
          <Field label="Address Line 2">
            <input style={inputStyle} value={form.addressLine2 ?? ''} onChange={e => set('addressLine2', e.target.value)} placeholder="Apt, Suite, etc." />
          </Field>
          <div style={twoColStyle}>
            <Field label="City">
              <input style={inputStyle} value={form.city ?? ''} onChange={e => set('city', e.target.value)} placeholder="City" />
            </Field>
            <Field label="State">
              <input style={inputStyle} value={form.state ?? ''} onChange={e => set('state', e.target.value)} placeholder="State" />
            </Field>
          </div>
          <div style={twoColStyle}>
            <Field label="ZIP">
              <input style={inputStyle} value={form.zip ?? ''} onChange={e => set('zip', e.target.value)} placeholder="ZIP code" />
            </Field>
            <Field label="Country">
              <input style={inputStyle} value={form.country ?? ''} onChange={e => set('country', e.target.value)} placeholder="US, CA, GB…" />
            </Field>
          </div>
        </div>
        <div style={formFooterStyle}>
          <button style={cancelBtnStyle} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...saveBtnStyle, opacity: hasName ? 1 : 0.4 }}
            onClick={handleSubmit}
            disabled={!hasName}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
};

const addBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 7,
  border: '1px solid rgba(167,139,250,0.3)',
  background: 'rgba(167,139,250,0.1)',
  color: '#c4b5fd',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  fontWeight: 600,
};

const emptyStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.3)',
  fontFamily: 'Inter, sans-serif',
  padding: '12px 0',
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const entryRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const entryInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
};

const entryNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  fontFamily: 'Inter, sans-serif',
};

const entryDetailStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'Inter, sans-serif',
};

const entryActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  flexShrink: 0,
};

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: 400,
  maxWidth: '90vw',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(18,12,36,0.98)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(20px)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, sans-serif',
};

const formBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  fontFamily: 'Inter, sans-serif',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.85)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  padding: '7px 10px',
  outline: 'none',
};

const formFooterStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  padding: '12px 20px',
  borderTop: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid rgba(167,139,250,0.35)',
  background: 'rgba(167,139,250,0.15)',
  color: '#c4b5fd',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'opacity 0.15s',
};

function CloseSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function EditSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}
