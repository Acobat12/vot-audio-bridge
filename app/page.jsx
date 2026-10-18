'use client';
import { useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function Home() {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    if (!/\.mp4$/i.test(file.name)) { setStatus('Нужен готовый MP4, не переименованный .m4s.'); return; }
    setBusy(true); setResult(null); setProgress(0); setStatus('Получаем разрешение на загрузку...');
    try {
      const name = `audio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const blob = await upload(name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        clientPayload: key,
        multipart: true,
        contentType: 'audio/mp4',
        onUploadProgress: ({ percentage }) => { setProgress(Math.round(percentage)); setStatus('Загрузка в Blob...'); }
      });
      setResult(blob); setStatus('Файл загружен. Публичная ссылка готова.');
    } catch (err) { setStatus(`Ошибка: ${err.message}`); }
    finally { setBusy(false); }
  }
  return <main><h1>VOT Audio Bridge</h1><p>Загрузите <b>готовый MP4 с аудио</b> напрямую в Vercel Blob и получите публичную ссылку.</p>
    <form onSubmit={submit}>
      <label>Ключ загрузки (UPLOAD_SECRET)<input type="password" required value={key} onChange={e=>setKey(e.target.value)} placeholder="Ваш секретный ключ" autoComplete="off" /></label>
      <label>Аудиофайл MP4<input type="file" required accept=".mp4,audio/mp4,video/mp4" onChange={e=>setFile(e.target.files?.[0] || null)} /></label>
      {file && <p className="small">{file.name} — {(file.size / 1048576).toFixed(2)} МиБ</p>}
      <button disabled={busy || !file || !key}>{busy ? 'Загрузка...' : 'Загрузить и получить ссылку'}</button>
    </form>
    {busy && <progress value={progress} max="100" />}
    {status && <p role="status">{status}</p>}
    {result && <section><h2>Публичная ссылка</h2><input readOnly value={result.url} onFocus={e=>e.target.select()} /><div className="actions"><button onClick={()=>navigator.clipboard.writeText(result.url)}>Скопировать</button><a href={result.url} target="_blank" rel="noreferrer">Открыть MP4</a></div><p className="small">Ссылка доступна любому, у кого она есть. Проверьте совместимость MP4 с VOT.</p></section>}
    <p className="small">Файлы хранятся в Blob до удаления. Не загружайте конфиденциальные записи в публичное хранилище.</p>
  </main>;
}
