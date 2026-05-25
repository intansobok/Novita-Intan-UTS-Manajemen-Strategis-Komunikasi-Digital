import { formatDate } from './analysis';

export const SENTIMENTS = ['positif', 'netral', 'negatif'];

export function sentimentCounts(rows) {
  const base = { positif: 0, netral: 0, negatif: 0 };
  rows.forEach((row) => { base[row.sentimen] = (base[row.sentimen] || 0) + 1; });
  return SENTIMENTS.map((name) => ({ name, value: base[name] || 0 }));
}

export function timeline(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.tanggal) return;
    const key = formatDate(row.tanggal);
    if (!map.has(key)) map.set(key, { tanggal: key, positif: 0, netral: 0, negatif: 0 });
    map.get(key)[row.sentimen] += 1;
  });
  return [...map.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export function engagementBySentiment(rows) {
  const map = new Map(SENTIMENTS.map((sent) => [sent, { sentimen: sent, likes: 0, retweet: 0, engagement: 0 }]));
  rows.forEach((row) => {
    const item = map.get(row.sentimen) || { sentimen: row.sentimen, likes: 0, retweet: 0, engagement: 0 };
    item.likes += row.likes;
    item.retweet += row.retweet;
    item.engagement += row.engagement;
    map.set(row.sentimen, item);
  });
  return SENTIMENTS.map((s) => map.get(s));
}

export function scoreDistribution(rows) {
  const bins = new Map();
  rows.forEach((row) => {
    const key = Math.round(Number(row.skor_sentimen || 0));
    bins.set(key, (bins.get(key) || 0) + 1);
  });
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([skor, jumlah]) => ({ skor, jumlah }));
}

export function topUsers(rows, limit = 10) {
  const counts = new Map();
  rows.forEach((row) => counts.set(row.username, (counts.get(row.username) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([username, jumlah]) => ({ username, jumlah }));
}

export function topTweets(rows, limit = 10) {
  return [...rows].sort((a, b) => b.engagement - a.engagement).slice(0, limit);
}

export function topMatchedWords(rows, sentiment, limit = 15) {
  const col = sentiment === 'positif' ? 'kata_positif' : 'kata_negatif';
  const counts = new Map();
  rows.forEach((row) => {
    String(row[col] || '')
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word && !word.startsWith('NOT_'))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([kata, frekuensi]) => ({ kata, frekuensi }));
}

export function heatmap(rows) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const map = new Map();
  rows.forEach((row) => {
    if (!row.tanggal) return;
    const day = days[row.tanggal.getDay()];
    const hour = row.tanggal.getHours();
    const key = `${day}-${hour}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return days.flatMap((day) => Array.from({ length: 24 }, (_, hour) => ({ day, hour, value: map.get(`${day}-${hour}`) || 0 })));
}
