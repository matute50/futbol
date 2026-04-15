import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Equipo, Partido } from '../types';
import { supabase } from '../supabase';
import {
  precargarPartido,
  setGoalLocal,
  setGoalVisita,
  ejecutarCiclo,
  stopCountdown,
  setColorLocal  as vmixSetColorLocal,
  setColorVisita as vmixSetColorVisita,
  setTextColorLocal,
  setTextColorVisita,
} from '../lib/vmix';

interface Props {
  equipos: Equipo[];
  partidos: Partido[];
  onPartidoFinalizado: (idPartido: string, golesLocal: number, golesVisita: number) => void;
}

type EstadoPartido = 'pre' | 'primer_tiempo' | 'entretiempo' | 'segundo_tiempo' | 'finalizado';

const CICLO_LABELS: Record<EstadoPartido, { label: string; color: string; icon: string }> = {
  pre:            { label: 'INICIAR 1° TIEMPO',  color: '#22c55e', icon: '▶' },
  primer_tiempo:  { label: 'FIN 1° TIEMPO',      color: '#f59e0b', icon: '⏸' },
  entretiempo:    { label: 'INICIAR 2° TIEMPO',  color: '#22c55e', icon: '▶' },
  segundo_tiempo: { label: 'FINALIZAR PARTIDO',  color: '#ef4444', icon: '🏁' },
  finalizado:     { label: 'PARTIDO FINALIZADO', color: '#6b7280', icon: '✓' },
};

const ESTADO_ORDEN: EstadoPartido[] = ['pre', 'primer_tiempo', 'entretiempo', 'segundo_tiempo', 'finalizado'];
const VMIX_CICLO_MAP: Record<EstadoPartido, 0 | 1 | 2 | 3> = {
  pre: 0, primer_tiempo: 1, entretiempo: 2, segundo_tiempo: 3, finalizado: 3,
};
const PERIODO_DISPLAY: Record<EstadoPartido, string> = {
  pre: '—', primer_tiempo: '1° TIEMPO', entretiempo: 'ENTREETIEMPO', segundo_tiempo: '2° TIEMPO', finalizado: 'FINAL',
};

