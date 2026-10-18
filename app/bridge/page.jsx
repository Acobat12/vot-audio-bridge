"use client";
import {useEffect,useRef,useState} from 'react';
import {upload} from '@vercel/blob/client';
const ALLOWED = /^https:\/\/(?:www\.)?bilibili\.com$/;
export default function Bridge(){
 const [key,setKey]=useState(''); const [status,setStatus]=useState('Введите ключ загрузки один раз для этой вкладки');
 const [progress,setProgress]=useState(0); const [pending,setPending]=useState(null);
 const keyRef=useRef(''); const pendingRef=useRef(null); const busyRef=useRef(false);
 useEffect(()=>{try{const v=sessionStorage.getItem('vot-bridge-secret')||'';keyRef.current=v;setKey(v);if(v)setStatus('Готов к загрузке');}catch{}},[]);
 useEffect(()=>{const handler=e=>{
   if(!ALLOWED.test(e.origin)||e.source!==window.parent||e.data?.type!=='VOT_BLOB_UPLOAD')return;
   if(busyRef.current){e.source.postMessage({type:'VOT_BLOB_RESULT',id:e.data.id,error:'Другая загрузка уже выполняется'},e.origin);return;}
   if(!(e.data.file instanceof Blob)||e.data.file.size<1||e.data.file.size>1024*1024*1024){e.source.postMessage({type:'VOT_BLOB_RESULT',id:e.data.id,error:'Недопустимый файл или размер'},e.origin);return;}
   pendingRef.current={id:e.data.id,file:e.data.file,name:e.data.name,origin:e.origin};setPending(pendingRef.current);
   if(keyRef.current)start(pendingRef.current,keyRef.current);
 };window.addEventListener('message',handler);return()=>window.removeEventListener('message',handler);},[]);
 async function start(job,secret){if(!job||busyRef.current||!secret)return;busyRef.current=true;setStatus('Загрузка в Vercel Blob…');setProgress(0);
 try{const filename=String(job.name||'audio.mp4').replace(/[^A-Za-z0-9._-]/g,'_').slice(0,90);
 const pathname=`audio/${Date.now()}-${filename.endsWith('.mp4')?filename:filename+'.mp4'}`;
 const result=await upload(pathname,job.file,{access:'public',handleUploadUrl:'/api/blob/upload',clientPayload:secret,multipart:true,contentType:'audio/mp4',onUploadProgress:({percentage})=>setProgress(Math.round(percentage||0))});
 window.parent.postMessage({type:'VOT_BLOB_RESULT',id:job.id,url:result.url},job.origin);setStatus('Файл загружен; ссылка передана VOT');setPending(null);pendingRef.current=null;
 }catch(e){setStatus('Ошибка: '+(e?.message||String(e)));window.parent.postMessage({type:'VOT_BLOB_RESULT',id:job.id,error:e?.message||String(e)},job.origin);setPending(null);pendingRef.current=null;keyRef.current='';try{sessionStorage.removeItem('vot-bridge-secret')}catch{} }
 finally{busyRef.current=false;}}
 function save(e){e.preventDefault();keyRef.current=key;try{sessionStorage.setItem('vot-bridge-secret',key)}catch{};if(pendingRef.current)start(pendingRef.current,key);else setStatus('Ключ сохранён для этой вкладки. Нажмите «Перевести» в VOT.');}
 return <main style={{fontFamily:'sans-serif',background:'#162237',color:'#fff',padding:12,minHeight:'100vh',boxSizing:'border-box'}}><b>VOT → Vercel Blob</b><p style={{fontSize:12}}>{status}</p><form onSubmit={save}><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="UPLOAD_SECRET" style={{maxWidth:'65%'}}/><button type="submit">Сохранить ключ</button></form>{pending&&<p style={{fontSize:12}}>Аудио: {(pending.file.size/1048576).toFixed(1)} МиБ · {progress}%</p>}</main>;
}
