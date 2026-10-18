'use client';
import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

const formatSize = bytes => `${(bytes / 1048576).toFixed(2)} МиБ`;

export default function Home() {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [sentBytes, setSentBytes] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [details, setDetails] = useState('');
  const controllerRef = useRef(null);
  const statsRef = useRef({ started: 0, lastChange: 0, lastBytes: 0, lastTime: 0 });

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - statsRef.current.started) / 1000));
      setIdleSeconds(Math.floor((now - statsRef.current.lastChange) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [busy]);

  async function submit(e) {
    e.preventDefault();
    if (!file || busy) return;
    if (!/\.mp4$/i.test(file.name)) {
      setStatus('Нужен готовый MP4, а не переименованный .m4s.');
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    const now = Date.now();
    statsRef.current = { started: now, lastChange: now, lastBytes: 0, lastTime: now };
    setBusy(true); setResult(null); setProgress(0); setSentBytes(0);
    setSpeed(0); setElapsed(0); setIdleSeconds(0); setDetails('');
    setPhase('Получение токена');
    setStatus('Запрашиваем разрешение на загрузку...');
    try {
      const name = `audio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const blob = await upload(name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        clientPayload: key,
        multipart: true,
        contentType: 'audio/mp4',
        abortSignal: controller.signal,
        onUploadProgress: ({ loaded, total, percentage }) => {
          const time = Date.now();
          const bytes = Number.isFinite(loaded) ? loaded : Math.round(file.size * (percentage || 0) / 100);
          const prev = statsRef.current;
          if (bytes > prev.lastBytes) {
            const dt = Math.max((time - prev.lastTime) / 1000, 0.1);
            setSpeed((bytes - prev.lastBytes) / dt);
            statsRef.current = { ...prev, lastChange: time, lastBytes: bytes, lastTime: time };
          }
          setSentBytes(bytes);
          setProgress(Math.min(100, Math.round(Number.isFinite(percentage) ? percentage : 100 * bytes / (total || file.size))));
          setPhase('Отправка частей');
          setStatus('Передаём файл напрямую в Vercel Blob...');
        }
      });
      setProgress(100);
      setPhase('Готово');
      setResult(blob);
      setStatus('Файл загружен. Публичная ссылка готова.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase(controller.signal.aborted ? 'Отменено' : 'Ошибка');
      setStatus(controller.signal.aborted ? 'Загрузка отменена.' : `Ошибка: ${message}`);
      setDetails(`Этап: ${statsRef.current.lastBytes > 0 ? 'multipart-загрузка' : 'получение токена / запуск'}; отправлено по данным браузера: ${formatSize(statsRef.current.lastBytes)}; прошло: ${Math.floor((Date.now() - statsRef.current.started) / 1000)} с. Проверьте F12 → Сеть: запросы /api/blob/upload и запросы к blob.vercel-storage.com. Не отправляйте секреты и заголовки Authorization.`);
    } finally {
      controllerRef.current = null;
      setBusy(false);
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    setStatus('Отменяем запросы... Если загрузка не остановится, обновите страницу.');
  }

  return <main>
    <h1>VOT Audio Bridge</h1>
    <p>Загрузите <b>готовый MP4 с аудио</b> напрямую в Vercel Blob и получите публичную ссылку.</p>
    <form onSubmit={submit}>
      <label>Ключ загрузки (UPLOAD_SECRET)<input type="password" required value={key} onChange={e => setKey(e.target.value)} placeholder="Ваш секретный ключ" autoComplete="off" /></label>
      <label>Аудиофайл MP4<input type="file" required accept=".mp4,audio/mp4,video/mp4" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      {file && <p className="small">{file.name} — {formatSize(file.size)}</p>}
      <button disabled={busy || !file || !key}>{busy ? 'Загрузка...' : 'Загрузить и получить ссылку'}</button>
    </form>
    {busy && <section aria-label="Ход загрузки">
      <p><b>Этап:</b> {phase}</p>
      <progress value={progress} max="100" />
      <p className="small">{progress}% · {formatSize(sentBytes)} из {file ? formatSize(file.size) : '—'} · {speed > 0 ? `${(speed / 1048576).toFixed(2)} МиБ/с` : 'скорость определяется'} · {elapsed} с</p>
      {idleSeconds >= 30 && <p className="warning" role="alert">Нет нового прогресса {idleSeconds} с. Это может быть отправка последней части или завершение multipart-загрузки. Если ожидание продолжается, проверьте F12 → Сеть.</p>}
      <button className="secondary" type="button" onClick={cancel}>Отменить загрузку</button>
    </section>}
    {status && <p role="status">{status}</p>}
    {details && <section><h2>Диагностика</h2><p className="small">{details}</p><button type="button" className="secondary" onClick={() => navigator.clipboard?.writeText(`${status}\n${details}`)}>Скопировать диагностику</button></section>}
    {result && <section><h2>Публичная ссылка</h2><input readOnly value={result.url} onFocus={e => e.target.select()} /><div className="actions"><button type="button" onClick={() => navigator.clipboard?.writeText(result.url)}>Скопировать</button><a href={result.url} target="_blank" rel="noreferrer">Открыть MP4</a></div><p className="small">Ссылка доступна всем, у кого она есть. Проверьте совместимость файла с VOT.</p></section>}
    <p className="small">Файлы хранятся в Blob до удаления. Не загружайте конфиденциальные записи в публичное хранилище.</p>
  </main>;
}