export const TabConsola: React.FC<Props> = ({ equipos, partidos, onPartidoFinalizado }) => {
  const [turno,        setTurno]        = useState('');
  const [partidoSel,   setPartidoSel]   = useState<Partido | null>(null);

  const [golesLocal,   setGolesLocal]   = useState(0);
  const [golesVisita,  setGolesVisita]  = useState(0);
  const [estadoJuego,  setEstadoJuego]  = useState<EstadoPartido>('pre');

  const [segundos, setSegundos] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [colorLocal1,  setColorLocal1]  = useState('#1a4a2e');
  const [colorLocal2,  setColorLocal2]  = useState('#1a4a2e');
  const [textColorLocal, setTextColorLocal] = useState('white');
  const [colorVisita1, setColorVisita1] = useState('#1a2a4a');
  const [colorVisita2, setColorVisita2] = useState('#1a2a4a');
  const [textColorVisita, setTextColorVisita] = useState('white');

  const [status, setStatus] = useState<{ type: 'idle' | 'ok' | 'error' | 'loading'; msg: string }>({ type: 'idle', msg: '' });
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSegundos(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTiempo = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showStatus = (type: 'ok' | 'error' | 'loading', msg: string) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ type, msg });
    if (type !== 'loading') statusTimer.current = setTimeout(() => setStatus({ type: 'idle', msg: '' }), 3000);
  };

  const turnosDisponibles = [...new Set(partidos.filter(p => !p.es_libre).map(p => p.turno_horario).filter(Boolean))].sort() as string[];
  const partidosFiltrados = partidos.filter(p => !p.es_libre && (!turno || p.turno_horario === turno));

  const getNombre = (id: string | null) => equipos.find(e => e.id === id)?.nombre ?? id ?? '??';

  const seleccionarPartido = useCallback(async (p: Partido) => {
    setPartidoSel(p);
    setGolesLocal(0);
    setGolesVisita(0);
    setEstadoJuego('pre');
    setSegundos(0);
    setIsTimerRunning(false);
    
    const eqL = equipos.find(e => e.id === p.id_local);
    const eqV = equipos.find(e => e.id === p.id_visitante);
    const cL1 = eqL?.color ?? '#1a4a2e';
    const cL2 = eqL?.color_secundario ?? cL1;
    const tL  = eqL?.color_texto ?? 'white';
    const cV1 = eqV?.color ?? '#1a2a4a';
    const cV2 = eqV?.color_secundario ?? cV1;
    const tV  = eqV?.color_texto ?? 'white';
    
    setColorLocal1(cL1); setColorLocal2(cL2); setTextColorLocal(tL);
    setColorVisita1(cV1); setColorVisita2(cV2); setTextColorVisita(tV);
    
    try {
      await precargarPartido({
        nombreLocal: getNombre(p.id_local).toUpperCase(),
        nombreVisita: getNombre(p.id_visitante).toUpperCase(),
        zona: `ZONA ${p.zona}`,
        colorLocal: cL1, colorLocal2: cL2, colorTextoLocal: tL,
        colorVisita: cV1, colorVisita2: cV2, colorTextoVisita: tV,
      });
      showStatus('ok', 'Partido listo');
    } catch { showStatus('error', 'Error vMix'); }
  }, [equipos]);

  const cambiarGol = useCallback(async (equipo: 'local' | 'visita', delta: 1 | -1) => {
    if (!partidoSel) return;
    if (equipo === 'local') {
      const nuevo = Math.max(0, golesLocal + delta);
      setGolesLocal(nuevo);
      await setGoalLocal(nuevo).catch(() => showStatus('error', 'Error vMix'));
    } else {
      const nuevo = Math.max(0, golesVisita + delta);
      setGolesVisita(nuevo);
      await setGoalVisita(nuevo).catch(() => showStatus('error', 'Error vMix'));
    }
  }, [partidoSel, golesLocal, golesVisita]);

  const avanzarCiclo = useCallback(async () => {
    if (!partidoSel || estadoJuego === 'finalizado') return;
    const idx = ESTADO_ORDEN.indexOf(estadoJuego);
    const siguiente = ESTADO_ORDEN[idx + 1] as EstadoPartido;

    try {
      await ejecutarCiclo(VMIX_CICLO_MAP[estadoJuego]);
      setEstadoJuego(siguiente);
      
      // Control de reloj automático
      if (siguiente === 'primer_tiempo' || siguiente === 'segundo_tiempo') {
        setIsTimerRunning(true);
      } else {
        setIsTimerRunning(false);
        if (siguiente === 'entretiempo') setSegundos(0);
      }

      if (siguiente === 'finalizado') {
        await supabase.from('partidos').update({ goles_local: golesLocal, goles_visitante: golesVisita, estado: 'jugado' }).eq('id_partido', partidoSel.id_partido);
        onPartidoFinalizado(partidoSel.id_partido, golesLocal, golesVisita);
        showStatus('ok', 'Partido guardado');
      }
    } catch { showStatus('error', 'Error vMix'); }
  }, [partidoSel, estadoJuego, golesLocal, golesVisita, onPartidoFinalizado]);

  const aplicarColor = async (lado: 'local' | 'visita', hex1: string, hex2: string, textHex: string) => {
    if (lado === 'local') {
      setColorLocal1(hex1); setColorLocal2(hex2); setTextColorLocal(textHex);
      vmixSetColorLocal(hex1, hex2);
      setTextColorLocal(textHex);
      if (partidoSel?.id_local) await supabase.from('equipos').update({ color: hex1, color_secundario: hex2, color_texto: textHex }).eq('id', partidoSel.id_local);
    } else {
      setColorVisita1(hex1); setColorVisita2(hex2); setTextColorVisita(textHex);
      vmixSetColorVisita(hex1, hex2);
      setTextColorVisita(textHex);
      if (partidoSel?.id_visitante) await supabase.from('equipos').update({ color: hex1, color_secundario: hex2, color_texto: textHex }).eq('id', partidoSel.id_visitante);
    }
  };

  const resetPartido = async () => {
    if (!partidoSel) return;
    if (!confirm('¿ESTÁ SEGURO DE REINICIAR EL PARTIDO? Se borrarán goles y reloj.')) return;

    try {
      showStatus('loading', 'Reiniciando...');
      setGolesLocal(0);
      setGolesVisita(0);
      setEstadoJuego('pre');
      setSegundos(0);
      setIsTimerRunning(false);

      // vMix Reset
      await stopCountdown();
      await precargarPartido({
        nombreLocal: getNombre(partidoSel.id_local).toUpperCase(),
        nombreVisita: getNombre(partidoSel.id_visitante).toUpperCase(),
        zona: `ZONA ${partidoSel.zona}`,
        colorLocal: colorLocal1, colorLocal2: colorLocal2, colorTextoLocal: textColorLocal,
        colorVisita: colorVisita1, colorVisita2: colorVisita2, colorTextoVisita: textColorVisita,
      });

      // Supabase
      await supabase.from('partidos').update({ 
        goles_local: 0, 
        goles_visitante: 0, 
        estado: 'pendiente' 
      }).eq('id_partido', partidoSel.id_partido);

      onPartidoFinalizado(partidoSel.id_partido, 0, 0); 
      showStatus('ok', 'Partido reiniciado');
    } catch {
      showStatus('error', 'Error al reiniciar');
    }
  };

  const cicloInfo = CICLO_LABELS[estadoJuego];

  useEffect(() => {
    const handleReset = () => {
      if (partidoSel) resetPartido();
    };
    window.addEventListener('reset-match', handleReset);
    return () => window.removeEventListener('reset-match', handleReset);
  }, [partidoSel, resetPartido]);

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={sectionTitleStyle}>GESTIÓN DE PARTIDOS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
            {partidosFiltrados.map(p => {
              const sel = partidoSel?.id_partido === p.id_partido;
              return (
                <button key={p.id_partido} onClick={() => seleccionarPartido(p)} style={{
                  background: sel ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${sel ? 'var(--gold)' : 'var(--dark-border)'}`,
                  padding: '12px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: sel ? 'var(--gold)' : 'white', fontFamily: 'Oswald' }}>
                    {getNombre(p.id_local).toUpperCase()} vs {getNombre(p.id_visitante).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                    ZONA {p.zona} · {p.turno_horario} {p.estado === 'jugado' ? '· FINALIZADO' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={sectionTitleStyle}>AJUSTE DE COLORES</h3>
          <div className="space-y-4">
            <ColorTool label="LOCAL" v1={colorLocal1} v2={colorLocal2} vt={textColorLocal} onChange={(h1, h2, ht) => aplicarColor('local', h1, h2, ht)} />
            <ColorTool label="VISITA" v1={colorVisita1} v2={colorVisita2} vt={textColorVisita} onChange={(h1, h2, ht) => aplicarColor('visita', h1, h2, ht)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {status.type !== 'idle' && (
          <div className="fade-in" style={{
            background: status.type === 'ok' ? '#22c55e11' : status.type === 'error' ? '#ef444411' : '#3b82f611',
            border: `1px solid ${status.type === 'ok' ? '#22c55e44' : status.type === 'error' ? '#ef444444' : '#3b82f644'}`,
            color: status.type === 'ok' ? '#22c55e' : status.type === 'error' ? '#ef4444' : '#3b82f6',
            padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textAlign: 'center'
          }}>{status.msg}</div>
        )}

        {!partidoSel ? (
          <div className="glass-card" style={{ padding: '100px 40px', textAlign: 'center', border: '2px dashed var(--dark-border)' }}>
             <p className="text-2xl font-black text-gray-500 uppercase tracking-widest" style={{ fontFamily: 'Oswald' }}>Elija un partido arriba para comenzar</p>
          </div>
        ) : (
          <div className="glass-card p-10 flex flex-col gap-10" style={{ position: 'relative' }}>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '40px', alignItems: 'center' }}>
                <GoalControl 
                  name={getNombre(partidoSel.id_local).toUpperCase()}
                  goles={golesLocal} c1={colorLocal1} c2={colorLocal2} textColor={textColorLocal}
                  onMas={() => cambiarGol('local', 1)} onMenos={() => cambiarGol('local', -1)}
                  disabled={estadoJuego === 'pre' || estadoJuego === 'finalizado'}
                />
                
                {/* RELOJ CENTRAL */}
                <div className="text-center">
                   {/* Botón de reloj manual (play/pause) por si acaso */}
                   <button 
                     onClick={() => setIsTimerRunning(!isTimerRunning)} 
                     disabled={estadoJuego === 'pre' || estadoJuego === 'finalizado' || estadoJuego === 'entretiempo'}
                     style={{ 
                       background: 'transparent', border: 'none', cursor: 'pointer',
                       display: 'flex', flexDirection: 'column', alignItems: 'center'
                     }}
                   >
                     <div className="text-8xl font-black text-gold italic mb-2 select-none" style={{ fontFamily: 'Oswald', minWidth: '240px' }}>
                        {formatTiempo(segundos)}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
                        {isTimerRunning ? '⏸ RELOJ CORRIENDO' : '▶ RELOJ DETENIDO'}
                     </span>
                   </button>
                </div>

                <GoalControl 
                  name={getNombre(partidoSel.id_visitante).toUpperCase()}
                  goles={golesVisita} c1={colorVisita1} c2={colorVisita2} textColor={textColorVisita}
                  onMas={() => cambiarGol('visita', 1)} onMenos={() => cambiarGol('visita', -1)}
                  disabled={estadoJuego === 'pre' || estadoJuego === 'finalizado'}
                />
             </div>

             <div className="flex gap-4">
                <button onClick={avanzarCiclo} disabled={estadoJuego === 'finalizado'} style={{
                  flex: 1, padding: '16px', borderRadius: '12px', fontSize: '20px', fontWeight: 900,
                  background: estadoJuego === 'finalizado' ? '#1f2937' : `linear-gradient(135deg, ${cicloInfo.color}, #000)`,
                  color: 'white', border: `2px solid ${cicloInfo.color}`, cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'Oswald', letterSpacing: '2px'
                }}>
                  {cicloInfo.icon} {cicloInfo.label}
                </button>
                
                {/* Botón RESET reloj */}
                <button 
                  onClick={() => setSegundos(0)} 
                  disabled={isTimerRunning}
                  style={{ 
                    padding: '0 20px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#6b7280',
                    fontSize: '18px', cursor: 'pointer' 
                  }} title="Reiniciar Reloj">
                  ↺
                </button>
             </div>
          </div>
        )}

        {partidoSel && (
          <div className="glass-card p-4 flex gap-4">
            {ESTADO_ORDEN.filter(e => e !== 'pre').map((e, idx) => {
              const currentIdx = ESTADO_ORDEN.indexOf(estadoJuego);
              const step = idx + 1;
              const active = currentIdx === step;
              const done = currentIdx > step;
              return (
                <div key={e} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: done ? '#22c55e' : active ? 'var(--gold)' : '#1f2937', marginBottom: '6px' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, color: done ? '#22c55e' : active ? 'var(--gold)' : '#374151', fontFamily: 'Oswald', textTransform: 'uppercase' }}>{PERIODO_DISPLAY[e]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);
};

const GoalControl = ({ name, goles, c1, c2, textColor, onMas, onMenos, disabled }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
    <div style={{
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      padding: '10px 20px', borderRadius: '10px', minWidth: '180px', textAlign: 'center',
      boxShadow: `0 10px 25px ${c1}44`, border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <span style={{ color: textColor || 'white', fontSize: '20px', fontWeight: 900, fontFamily: 'Oswald', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {name}
      </span>
    </div>
    <div style={{ fontSize: '180px', fontWeight: 900, fontFamily: 'Oswald', color: disabled ? '#1f2937' : 'white', lineHeight: 1 }}>{goles}</div>
    <div className="flex gap-4">
      <button onClick={onMenos} disabled={disabled || goles === 0} style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#ef444415', border: '1px solid #ef444444', color: '#ef4444', fontSize: '20px', fontWeight: 900, cursor: 'pointer' }}>−</button>
      <button onClick={onMas} disabled={disabled} style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#22c55e15', border: '1px solid #22c55e44', color: '#22c55e', fontSize: '20px', fontWeight: 900, cursor: 'pointer' }}>+</button>
    </div>
  </div>
);

const ColorTool = ({ label, v1, v2, vt, onChange }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={labelStyle}>{label}</label>
    <div className="flex gap-2 items-center">
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `linear-gradient(135deg, ${v1}, ${v2})`, border: '2px solid var(--dark-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: vt || 'white' }}>AB</div>
      <input type="color" title="Color primario" value={v1} onChange={e => onChange(e.target.value, v2, vt)} style={{ width: '28px', height: '28px', padding: 0, border: 'none', cursor: 'pointer', background:'transparent' }} />
      <input type="color" title="Color secundario" value={v2} onChange={e => onChange(v1, e.target.value, vt)} style={{ width: '28px', height: '28px', padding: 0, border: 'none', cursor: 'pointer', background:'transparent' }} />
      
      <div style={{ marginLeft: 'auto', display: 'flex', background: '#111', borderRadius: '6px', padding: '2px', border: '1px solid #333' }}>
        <button 
          onClick={() => onChange(v1, v2, 'white')}
          style={{ width: '24px', height: '24px', borderRadius: '4px', background: vt === 'white' ? '#fff' : 'transparent', color: vt === 'white' ? '#000' : '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900 }}
        >W</button>
        <button 
          onClick={() => onChange(v1, v2, 'black')}
          style={{ width: '24px', height: '24px', borderRadius: '4px', background: vt === 'black' ? '#fff' : 'transparent', color: vt === 'black' ? '#000' : '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900 }}
        >B</button>
      </div>
    </div>
  </div>
);

const sectionTitleStyle = { fontFamily: 'Oswald', fontSize: '13px', letterSpacing: '2px', color: '#8b949e', marginBottom: '14px', textTransform: 'uppercase' as any };
const labelStyle = { display: 'block', fontSize: '10px', letterSpacing: '1.5px', color: '#4b5563', fontFamily: 'Oswald', marginBottom: '6px', fontWeight: 700 };
