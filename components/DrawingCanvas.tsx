'use client';
import { useEffect, useRef, useState } from 'react';

type Props = { onExport: (dataUrl: string) => void; resetKey?: number };

const COLORS = ['#4c2c2c','#f2a007','#1e88e5','#2a7f62','#e91e63','#000000','#ffffff'];
const SIZES = [2,4,6,10,16];

export default function DrawingCanvas({ onExport, resetKey }: Props) {
  const cRef = useRef<HTMLCanvasElement|null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D|null>(null);
  const [drawing,setDrawing]=useState(false);
  const [color,setColor]=useState(COLORS[0]);
  const [size,setSize]=useState(6);
  const [history,setHistory]=useState<ImageData[]>([]);

  // Set up canvas at correct pixel density & size
  useEffect(()=>{
    const c = cRef.current!;
    const ctx = c.getContext('2d')!;
    ctxRef.current = ctx;

    const init = () => {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      // Use layout width, and 3:2 aspect ratio
      const rect = c.getBoundingClientRect();
      const cssW = rect.width || 480;
      const cssH = cssW * (2/3); // 3:2 aspect ratio => height = width * 2/3

      // Set backing size in device pixels
      c.width  = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);

      // Set CSS size to match layout (fluid)
      c.style.width  = `${cssW}px`;
      c.style.height = `${cssH}px`;

      // Normalize drawing to device pixels
      ctx.setTransform(1,0,0,1,0,0); // reset any existing transforms
      ctx.scale(dpr, dpr);

      // Base styles
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      // Paint background (in CSS pixels because we scaled the context by dpr)
      ctx.fillStyle = '#fffaf3';
      ctx.fillRect(0,0,cssW,cssH);
    };

    init();
    // Resize listener (optional: clears content on resize)
    const onResize = () => init();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep brush in sync (no clearing)
  useEffect(()=>{ if(ctxRef.current) ctxRef.current.strokeStyle = color; }, [color]);
  useEffect(()=>{ if(ctxRef.current) ctxRef.current.lineWidth  = size; }, [size]);

  // Only clear when resetKey changes (after submit)
  useEffect(()=>{
    if (!cRef.current || !ctxRef.current) return;
    const c=cRef.current; const ctx=ctxRef.current;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const rect = c.getBoundingClientRect();
    const cssW = rect.width || 480;
    const cssH = cssW * (2/3);

    // Make sure backing store is still correct
    c.width  = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);

    ctx.fillStyle='#fffaf3'; ctx.fillRect(0,0,cssW,cssH);
    ctx.strokeStyle=color; ctx.lineWidth=size;
    setHistory([]);
  }, [resetKey, color, size]);

  // Precise pointer -> canvas coords (accounts for CSS scale vs backing store)
  function getPos(e: React.PointerEvent<HTMLCanvasElement>){
    const c=cRef.current!; const rect=c.getBoundingClientRect();
    // we draw in CSS pixel space because we scaled the context by dpr
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>){
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
    setDrawing(true);
    const {x,y}=getPos(e);
    const ctx=ctxRef.current!;
    ctx.beginPath(); ctx.moveTo(x,y);

    // Save snapshot for undo in device pixels:
    try{
      const c=cRef.current!;
      const snap = ctx.getImageData(0,0,Math.floor(c.width),Math.floor(c.height));
      setHistory(h=>[snap, ...h].slice(0,40));
    }catch{}
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>){
    if(!drawing) return;
    e.preventDefault();
    const {x,y}=getPos(e);
    const ctx=ctxRef.current!;
    ctx.lineTo(x,y); ctx.stroke();
  }

  function end(e?: React.PointerEvent<HTMLCanvasElement>){
    if(!drawing) return;
    setDrawing(false);
    // Export full-resolution PNG (backing store)
    onExport(cRef.current!.toDataURL('image/png'));
    (e?.target as HTMLCanvasElement|undefined)?.releasePointerCapture?.(e!.pointerId);
  }

  function reset(){
    const c=cRef.current!; const ctx=ctxRef.current!;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const rect = c.getBoundingClientRect();
    const cssW = rect.width || 480;
    const cssH = cssW * (2/3);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle='#fffaf3'; ctx.fillRect(0,0,cssW,cssH);
    ctx.strokeStyle=color; ctx.lineWidth=size;
  }

  function undo(){
    const ctx=ctxRef.current!, c=cRef.current!;
    setHistory(h=>{
      if(!h.length) return h;
      const [last, ...rest] = h;
      // Put the saved device-pixel imageData back
      ctx.setTransform(1,0,0,1,0,0);
      ctx.putImageData(last,0,0);
      // Restore transform for subsequent drawing
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      ctx.scale(dpr, dpr);
      ctx.strokeStyle=color; ctx.lineWidth=size;
      return rest;
    });
  }

  return (
    <div>
      <canvas
        className="canvasFrame"
        ref={cRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        // width/height are controlled in effect; style controls CSS size and aspect
        style={{ width:'100%', maxWidth:520, aspectRatio:'3 / 2', display:'block', margin:'0 auto', touchAction:'none' }}
      />
      <div className="toolbar" style={{justifyContent:'center'}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {COLORS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} aria-label={`color ${c}`} className="chip" style={{borderColor:'#e6d5c4'}}>
              <span style={{display:'inline-block', width:18, height:18, borderRadius:999, background:c, border:'1px solid #d9c4ae'}}/>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:6}}>
          {SIZES.map(s=>(
            <button key={s} onClick={()=>setSize(s)} className="chip">{s}px</button>
          ))}
        </div>
        <button onClick={undo} className="chip">Undo</button>
        <button onClick={reset} className="chip">Clear</button>
      </div>
    </div>
  );
}
