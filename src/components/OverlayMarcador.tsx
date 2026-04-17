import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';

export const OverlayMarcador: React.FC = () => {
  const [partido, setPartido] = useState<Partido | null>(null);
  const [equipoL, setEquipoL] = useState<Equipo | null>(null);
  const [equipoV, setEquipoV] = useState<Equipo | null>(null);
  const [reloj, setReloj] = useState('00:00');
  const [periodo, setPeriodo] = useState('PRIMER TIEMPO');

  const fetchActiveMatch = async () => {
    const { data: pts, error } = await supabase
      .from('partidos')
      .select('*')
      .not('id_local', 'is', null)
      .not('id_visitante', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !pts || pts.length === 0) return;
    
    const p = pts[0] as any;
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
    
    const { data: eqs } = await supabase.from('equipos').select('*').in('id', [p.id_local, p.id_visitante]);
    if (eqs) {
      setEquipoL(eqs.find(e => e.id === p.id_local) as Equipo);
      setEquipoV(eqs.find(e => e.id === p.id_visitante) as Equipo);
    }
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
      .on('broadcast', { event: 'reloj' }, (payload) => {
        setReloj(payload.payload.reloj);
      })
      .on('broadcast', { event: 'periodo' }, (payload) => {
        setPeriodo(payload.payload.periodo);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!partido || !equipoL || !equipoV) {
    return <div style={{ color: 'white', padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}>CARGANDO MARCADOR...</div>;
  }

  return (
    <div className="overlay-container" style={{
      width: '100vw', height: '100vh', 
      background: 'transparent',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '40px', fontFamily: 'Oswald, sans-serif'
    }}>
      <div className="scoreboard-bar" style={{
        display: 'flex', alignItems: 'stretch', background: '#000', color: '#fff',
        borderRadius: '4px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)', height: '60px'
      }}>
        <div style={{
          background: '#000', padding: '0 15px', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', 
          borderRight: '1px solid rgba(255,255,255,0.1)', color: '#f5a623'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>ZONA</span>
          <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 0.9 }}>{partido.zona}</span>
        </div>

        <div style={{
          background: equipoL.color_secundario 
            ? `linear-gradient(135deg, ${equipoL.color}, ${equipoL.color_secundario})`
            : equipoL.color ?? '#222',
          padding: '0 25px', display: 'flex', alignItems: 'center',
          minWidth: '180px', justifyContent: 'flex-end', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
          color: equipoL.color_texto ?? 'white',
          borderBottom: `6px solid ${equipoL.color || 'transparent'}`
        }}>
          <span style={{ fontSize: '26px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {equipoL.nombre}
          </span>
        </div>

        <div style={{
          background: '#000', padding: '0 25px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', fontSize: '38px', fontWeight: 900, minWidth: '70px',
          borderRight: '2px solid rgba(255,255,255,0.1)'
        }}>
          {partido.goles_local}
        </div>

        <div style={{ background: '#fff', width: '2px' }} />

        <div style={{
          background: '#000', padding: '0 25px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', fontSize: '38px', fontWeight: 900, minWidth: '70px',
          borderLeft: '2px solid rgba(255,255,255,0.1)'
        }}>
          {partido.goles_visitante}
        </div>

        <div style={{
          background: equipoV.color_secundario 
            ? `linear-gradient(135deg, ${equipoV.color}, ${equipoV.color_secundario})`
            : equipoV.color ?? '#222',
          padding: '0 25px', display: 'flex', alignItems: 'center',
          minWidth: '180px', justifyContent: 'flex-start', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
          color: equipoV.color_texto ?? 'white',
          borderBottom: `6px solid ${equipoV.color || 'transparent'}`
        }}>
          <span style={{ fontSize: '26px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
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
