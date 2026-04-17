import React from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  return <div style={{ width: 300, padding: 16 }}>Lumina — open a new tab to get started.</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
