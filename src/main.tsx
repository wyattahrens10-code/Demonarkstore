import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './demonark-v1.css';

const DISCORD_INVITE = 'https://discord.gg/CgVqbyGr4E';

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  const discordButton = target?.closest?.('.da-discord-button');
  if (!discordButton) return;

  event.preventDefault();
  window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
