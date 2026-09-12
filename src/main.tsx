import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './demonark-v1.css';
import './demonark-polish.css';

const DISCORD_INVITE = 'https://discord.gg/CgVqbyGr4E';
const LANGUAGE_STORAGE_KEY = 'app.language';

try {
  if (!window.localStorage.getItem(LANGUAGE_STORAGE_KEY)) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    document.documentElement.lang = 'en';
  }
} catch {
  // Storage can be unavailable in private/locked-down browser contexts.
}

const legacyEnglishReplacements: Array<[RegExp, string]> = [
  [/^Compte \((.+)\)$/i, 'Account ($1)'],
  [/^Compte$/i, 'Account'],
  [/^Mon compte$/i, 'My account'],
  [/^Mon profil$/i, 'My profile'],
  [/^Mes paiements$/i, 'My payments'],
  [/^Mes abonnements$/i, 'My subscriptions'],
  [/^Se déconnecter$/i, 'Log out'],
];

function shouldNormalizeLegacyLabels() {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) !== 'fr';
  } catch {
    return document.documentElement.lang !== 'fr';
  }
}

function normalizeTextNode(node: Node) {
  if (!shouldNormalizeLegacyLabels()) return;
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
  if (!shouldNormalizeLegacyLabels()) return;

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
  if (!shouldNormalizeLegacyLabels()) return;
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
