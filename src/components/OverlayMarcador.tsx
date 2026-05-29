import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';


export const OverlayMarcador: React.FC = () => {
  const [partido, setPartido] = useState<Partido | null>(null);
  const [equipoL, setEquipoL] = useState<Equipo | null>(null);
  const [equipoV, setEquipoV] = useState<Equipo | null>(null);
  const [reloj, setReloj] = useState('00:00');
  const [periodo, setPeriodo] = useState('PRIMER TIEMPO');

  const [animL, setAnimL] = useState(false);
  const [animV, setAnimV] = useState(false);


  
  // Refs para cálculos
  const equiposRef = React.useRef<Equipo[]>([]);
  const partidosRef = React.useRef<Partido[]>([]);

  const fetchActiveMatch = async (specificId?: string) => {
    let query = supabase
      .from('partidos')
      .select('*');
    
    if (specificId) {
      query = query.eq('id_partido', specificId);
    } else {
      query = query
        .not('id_local', 'is', null)
        .not('id_visitante', 'is', null)
        .order('updated_at', { ascending: false });
    }

    const { data: pts, error } = await query.limit(1);

    if (error) {
      console.error("Error fetching match:", error);
      return;
    }

    if (!pts || pts.length === 0) {
      console.warn("No active match found");
      return;
    }
    
    const p = pts[0];
    const partidoData: Partido = {
      id_partido: p.id_partido,
      zona: p.zona,
      fecha_numero: p.fecha_numero,
      fecha_calendario: p.fecha_calendario,
      turno_horario: p.turno_horario,
      id_local: p.id_local,
      id_visitante: p.id_visitante,
      id_libre: p.id_libre,
      goles_local: p.goles_local ?? 0,
      goles_visitante: p.goles_visitante ?? 0,
      estado: p.estado,
      es_libre: p.es_libre,
    };
    
    setPartido(partidoData);
    
    const { data: eqs, error: errEqs } = await supabase.from('equipos').select('*');
    if (errEqs) console.error("Error fetching teams:", errEqs);

    if (eqs) {
      equiposRef.current = eqs as Equipo[];
      setEquipoL(eqs.find(e => e.id === p.id_local) as Equipo);
      setEquipoV(eqs.find(e => e.id === p.id_visitante) as Equipo);
    }

    const { data: allPts } = await supabase.from('partidos').select('*');
    if (allPts) partidosRef.current = allPts as Partido[];
  };

  useEffect(() => {
    fetchActiveMatch();

    const channel = supabase
      .channel('broadcast-scoreboard')
      .on(
        'postgres_changes' as any, 
        { event: 'UPDATE', schema: 'public', table: 'partidos' }, 
        () => fetchActiveMatch()
      )
      .on(
        'postgres_changes' as any, 
        { event: 'UPDATE', schema: 'public', table: 'equipos' }, 
        () => fetchActiveMatch()
      )
      .on('broadcast', { event: 'cambio-partido' }, (payload) => {
        if (payload.payload?.id_partido) {
          fetchActiveMatch(payload.payload.id_partido);
        } else {
          fetchActiveMatch();
        }
      })
      .on('broadcast', { event: 'reloj' }, (payload) => {
        setReloj(payload.payload.reloj);
      })
      .on('broadcast', { event: 'periodo' }, (payload) => {
        setPeriodo(payload.payload.periodo);
      })
      .on('broadcast', { event: 'goles' }, (payload) => {
        const { id_partido, goles_local, goles_visitante } = payload.payload;

        setPartido(prev => {
          if (!prev) return null;
          
          let idGoleador = '';
          let idRecibio = '';

          if ((goles_local ?? 0) > (prev.goles_local ?? 0)) {
            setAnimL(true);
            setTimeout(() => setAnimL(false), 1500);
            idGoleador = prev.id_local || '';
            idRecibio = prev.id_visitante || '';
          }
          if ((goles_visitante ?? 0) > (prev.goles_visitante ?? 0)) {
            setAnimV(true);
            setTimeout(() => setAnimV(false), 1500);
            idGoleador = prev.id_visitante || '';
            idRecibio = prev.id_local || '';
          }

          // Actualizar datos para seguimiento de goles
          if (idGoleador && idRecibio) {
            const ptsAfter = partidosRef.current.map(p => 
              p.id_partido === id_partido ? { ...p, goles_local, goles_visitante } : p
            );
            partidosRef.current = ptsAfter;
          }

          return { 
            ...prev, 
            goles_local, 
            goles_visitante 
          };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!partido || !equipoL || !equipoV) {
    return (
      <div style={{ 
        width: '100vw', height: '100vh', background: 'black', color: 'white', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontFamily: 'Inter, sans-serif', fontSize: '24px', letterSpacing: '2px'
      }}>
        CARGANDO MARCADOR...
      </div>
    );
  }

  return (
    <div className="overlay-container" style={{
      width: '100vw', height: '100vh', 
      background: 'transparent',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '40px', fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`
        @keyframes splash-gol {
          0% { transform: scale(1); background: #000; color: #fff; }
          15% { transform: scale(1.6); background: #f5a623; color: #000; box-shadow: 0 0 50px #f5a623; }
          30% { transform: scale(1.3); background: #f5a623; color: #000; }
          45% { transform: scale(1.4); background: #f5a623; color: #000; }
          100% { transform: scale(1); background: #000; color: #fff; }
        }
        .anim-gol {
          animation: splash-gol 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          position: relative;
          z-index: 50;
        }
      `}</style>

      <div className="scoreboard-bar" style={{
        display: 'flex', alignItems: 'stretch', background: '#000', color: '#fff',
        borderRadius: '4px', overflow: 'visible', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)', height: '60px'
      }}>
        {/* ZONA / COPA */}
        <div style={{
          background: partido.fecha_numero >= 6 ? (partido.zona === 'A' ? '#d4af37' : '#a0a0a0') : '#000', padding: '0 15px', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', 
          borderRight: '1px solid rgba(255,255,255,0.1)', color: partido.fecha_numero >= 6 && partido.zona === 'A' ? '#000' : (partido.fecha_numero >= 6 ? '#fff' : '#f5a623'), minWidth: '80px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, textShadow: partido.fecha_numero >= 6 && partido.zona === 'A' ? '2px 2px 4px rgba(255,255,255,1)' : '2px 2px 4px rgba(0,0,0,1)' }}>{partido.fecha_numero >= 6 ? 'COPA' : 'ZONA'}</span>
          <span style={{ fontSize: partido.fecha_numero >= 6 ? '20px' : '32px', fontWeight: 900, lineHeight: 0.9, textShadow: partido.fecha_numero >= 6 && partido.zona === 'A' ? '2px 2px 4px rgba(255,255,255,1)' : '2px 2px 4px rgba(0,0,0,1)' }}>{partido.fecha_numero >= 6 ? (partido.zona === 'A' ? 'ORO' : 'PLATA') : partido.zona}</span>
        </div>

        <div style={{
          background: equipoL.color || '#222',
          padding: '0 25px', display: 'flex', alignItems: 'center',
          minWidth: '180px', justifyContent: 'center',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
          color: equipoL.color_texto ?? 'white',
          borderBottom: `6px solid ${equipoL.color_secundario || 'transparent'}`
        }}>
          <span style={{ fontSize: '26px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Impact, sans-serif', textShadow: (equipoL?.color_texto === 'black' || equipoL?.color_texto === '#000000') ? '2px 2px 4px rgba(255,255,255,1)' : '2px 2px 4px rgba(0,0,0,1)' }}>
            {equipoL.nombre}
          </span>
        </div>

        <div className={animL ? 'anim-gol' : ''} style={{
          background: '#000', padding: '0 25px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', fontSize: '38px', fontWeight: 900, minWidth: '70px',
          borderRight: '2px solid rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease'
        }}>
          {partido.goles_local}
        </div>

        <div style={{ background: '#fff', width: '2px', zIndex: 5 }} />

        <div className={animV ? 'anim-gol' : ''} style={{
          background: '#000', padding: '0 25px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', fontSize: '38px', fontWeight: 900, minWidth: '70px',
          borderLeft: '2px solid rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease'
        }}>
          {partido.goles_visitante}
        </div>

        <div style={{
          background: equipoV.color || '#222',
          padding: '0 25px', display: 'flex', alignItems: 'center',
          minWidth: '180px', justifyContent: 'center',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
          color: equipoV.color_texto ?? 'white',
          borderBottom: `6px solid ${equipoV.color_secundario || 'transparent'}`
        }}>
          <span style={{ fontSize: '26px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Impact, sans-serif', textShadow: (equipoV?.color_texto === 'black' || equipoV?.color_texto === '#000000') ? '2px 2px 4px rgba(255,255,255,1)' : '2px 2px 4px rgba(0,0,0,1)' }}>
            {equipoV.nombre}
          </span>
        </div>

        <div style={{
          background: '#000', color: '#f5a623', padding: '0 20px', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '120px',
          borderLeft: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1.1 }}>{reloj}</div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{periodo}</div>
        </div>
      </div>


    </div>
  );
};
