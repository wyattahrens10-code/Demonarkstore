import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './demonark-v1.css';

const DISCORD_INVITE = 'https://discord.gg/CgVqbyGr4E';

const legacyEnglishReplacements: Array<[RegExp, string]> = [
  [/^Compte \((.+)\)$/i, 'Account ($1)'],
  [/^Compte$/i, 'Account'],
  [/^Mon compte$/i, 'My account'],
  [/^Mon profil$/i, 'My profile'],
  [/^Mes paiements$/i, 'My payments'],
  [/^Mes abonnements$/i, 'My subscriptions'],
  [/^Se déconnecter$/i, 'Log out'],
];

function normalizeLegacyFrenchLabels(root: ParentNode = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const original = node.textContent?.trim();
    if (original) {
      for (const [pattern, replacement] of legacyEnglishReplacements) {
        if (pattern.test(original)) {
          node.textContent = (node.textContent || '').replace(pattern, replacement);
          break;
        }
      }
    }
    node = walker.nextNode();
  }
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  const discordButton = target?.closest?.('.da-discord-button');
  if (!discordButton) return;

  event.preventDefault();
  window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
}, true);

const labelObserver = new MutationObserver(() => normalizeLegacyFrenchLabels());
labelObserver.observe(document.documentElement, { childList: true, subtree: true });
queueMicrotask(() => normalizeLegacyFrenchLabels());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
