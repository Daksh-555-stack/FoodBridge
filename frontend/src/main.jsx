import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AppProvider } from './context/AppContext'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#f3f4f6',
                border: '1px solid #374151',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#f3f4f6' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#f3f4f6' } },
            }}
          />
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
