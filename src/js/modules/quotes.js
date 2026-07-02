import { elements } from '../dom.js';
import { storageKeys } from '../config.js';
import { readStorage, writeStorage } from '../utils/storage.js';

let quotes = [];
const fallbackQuotes = [
  { text: '风从很远的地方来，也会在你手边停一会儿。', source: '云外庭院' },
  { text: '慢慢来，比较快。', source: '个人语录' }
];

function normalizeQuotes(data) {
  if (!Array.isArray(data)) return fallbackQuotes;
  const normalized = data.map((item) => ({
    text: String(item?.text || '').trim(),
    source: String(item?.source || '自定义语录').trim()
  })).filter((item) => item.text);
  return normalized.length > 0 ? normalized : fallbackQuotes;
}

function getQuoteIndex() {
  return readStorage(storageKeys.quoteIndex, 0) % Math.max(quotes.length, 1);
}

function renderQuote(index = getQuoteIndex()) {
  const quote = quotes[index] || fallbackQuotes[0];
  elements.quoteText.textContent = quote.text;
  elements.quoteSource.textContent = quote.source || '自定义语录';
  writeStorage(storageKeys.quoteIndex, index);
}

export function nextQuote() {
  if (quotes.length <= 1) return renderQuote(0);
  const currentIndex = getQuoteIndex();
  const nextIndex = (currentIndex + 1 + Math.floor(Math.random() * (quotes.length - 1))) % quotes.length;
  renderQuote(nextIndex);
}

export async function loadQuotes() {
  try {
    const response = await fetch('src/data/quotes.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('quotes request failed');
    quotes = normalizeQuotes(await response.json());
  } catch {
    quotes = fallbackQuotes;
    elements.quoteSource.textContent = '读取本地 JSON 失败，已使用兜底语录';
  }
  renderQuote();
}
