import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handling
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', { message, source, lineno, colno, error });
  renderFallbackError(`Global Error: ${message}`);
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  renderFallbackError(`Unhandled Promise Rejection: ${event.reason?.message || event.reason}`);
};

function renderFallbackError(message: string) {
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement.innerHTML === '') {
    rootElement.innerHTML = `
      <div style="background: #ffffff; color: #1a1a1a; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
        <h1 style="color: #ef4444;">Application Error</h1>
        <p style="color: #4b5563; margin-bottom: 20px;">${message}</p>
        <button onclick="window.location.reload()" style="background: #9333ea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Reload App</button>
      </div>
    `;
  }
}

try {
  console.log('Main.tsx: Starting initialization...');
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find root element with id "root"');
  }

  // Clear diagnostic loader if it exists
  const diag = document.getElementById('loading-diagnostic');
  if (diag) {
    console.log('Main.tsx: Removing diagnostic loader');
    // We don't remove it yet, let React handle it by replacing root content
  }

  const root = createRoot(rootElement);
  
  console.log('Main.tsx: Rendering App...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('Main.tsx: App rendered successfully');

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                  // Optionally: window.location.reload(); 
                }
              };
            }
          };
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });

    // Handle controller change (new SW taking over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
} catch (error: any) {
  console.error('Main.tsx: Critical initialization error:', error);
  renderFallbackError(error.message || 'Critical initialization error');
}
