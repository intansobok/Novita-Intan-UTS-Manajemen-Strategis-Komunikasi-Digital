import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, FileUp, Filter, MessageCircle, Search, TrendingUp } from 'lucide-react';
import { preprocessRows, formatNumber, downloadCsv, formatDate, wordFrequencies } from './lib/analysis';
import {
  engagementBySentiment,
  heatmap,
  scoreDistribution,
  sentimentCounts,
  timeline,
  topMatchedWords,
  topTweets,
  topUsers,
} from './lib/aggregations';
import './styles.css';

const COLORS = {
  positif: '#3B82F6',
  netral: '#94A3B8',
  negatif: '#1E3A8A',
};

function parseCsvText(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) throw new Error(parsed.errors[0].message);
  return preprocessRows(parsed.data);
}

function App() {
  const [rows, setRows] = useState([]);
  const [sourceName, setSourceName] = useState('data/tweets.csv');
  const [error, setError] = useState('');
  const [sentiments, setSentiments] = useState(['positif', 'netral', 'negatif']);
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [wordSentiment, setWordSentiment] = useState('semua');

  useEffect(() => {
    fetch('/data/tweets.csv')
      .then((res) => res.text())
      .then((text) => {
        const processed = parseCsvText(text);
        setRows(processed);
        const dates = processed.map((r) => r.tanggal).filter(Boolean).sort((a, b) => a - b);
        if (dates.length) {
          setStartDate(formatDate(dates[0]));
          setEndDate(formatDate(dates[dates.length - 1]));
        }
      })
      .catch((err) => setError(`Gagal memuat data default: ${err.message}`));
  }, []);

  const filtered = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
    return rows.filter((row) => {
      const matchesSentiment = sentiments.includes(row.sentimen);
      const matchesKeyword = !keyword || row.teks_clean.toLowerCase().includes(keyword.toLowerCase()) || row.username.toLowerCase().includes(keyword.toLowerCase());
      const matchesStart = !start || (row.tanggal && row.tanggal >= start);
      const matchesEnd = !end || (row.tanggal && row.tanggal <= end);
      return matchesSentiment && matchesKeyword && matchesStart && matchesEnd;
    });
  }, [rows, sentiments, keyword, startDate, endDate]);

  const counts = sentimentCounts(filtered);
  const total = filtered.length;
  const pos = counts.find((c) => c.name === 'positif')?.value || 0;
  const neu = counts.find((c) => c.name === 'netral')?.value || 0;
  const neg = counts.find((c) => c.name === 'negatif')?.value || 0;
  const totalEngagement = filtered.reduce((sum, row) => sum + row.engagement, 0);
  const totalLikes = filtered.reduce((sum, row) => sum + row.likes, 0);
  const totalRetweet = filtered.reduce((sum, row) => sum + row.retweet, 0);

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const processed = parseCsvText(String(reader.result));
        setRows(processed);
        setSourceName(file.name);
        setError('');
        const dates = processed.map((r) => r.tanggal).filter(Boolean).sort((a, b) => a - b);
        if (dates.length) {
          setStartDate(formatDate(dates[0]));
          setEndDate(formatDate(dates[dates.length - 1]));
        }
      } catch (err) {
        setError(`Gagal memproses CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function toggleSentiment(sentiment) {
    setSentiments((current) => current.includes(sentiment) ? current.filter((s) => s !== sentiment) : [...current, sentiment]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🕌</div>
          <div>
            <h2>Dakwah Digital</h2>
            <p>Sentiment Dashboard</p>
          </div>
        </div>

        <section className="panel">
          <h3><FileUp size={18} /> Sumber Data</h3>
          <p className="muted">Data aktif: <strong>{sourceName}</strong></p>
          <label className="upload-box">
            <input type="file" accept=".csv" onChange={handleUpload} />
            Upload CSV Baru
          </label>
          <p className="hint">Kolom wajib: id, tanggal, username, teks, likes, retweet.</p>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel">
          <h3><Filter size={18} /> Filter Data</h3>
          <label>Mulai<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>Sampai<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          <div className="check-group">
            {['positif', 'netral', 'negatif'].map((sentiment) => (
              <button key={sentiment} className={sentiments.includes(sentiment) ? `chip active ${sentiment}` : 'chip'} onClick={() => toggleSentiment(sentiment)}>
                {sentiment}
              </button>
            ))}
          </div>
          <label><Search size={15} /> Kata Kunci<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="dakwah, ustadz, kajian..." /></label>
        </section>
      </aside>

      <main className="content">
        <header className="hero-header">
          <div>
            <p className="eyebrow">Dashboard Analisis Sentimen</p>
            <h1>Memantau Percakapan Twitter/X tentang Dakwah Digital</h1>
            <p>Versi JavaScript/React yang dapat di-host langsung di Vercel.</p>
          </div>
          <button className="primary-btn" onClick={() => downloadCsv(filtered)}><Download size={18} /> Export CSV</button>
        </header>

        <section className="kpi-grid">
          <Kpi title="Total Tweet" value={formatNumber(total)} subtitle={`${total.toLocaleString('id-ID')} tweet terfilter`} icon={<MessageCircle />} />
          <Kpi title="Sentimen Positif" value={formatNumber(pos)} subtitle={`${total ? ((pos / total) * 100).toFixed(1) : 0}% dari total`} tone="positive" />
          <Kpi title="Sentimen Netral" value={formatNumber(neu)} subtitle={`${total ? ((neu / total) * 100).toFixed(1) : 0}% dari total`} tone="neutral" />
          <Kpi title="Sentimen Negatif" value={formatNumber(neg)} subtitle={`${total ? ((neg / total) * 100).toFixed(1) : 0}% dari total`} tone="negative" />
          <Kpi title="Engagement" value={formatNumber(totalEngagement)} subtitle={`${formatNumber(totalLikes)} likes + ${formatNumber(totalRetweet)} RT`} icon={<TrendingUp />} />
        </section>

        <nav className="tabs">
          {[
            ['overview', '📊 Overview'],
            ['trend', '📈 Tren Waktu'],
            ['words', '☁️ Kata Kunci'],
            ['top', '🏆 Top Konten'],
            ['data', '📋 Data & Export'],
          ].map(([key, label]) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>)}
        </nav>

        {filtered.length === 0 ? <EmptyState /> : (
          <>
            {activeTab === 'overview' && <Overview rows={filtered} counts={counts} />}
            {activeTab === 'trend' && <Trend rows={filtered} />}
            {activeTab === 'words' && <Words rows={filtered} wordSentiment={wordSentiment} setWordSentiment={setWordSentiment} />}
            {activeTab === 'top' && <Top rows={filtered} />}
            {activeTab === 'data' && <DataTable rows={filtered} />}
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({ title, value, subtitle, tone = '', icon }) {
  return <article className={`kpi-card ${tone}`}><div className="kpi-top"><span>{title}</span>{icon}</div><strong>{value}</strong><p>{subtitle}</p></article>;
}

function ChartCard({ title, children }) {
  return <section className="chart-card"><h3>{title}</h3>{children}</section>;
}

function Overview({ rows, counts }) {
  return <div className="grid two">
    <ChartCard title="🥧 Distribusi Sentimen">
      <ResponsiveContainer height={320}>
        <PieChart><Pie data={counts} dataKey="value" nameKey="name" innerRadius={78} outerRadius={116} paddingAngle={4}>{counts.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}</Pie><Tooltip /><Legend /></PieChart>
      </ResponsiveContainer>
    </ChartCard>
    <ChartCard title="📊 Distribusi Skor Sentimen">
      <ResponsiveContainer height={320}><BarChart data={scoreDistribution(rows)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="skor" /><YAxis /><Tooltip /><Bar dataKey="jumlah" radius={[8, 8, 0, 0]} fill="#3B82F6" /></BarChart></ResponsiveContainer>
    </ChartCard>
    <ChartCard title="💙 Engagement per Sentimen">
      <ResponsiveContainer height={320}><BarChart data={engagementBySentiment(rows)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="sentimen" /><YAxis /><Tooltip /><Legend /><Bar dataKey="likes" fill="#3B82F6" radius={[8, 8, 0, 0]} /><Bar dataKey="retweet" fill="#93C5FD" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
    </ChartCard>
    <ChartCard title="🔥 Heatmap Aktivitas Hari × Jam"><Heatmap rows={rows} /></ChartCard>
  </div>;
}

function Trend({ rows }) {
  const data = timeline(rows);
  const busy = data.length ? [...data].sort((a, b) => (b.positif + b.netral + b.negatif) - (a.positif + a.netral + a.negatif))[0] : null;
  return <div className="grid one">
    <ChartCard title="📈 Tren Sentimen Harian">
      <ResponsiveContainer height={380}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tanggal" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="positif" stroke={COLORS.positif} fill={COLORS.positif} fillOpacity={0.2} /><Area type="monotone" dataKey="netral" stroke={COLORS.netral} fill={COLORS.netral} fillOpacity={0.15} /><Area type="monotone" dataKey="negatif" stroke={COLORS.negatif} fill={COLORS.negatif} fillOpacity={0.15} /></AreaChart></ResponsiveContainer>
    </ChartCard>
    {busy && <div className="mini-stat">Hari tersibuk: <strong>{busy.tanggal}</strong> dengan <strong>{busy.positif + busy.netral + busy.negatif}</strong> tweet.</div>}
  </div>;
}

function Words({ rows, wordSentiment, setWordSentiment }) {
  const words = wordFrequencies(rows, wordSentiment, 60);
  const posWords = topMatchedWords(rows, 'positif');
  const negWords = topMatchedWords(rows, 'negatif');
  const max = Math.max(...words.map((w) => w.value), 1);
  return <div className="grid two">
    <ChartCard title="☁️ Word Cloud Sederhana">
      <select value={wordSentiment} onChange={(e) => setWordSentiment(e.target.value)} className="select"><option value="semua">Semua</option><option value="positif">Positif</option><option value="netral">Netral</option><option value="negatif">Negatif</option></select>
      <div className="word-cloud">{words.map((w) => <span key={w.text} style={{ fontSize: `${14 + (w.value / max) * 30}px` }}>{w.text}</span>)}</div>
    </ChartCard>
    <ChartCard title="🔎 Kata Positif Teratas"><WordBar data={posWords} /></ChartCard>
    <ChartCard title="🔎 Kata Negatif Teratas"><WordBar data={negWords} /></ChartCard>
  </div>;
}

function WordBar({ data }) {
  return <ResponsiveContainer height={330}><BarChart data={data} layout="vertical" margin={{ left: 55 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="kata" type="category" width={90} /><Tooltip /><Bar dataKey="frekuensi" fill="#3B82F6" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer>;
}

function Top({ rows }) {
  return <div className="grid two">
    <ChartCard title="👤 Pengguna Paling Aktif"><ResponsiveContainer height={360}><BarChart data={topUsers(rows)} layout="vertical" margin={{ left: 75 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="username" width={110} /><Tooltip /><Bar dataKey="jumlah" fill="#1E40AF" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></ChartCard>
    <ChartCard title="🏆 Top Tweet Berdasarkan Engagement"><TweetList rows={topTweets(rows, 8)} /></ChartCard>
  </div>;
}

function TweetList({ rows }) {
  return <div className="tweet-list">{rows.map((row) => <article key={row.id} className="tweet-card"><div><strong>@{row.username}</strong><span className={`badge ${row.sentimen}`}>{row.sentimen}</span></div><p>{row.teks}</p><small>{formatNumber(row.likes)} likes · {formatNumber(row.retweet)} RT · skor {row.skor_sentimen}</small></article>)}</div>;
}

function DataTable({ rows }) {
  return <ChartCard title="📋 Data Hasil Analisis">
    <button className="primary-btn small" onClick={() => downloadCsv(rows)}><Download size={16} /> Unduh CSV</button>
    <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Username</th><th>Teks</th><th>Sentimen</th><th>Skor</th><th>Likes</th><th>RT</th></tr></thead><tbody>{rows.slice(0, 100).map((row) => <tr key={row.id}><td>{formatDate(row.tanggal)}</td><td>@{row.username}</td><td>{row.teks}</td><td><span className={`badge ${row.sentimen}`}>{row.sentimen}</span></td><td>{row.skor_sentimen}</td><td>{row.likes}</td><td>{row.retweet}</td></tr>)}</tbody></table></div>
    <p className="hint">Menampilkan 100 baris pertama. Gunakan tombol unduh untuk mengambil seluruh data terfilter.</p>
  </ChartCard>;
}

function Heatmap({ rows }) {
  const cells = heatmap(rows);
  const max = Math.max(...cells.map((c) => c.value), 1);
  return <div className="heatmap"><div className="heat-head"></div>{Array.from({ length: 24 }, (_, h) => <div key={h} className="heat-hour">{h}</div>)}{['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => <React.Fragment key={day}><div className="heat-day">{day}</div>{Array.from({ length: 24 }, (_, hour) => { const item = cells.find((c) => c.day === day && c.hour === hour); const opacity = (item?.value || 0) / max; return <div key={`${day}-${hour}`} title={`${day} ${hour}:00 = ${item?.value || 0} tweet`} className="heat-cell" style={{ backgroundColor: `rgba(59,130,246,${0.08 + opacity * 0.9})` }} />; })}</React.Fragment>)}</div>;
}

function EmptyState() { return <div className="empty">Tidak ada data yang cocok dengan filter saat ini.</div>; }

createRoot(document.getElementById('root')).render(<App />);
