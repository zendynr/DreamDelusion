import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Set initial theme from localStorage
const savedTheme = localStorage.getItem('dreamdelusion:theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)



