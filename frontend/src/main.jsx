import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom' // <-- Nó nằm ở đây rồi

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>  {/* <-- Đây là Router chính */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)