
import React from 'react';
import ReactDOM from 'react-dom/client';
import { get } from 'idb-keyval';

const App: React.FC = () => {
  const [data, setData] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const extractData = async () => {
    setLoading(true);
    setError('');
    try {
      const activeSession = await get('activeSession');
      const history = await get('history');
      const players = await get('players');
      
      const extractedData = {
        activeSession,
        history,
        players
      };
      
      setData(JSON.stringify(extractedData, null, 2));
    } catch (err: any) {
      setError(`Failed to read data from IndexedDB. Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopy = () => {
    if(data) {
        navigator.clipboard.writeText(data).then(() => {
            alert('Data copied to clipboard!');
        }, (err) => {
            alert('Failed to copy data automatically. Please select all text and copy it manually.');
        });
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#1A1D24', color: '#F0F2F5', minHeight: '100vh' }}>
      <h1 style={{ color: '#00F2FE', borderBottom: '1px solid #00F2FE', paddingBottom: '10px' }}>Data Rescue Tool</h1>
      <p style={{ color: '#A9B1BD', fontSize: '14px' }}>
        Click the button below to extract all application data from the local database.
      </p>
      <button 
        onClick={extractData} 
        disabled={loading}
        style={{
            backgroundColor: '#00F2FE',
            color: '#1A1D24',
            border: 'none',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: 'pointer',
            margin: '20px 0'
        }}
      >
        {loading ? 'Extracting...' : '1. Extract Data'}
      </button>
      
      {error && <p style={{ color: '#FF4136' }}>{error}</p>}
      
      {data && (
        <div>
            <p style={{ color: '#A9B1BD', fontSize: '14px' }}>
                Extraction successful. Please copy the entire content of the text box below and send it back.
            </p>
            <button 
                onClick={handleCopy} 
                style={{
                    backgroundColor: '#4CFF5F',
                    color: '#1A1D24',
                    border: 'none',
                    padding: '10px 15px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '10px'
                }}
              >
                2. Copy to Clipboard
              </button>
          <textarea 
            readOnly 
            value={data}
            style={{ 
              width: '100%', 
              height: '400px', 
              backgroundColor: '#101216', 
              color: '#F0F2F5',
              border: '1px solid #242831',
              borderRadius: '8px',
              padding: '10px',
              boxSizing: 'border-box',
              fontSize: '12px',
              fontFamily: 'monospace'
            }} 
          />
        </div>
      )}
    </div>
  );
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
