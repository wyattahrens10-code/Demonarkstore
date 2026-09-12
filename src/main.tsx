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

function normalizeTextNode(node: Node) {
  const original = node.textContent?.trim();
  if (!original) return;

  for (const [pattern, replacement] of legacyEnglishReplacements) {
    if (pattern.test(original)) {
      node.textContent = (node.textContent || '').replace(pattern, replacement);
      break;
    }
  }
}

function normalizeLegacyFrenchLabels(root: Node = document.documentElement) {
  if (root.nodeType === Node.TEXT_NODE) {
    normalizeTextNode(root);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    normalizeTextNode(node);
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

const labelObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => normalizeLegacyFrenchLabels(node));
  }
});
labelObserver.observe(document.documentElement, { childList: true, subtree: true });
queueMicrotask(() => normalizeLegacyFrenchLabels());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
