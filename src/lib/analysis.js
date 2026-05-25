import {
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  NEGATION_WORDS,
  INTENSIFIER_WORDS,
  POSITIVE_EMOJIS,
  NEGATIVE_EMOJIS,
  STOPWORDS_ID,
} from './lexicon';

const positiveSet = new Set(POSITIVE_WORDS);
const negativeSet = new Set(NEGATIVE_WORDS);
const negationSet = new Set(NEGATION_WORDS);
const intensifierSet = new Set(INTENSIFIER_WORDS);
const stopwordSet = new Set(STOPWORDS_ID);

const SLANG_MAP = {
  gk: 'gak', ga: 'gak', nggak: 'gak', ngga: 'gak', enggak: 'gak',
  tdk: 'tidak', tp: 'tapi', krn: 'karena', krna: 'karena', yg: 'yang',
  utk: 'untuk', dg: 'dengan', dgn: 'dengan', sm: 'sama', jd: 'jadi',
  jg: 'juga', sy: 'saya', gw: 'saya', gue: 'saya', lo: 'kamu', lu: 'kamu',
  bgt: 'banget', org: 'orang', sdh: 'sudah', blm: 'belum', aja: 'saja',
  klo: 'kalau', kalo: 'kalau', gmn: 'bagaimana', gimana: 'bagaimana', bs: 'bisa',
};

export function cleanText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/@\w+/g, '')
    .replace(/#(\w+)/g, '$1')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSlang(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => SLANG_MAP[word] || word)
    .join(' ');
}

function emojiScore(text, emojis) {
  return emojis.reduce((sum, emoji) => sum + (String(text).split(emoji).length - 1), 0);
}

export function analyzeSentiment(text) {
  if (!text || !String(text).trim()) {
    return { label: 'netral', score: 0, posScore: 0, negScore: 0, matchedPos: [], matchedNeg: [] };
  }

  const original = String(text);
  const lower = original.toLowerCase();
  const posEmoji = emojiScore(original, POSITIVE_EMOJIS);
  const negEmoji = emojiScore(original, NEGATIVE_EMOJIS);
  const tokens = lower.replace(/[^\p{L}\p{N}_\s]/gu, ' ').split(/\s+/).filter(Boolean);

  let posScore = posEmoji;
  let negScore = negEmoji;
  const matchedPos = [];
  const matchedNeg = [];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    if (positiveSet.has(bigram)) { posScore += 1; matchedPos.push(bigram); }
    if (negativeSet.has(bigram)) { negScore += 1; matchedNeg.push(bigram); }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    let multiplier = 1;
    const prev1 = tokens[i - 1];
    const prev2 = tokens[i - 2];

    const negated = negationSet.has(prev1) || negationSet.has(prev2);
    if (intensifierSet.has(prev1) || intensifierSet.has(prev2)) multiplier = 1.5;

    if (positiveSet.has(token)) {
      if (negated) { negScore += 1 * multiplier; matchedNeg.push(`NOT_${token}`); }
      else { posScore += 1 * multiplier; matchedPos.push(token); }
    }

    if (negativeSet.has(token)) {
      if (negated) { posScore += 1 * multiplier; matchedPos.push(`NOT_${token}`); }
      else { negScore += 1 * multiplier; matchedNeg.push(token); }
    }
  }

  const score = posScore - negScore;
  let label = 'netral';
  if (score > 0.5) label = 'positif';
  if (score < -0.5) label = 'negatif';

  return {
    label,
    score: Number(score.toFixed(2)),
    posScore: Number(posScore.toFixed(2)),
    negScore: Number(negScore.toFixed(2)),
    matchedPos: [...new Set(matchedPos)],
    matchedNeg: [...new Set(matchedNeg)],
  };
}

export function preprocessRows(rows) {
  const required = ['id', 'tanggal', 'username', 'teks', 'likes', 'retweet'];
  const first = rows[0] || {};
  const missing = required.filter((col) => !(col in first));
  if (missing.length) throw new Error(`Kolom hilang: ${missing.join(', ')}`);

  return rows
    .map((row) => {
      const teksClean = cleanText(row.teks);
      const teksNorm = normalizeSlang(teksClean);
      const result = analyzeSentiment(teksNorm);
      const likes = Number.parseInt(row.likes, 10) || 0;
      const retweet = Number.parseInt(row.retweet, 10) || 0;
      const date = row.tanggal ? new Date(row.tanggal) : null;
      return {
        ...row,
        tanggal: Number.isNaN(date?.getTime()) ? null : date,
        tanggalText: row.tanggal || '',
        teks_clean: teksClean,
        teks_norm: teksNorm,
        jumlah_kata: teksClean.split(/\s+/).filter(Boolean).length,
        likes,
        retweet,
        engagement: likes + retweet,
        sentimen: result.label,
        skor_sentimen: result.score,
        skor_positif: result.posScore,
        skor_negatif: result.negScore,
        kata_positif: result.matchedPos.join(', '),
        kata_negatif: result.matchedNeg.join(', '),
      };
    })
    .filter((row) => row.teks_clean.length > 2);
}

export function formatNumber(n) {
  const value = Number(n) || 0;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
}

export function toCsv(rows) {
  const headers = ['id', 'tanggal', 'username', 'teks', 'likes', 'retweet', 'sentimen', 'skor_sentimen', 'skor_positif', 'skor_negatif', 'kata_positif', 'kata_negatif', 'engagement', 'teks_clean', 'teks_norm'];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(h === 'tanggal' ? row.tanggalText || formatDate(row.tanggal) : row[h])).join(','))].join('\n');
}

export function downloadCsv(rows, filename = 'hasil_analisis_sentimen.csv') {
  const blob = new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function wordFrequencies(rows, sentiment = 'semua', limit = 80) {
  const counts = new Map();
  rows
    .filter((row) => sentiment === 'semua' || row.sentimen === sentiment)
    .forEach((row) => {
      String(row.teks_norm || '')
        .replace(/[^\p{L}\p{N}_\s]/gu, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !stopwordSet.has(word))
        .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}
