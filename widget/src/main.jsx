import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Create a div and append it to the body
const root = document.createElement('div');
root.id = 'ksdyughiqgfdukhysqguyh';
document.body.appendChild(root);

// Use import.meta.url to get the URL of the current module script
const src = import.meta.url;
const urlParams = new URLSearchParams(src.split('?')[1]);
const keyapp = urlParams.get('key');

if (!keyapp) {
  console.error('Please select a key');
} else {
  createRoot(root).render(
    <StrictMode>
      <App keyProp={keyapp} />
    </StrictMode>
  );
}
