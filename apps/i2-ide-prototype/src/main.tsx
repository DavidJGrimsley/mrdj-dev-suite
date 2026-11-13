import React from 'react'
import ReactDOM from 'react-dom/client'
import App from "./app/App"
import './styles/index.css'
import { JennyHostProvider } from './jenny/HostProvider'
import { defaultHost } from './jenny/host'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <JennyHostProvider value={window.jennyCreationHost ?? defaultHost}><App /></JennyHostProvider>
  </React.StrictMode>,
)
