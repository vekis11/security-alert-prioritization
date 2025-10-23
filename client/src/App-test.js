import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🔒 Security Alert Prioritization Dashboard</h1>
        <p>Backend: http://localhost:5000</p>
        <p>Frontend: http://localhost:3000</p>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => {
              fetch('http://localhost:5000/api/health')
                .then(res => res.json())
                .then(data => alert('Backend Status: ' + JSON.stringify(data)))
                .catch(err => alert('Backend Error: ' + err.message));
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              margin: '10px'
            }}
          >
            Test Backend Connection
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
