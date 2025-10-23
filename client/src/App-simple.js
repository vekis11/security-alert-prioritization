import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header style={{ 
        padding: '40px', 
        textAlign: 'center', 
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{ color: '#007bff', fontSize: '2.5rem', marginBottom: '20px' }}>
          🔒 Security Alert Prioritization Dashboard
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
          AI-powered security monitoring and threat analysis
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'white', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minWidth: '200px'
          }}>
            <h3>Backend Status</h3>
            <p>Port: 5000</p>
            <button 
              onClick={() => {
                fetch('http://localhost:5000/api/health')
                  .then(res => res.json())
                  .then(data => alert('✅ Backend is working!\n\n' + JSON.stringify(data, null, 2)))
                  .catch(err => alert('❌ Backend Error: ' + err.message));
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Test Backend
            </button>
          </div>
          
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'white', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minWidth: '200px'
          }}>
            <h3>Frontend Status</h3>
            <p>Port: 3000</p>
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Running!</p>
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          textAlign: 'left'
        }}>
          <h3>🎯 Next Steps:</h3>
          <ol style={{ lineHeight: '1.6' }}>
            <li>Set up your MongoDB connection in the .env file</li>
            <li>Add your OpenAI API key for AI features</li>
            <li>Configure security tool integrations</li>
            <li>Start monitoring your security alerts!</li>
          </ol>
        </div>
      </header>
    </div>
  );
}

export default App;