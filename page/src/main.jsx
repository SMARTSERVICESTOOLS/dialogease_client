import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Use import.meta.url to get the URL of the current module script
const src = import.meta.url;
const urlParams = new URLSearchParams(src.split('?')[1]);

// Extract the key and id from the URL parameters
const keyapp = urlParams.get('key');
const id = urlParams.get('id'); // Assuming you also want to get an id parameter


if (!keyapp) {
  console.error('Please select a key');
} else if (!id) {
  console.error('No id found in the URL');
} else {
  const root = document.getElementById(id);

  // Render the React app
  createRoot(root).render(
    <StrictMode>
      <App keyProp={keyapp} id={id} />
    </StrictMode>
  );
}
