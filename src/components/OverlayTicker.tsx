import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';

export const OverlayTicker: React.FC = () => {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloj, setReloj] = useState('00:00');
  const [periodo, setPeriodo] = useState('PRIMER TIEMPO');
  
  // Track previous scores for animations
  const prevScores = useRef<Record<string, { l: number, v: number }>>({});
  const [animatingMatches, setAnimatingMatches] = useState<Record<string, { l: boolean, v: boolean }>>({});

  const fetchData = async () => {
    const [ { data: pts }, { data: eqs } ] = await Promise.all([
      supabase.from('partidos').select('*').eq('es_libre', false).order('fecha_numero', { ascending: true }).order('turno_horario', { ascending: true }),
      supabase.from('equipos').select('*')
    ]);

    if (pts) {
      // Determinar la última fecha con actividad (jugada)
      const fechasJugadas = pts.filter((p: any) => p.estado === 'jugado').map((p: any) => p.fecha_numero);
      const ultimaFecha = fechasJugadas.length > 0 ? Math.max(...fechasJugadas) : 1;
      
      const partidosFiltrados = pts.filter((p: any) => p.fecha_numero === ultimaFecha);

      // Check for score changes to trigger animations
      const newAnims = { ...animatingMatches };
      let changed = false;

      partidosFiltrados.forEach((p: any) => {
        const id = p.id_partido;
        const currentL = p.goles_local ?? 0;
        const currentV = p.goles_visitante ?? 0;
        const prev = prevScores.current[id];

        if (prev) {
          if (currentL > prev.l) {
            newAnims[id] = { ...newAnims[id], l: true };
            changed = true;
            setTimeout(() => setAnimatingMatches(current => ({ ...current, [id]: { ...current[id], l: false } })), 1500);
          }
          if (currentV > prev.v) {
            newAnims[id] = { ...newAnims[id], v: true };
            changed = true;
            setTimeout(() => setAnimatingMatches(current => ({ ...current, [id]: { ...current[id], v: false } })), 1500);
          }
        }
        prevScores.current[id] = { l: currentL, v: currentV };
      });

      if (changed) setAnimatingMatches(newAnims);
      setPartidos(partidosFiltrados);
    }
    if (eqs) setEquipos(eqs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('ticker-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => fetchData())
      .on('broadcast', { event: 'reloj' }, (payload) => setReloj(payload.payload.reloj))
      .on('broadcast', { event: 'periodo' }, (payload) => setPeriodo(payload.payload.periodo))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return null;

  // Obtener el número de fecha que estamos mostrando (del primer partido de la lista)
  const nroFecha = partidos.length > 0 ? partidos[0].fecha_numero : '?';

  return (
    <div className="ticker-overlay" style={{
      width: '100vw',
      minHeight: '100vh',
      background: 'transparent',
      padding: '40px 20px',
      fontFamily: 'Oswald, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
    }}>
      <style>{`
        @keyframes splash-gol {
          0% { transform: scale(1); background: #000; color: #fff; }
          15% { transform: scale(1.4); background: #f5a623; color: #000; box-shadow: 0 0 30px #f5a623; }
          30% { transform: scale(1.2); background: #f5a623; color: #000; }
          100% { transform: scale(1); background: #000; color: #fff; }
        }
        .anim-gol {
          animation: splash-gol 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          position: relative;
          z-index: 50;
        }
        
        .scoreboard-bar {
          display: flex;
          align-items: stretch;
          background: #000;
          color: #fff;
          border-radius: 4px;
          overflow: visible;
          box-shadow: 0 8px 20px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          border-left: 5px solid #f5a623;
          height: 50px;
          transition: all 0.3s ease;
          width: fit-content;
        }

        .zona-box {
          background: #000; 
          padding: 0 13.8px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          border-right: 1px solid rgba(255,255,255,0.1); 
          color: #f5a623;
        }

        .team-box {
          padding: 0 20px; 
          display: flex; 
          align-items: center;
          width: 220px; 
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
          font-size: 28px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .score-box {
          background: #000; 
          padding: 0 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 45px; 
          font-weight: 900; 
          width: 80px;
          transition: all 0.3s ease;
        }
        
        .divider {
          background: #fff; 
          width: 2px; 
          z-index: 5;
        }
        
        .clock-box {
          background: #000; 
          color: #f5a623; 
          padding: 0 15px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          min-width: 90px;
          border-left: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>

      {/* Título de la Fecha */}
      <div style={{ 
        background: 'rgba(0,0,0,0.8)', 
        color: '#f5a623', 
        padding: '5px 20px', 
        borderRadius: '4px', 
        fontSize: '20px', 
        fontWeight: 900, 
        letterSpacing: '2px',
        marginBottom: '10px',
        border: '1px solid #f5a623'
      }}>
        RESULTADOS - FECHA {nroFecha}
      </div>

      {partidos.map((p) => {
        const eqL = equipos.find(e => e.id === p.id_local);
        const eqV = equipos.find(e => e.id === p.id_visitante);
        if (!eqL || !eqV) return null;

        const animL = animatingMatches[p.id_partido]?.l;
        const animV = animatingMatches[p.id_partido]?.v;

        return (
          <div key={p.id_partido} className="scoreboard-bar">
            {/* ZONA */}
            <div className="zona-box">
              <span style={{ fontSize: '10.35px', fontWeight: 800, opacity: 0.7 }}>ZONA</span>
              <span style={{ fontSize: '27.6px', fontWeight: 900, lineHeight: 0.9 }}>{p.zona}</span>
            </div>

            {/* EQUIPO L */}
            <div className="team-box" style={{
              background: eqL.color_secundario 
                ? `linear-gradient(135deg, ${eqL.color}, ${eqL.color_secundario})`
                : eqL.color ?? '#222',
              justifyContent: 'flex-end',
              color: eqL.color_texto ?? 'white',
              borderBottom: `4px solid ${eqL.color || 'transparent'}`
            }}>
              {eqL.nombre}
            </div>

            {/* SCORE L */}
            <div className={`score-box ${animL ? 'anim-gol' : ''}`} style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              {p.goles_local ?? 0}
            </div>

            <div className="divider" />

            {/* SCORE V */}
            <div className={`score-box ${animV ? 'anim-gol' : ''}`} style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              {p.goles_visitante ?? 0}
            </div>

            {/* EQUIPO V */}
            <div className="team-box" style={{
              background: eqV.color_secundario 
                ? `linear-gradient(135deg, ${eqV.color}, ${eqV.color_secundario})`
                : eqV.color ?? '#222',
              justifyContent: 'flex-start',
              color: eqV.color_texto ?? 'white',
              borderBottom: `4px solid ${eqV.color || 'transparent'}`
            }}>
              {eqV.nombre}
            </div>

            {/* RELOJ / INFO */}
            <div className="clock-box" style={{ opacity: p.estado === 'jugado' ? 0.6 : 1 }}>
              <div style={{ fontSize: '20.7px', fontWeight: 900, lineHeight: 1 }}>
                {p.estado === 'jugado' ? 'FIN' : p.turno_horario || '00:00'}
              </div>
              <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {p.estado === 'jugado' ? 'FINALIZADO' : `FECHA ${p.fecha_numero}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
