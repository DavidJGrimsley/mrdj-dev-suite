import React from 'react'
import ReactDOM from 'react-dom/client'
import App from "./app/App"
import './styles/index.css'

const ClosingPreview = React.lazy(() => import('./app/closing/ClosingPreview'))
const closingPreviewRequested = /\/closing\/?$/.test(window.location.pathname)
  || new URLSearchParams(window.location.search).get('closing') === '1'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {closingPreviewRequested
      ? <React.Suspense fallback={<div style={{ minHeight: '100dvh', background: '#000000' }} />}><ClosingPreview /></React.Suspense>
      : <App />}
  </React.StrictMode>,
)
