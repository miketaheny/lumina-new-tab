import { useState } from 'react';

interface SetupWizardProps {
  hasV1Data: boolean;
  migrationResult?: { notesCount: number; linksCount: number; kindlingCount: number };
  onMigrate: () => Promise<void>;
  onSignIn?: () => Promise<void>;
  onFinish: () => void;
}

type Step = 'welcome' | 'migrate' | 'done';

export function SetupWizard({ hasV1Data, migrationResult, onMigrate, onFinish }: SetupWizardProps) {
  const steps: Step[] = hasV1Data
    ? ['welcome', 'migrate', 'done']
    : ['welcome', 'done'];

  const [stepIndex, setStepIndex] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);

  const currentStep = steps[stepIndex];

  function advance() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    try {
      await onMigrate();
      setMigrated(true);
    } finally {
      setMigrating(false);
    }
    advance();
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <StepIndicator steps={steps} current={stepIndex} />

        {currentStep === 'welcome' && (
          <div style={stepBodyStyle}>
            <div style={logoStyle}>L</div>
            <h1 style={headingStyle}>Welcome to Lumina v2</h1>
            <p style={descStyle}>
              Your personal new tab page. Quick links, notes, a reading list, and more.
            </p>
            <button style={primaryBtnStyle} onClick={advance}>Get Started</button>
          </div>
        )}

        {currentStep === 'migrate' && (
          <div style={stepBodyStyle}>
            <h2 style={headingStyle}>Import from v1</h2>
            {migrationResult ? (
              <>
                <p style={descStyle}>Successfully imported your data:</p>
                <div style={statGridStyle}>
                  <StatCard label="Notes" count={migrationResult.notesCount} />
                  <StatCard label="Links" count={migrationResult.linksCount} />
                  <StatCard label="Reading" count={migrationResult.kindlingCount} />
                </div>
                <button style={primaryBtnStyle} onClick={advance}>Continue</button>
              </>
            ) : (
              <>
                <p style={descStyle}>
                  We found existing Lumina data. Import it now to keep your notes, quick links, and reading list.
                </p>
                <div style={btnRowStyle}>
                  <button style={ghostBtnStyle} onClick={advance}>Skip</button>
                  <button
                    style={{ ...primaryBtnStyle, opacity: migrating ? 0.6 : 1 }}
                    onClick={handleMigrate}
                    disabled={migrating}
                  >
                    {migrating ? 'Importing...' : 'Import Data'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === 'done' && (
          <div style={stepBodyStyle}>
            <div style={{ ...logoStyle, background: 'rgba(167,139,250,0.2)' }}>✓</div>
            <h2 style={headingStyle}>All set!</h2>
            <p style={descStyle}>
              Lumina is ready. Click anywhere outside panels to focus, or explore settings to customize your experience.
            </p>
            <button style={primaryBtnStyle} onClick={onFinish}>Open Lumina</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <div style={stepIndicatorStyle}>
      {steps.map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current
              ? 'rgba(167,139,250,0.8)'
              : i < current
              ? 'rgba(167,139,250,0.4)'
              : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div style={statCardStyle}>
      <span style={statCountStyle}>{count}</span>
      <span style={statLabelStyle}>{label}</span>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
};

const cardStyle: React.CSSProperties = {
  width: 440,
  maxWidth: '90vw',
  background: 'rgba(18,12,36,0.97)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20,
  boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
  backdropFilter: 'blur(24px)',
  overflow: 'hidden',
};

const stepBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '32px 36px 36px',
  gap: 16,
};

const stepIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 6,
  padding: '20px 0 0',
};

const logoStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 16,
  background: 'rgba(167,139,250,0.15)',
  border: '1px solid rgba(167,139,250,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
  fontWeight: 800,
  color: '#c4b5fd',
  fontFamily: 'Inter, sans-serif',
  marginBottom: 4,
};

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: 'rgba(255,255,255,0.9)',
  fontFamily: 'Inter, sans-serif',
  margin: 0,
  textAlign: 'center',
};

const descStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.6,
  textAlign: 'center',
  margin: 0,
};

const primaryBtnStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 28px',
  borderRadius: 10,
  border: '1px solid rgba(167,139,250,0.4)',
  background: 'rgba(167,139,250,0.2)',
  color: '#c4b5fd',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.45)',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 8,
  justifyContent: 'center',
};

const statGridStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
};

const statCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '12px 20px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  minWidth: 72,
};

const statCountStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: '#c4b5fd',
  fontFamily: 'Inter, sans-serif',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.45)',
  fontFamily: 'Inter, sans-serif',
  marginTop: 2,
};
