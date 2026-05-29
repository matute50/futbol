import React, { useState, useMemo, useEffect } from 'react';
import type { Equipo, Partido, Zona } from '../types';
import { calcularProyeccionGeneral } from '../lib/tablaGeneral';

interface Props {
  equipos: Equipo[];
  partidos: Partido[];
  onPartidosChange: (partidos: Partido[]) => void;
}

const ZONA_STYLES: Record<Zona, string> = {
  A: 'zone-badge-a',
  B: 'zone-badge-b',
  C: 'zone-badge-c',
};

export const TabCronograma: React.FC<Props> = ({ equipos, partidos }) => {
  const [fechaActiva, setFechaActiva] = useState<number>(1);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const getEquipoById = (id: string | null) => id ? equipos.find(e => e.id === id) : null;
  const fixtureGenerado = partidos.length > 0;

  const proyeccion = useMemo(() => calcularProyeccionGeneral(equipos, partidos), [equipos, partidos]);
  const semifinalista = useMemo(() => {
    return equipos.find(e => e.id === proyeccion.find(p => p.posicion === 1)?.id);
  }, [equipos, proyeccion]);

  const listaFechas = useMemo(() => 
    Array.from(new Set(partidos.map(p => p.fecha_numero))).sort((a,b) => a-b)
  , [partidos]);

  // Auto-seleccionar fecha activa
  useEffect(() => {
    if (fixtureGenerado && !hasAutoSelected) {
      let found = listaFechas[0] || 1;
      for (const f of listaFechas) {
        const matches = partidos.filter(p => p.fecha_numero === f && !p.es_libre && p.id_local && p.id_visitante);
        if (matches.length > 0) {
          found = f;
          const pending = matches.some(m => m.estado === 'pendiente');
          if (pending) break;
        }
      }
      setFechaActiva(found);
      setHasAutoSelected(true);
    }
  }, [fixtureGenerado, listaFechas, partidos, hasAutoSelected]);
  
  const partidosHoy = useMemo(() => {
    const parseHorario = (h: string | null) => {
      if (!h) return 9999;
      const limpio = h.toLowerCase().replace(/hs/g, '').trim();
      const partes = limpio.split(/[\.:]/);
      const horas = parseInt(partes[0], 10);
      const minutos = partes[1] ? parseInt(partes[1], 10) : 0;
      return isNaN(horas) ? 9999 : horas * 60 + (isNaN(minutos) ? 0 : minutos);
    };

    return [...partidos]
      .filter(p => p.fecha_numero === fechaActiva && !p.es_libre)
      .sort((a, b) => parseHorario(a.turno_horario) - parseHorario(b.turno_horario));
  }, [partidos, fechaActiva]);
    
  const libresHoyCalculados = useMemo(() => {
    return (['A', 'B', 'C'] as Zona[]).map(z => {
      const eqsZona = equipos.filter(e => e.zona === z);
      if (eqsZona.length < 5) return { zona: z, equipo: null };
      
      const idsHoy = new Set<string>();
      partidosHoy.forEach(ph => {
        if (ph.id_local) idsHoy.add(ph.id_local);
        if (ph.id_visitante) idsHoy.add(ph.id_visitante);
      });
      const eqLibre = eqsZona.find(e => !idsHoy.has(e.id));
      return { zona: z, equipo: eqLibre || null };
    });
  }, [partidosHoy, equipos]);

  return (
    <div className="fade-in space-y-4" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      
      {!fixtureGenerado ? (
        <div className="glass-card p-12 text-center flex-1 flex flex-col justify-center">
          <div className="text-6xl mb-4 opacity-10">📅</div>
          <h2 className="text-2xl font-black uppercase text-gray-500">Sin cronograma</h2>
        </div>
      ) : (
        <>
          {/* Tabs Compactos */}
          <div className="flex gap-4 items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
            <div className="flex gap-2">
              {listaFechas.map(fn => (
                <button
                  key={fn}
                  onClick={() => setFechaActiva(fn)}
                  className={`px-6 py-2 rounded-lg text-lg font-black transition-all flex flex-col items-center min-w-[100px] ${
                    fechaActiva === fn ? 'tab-active' : 'tab-inactive bg-white/5'
                  }`}
                  style={{ fontFamily: 'Oswald, sans-serif' }}
                >
                  <span className="text-[8px] opacity-60 tracking-widest font-black">FECHA 0{fn}</span>
                </button>
              ))}
            </div>
            <div className="px-4 text-right">
                <div className="text-sm font-black text-white italic" style={{ fontFamily: 'Oswald' }}>FICHA DE TRANSMISIÓN</div>
            </div>
          </div>

          {/* Ficha Principal (Ajustada para No Scroll) */}
          <div className="glass-card flex-1 overflow-hidden shadow-2xl border border-white/5 flex flex-col" style={{ background: 'rgba(13,17,23,0.6)', borderRadius: '16px' }}>
            <div className="px-8 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ fontFamily: 'Oswald' }}>
                   FECHA {fechaActiva} · CRONOGRAMA OFICIAL
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center w-[120px]">HORARIO</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center w-[130px]">ZONA</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">EQUIPO LOCAL</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">EQUIPO VISITANTE</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center w-[200px]">RESULTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {partidosHoy.map((p) => {
                    const local = getEquipoById(p.id_local);
                    const visitante = getEquipoById(p.id_visitante);
                    const esJugado = p.estado === 'jugado';

                    const isFechaPlayoffs = fechaActiva === 6;
                    const badgeClass = isFechaPlayoffs
                      ? (p.zona === 'A' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30')
                      : ZONA_STYLES[p.zona] || 'bg-gray-800 text-gray-500';
                    const labelZona = isFechaPlayoffs
                      ? `COPA ${p.zona === 'A' ? 'ORO' : 'PLATA'}`
                      : `ZONA ${p.zona}`;

                    return (
                      <tr key={p.id_partido} className="hover:bg-white/2" style={{ borderLeft: '4px solid var(--gold)' }}>
                        <td className="px-6 text-center" style={{ paddingTop: isFechaPlayoffs ? '4px' : '8px', paddingBottom: isFechaPlayoffs ? '4px' : '8px' }}>
                           <span className="font-black text-gold italic" style={{ fontFamily: 'Oswald', fontSize: isFechaPlayoffs ? '18px' : '23px' }}>{p.turno_horario}</span>
                        </td>
                        <td className="px-6" style={{ paddingTop: isFechaPlayoffs ? '4px' : '8px', paddingBottom: isFechaPlayoffs ? '4px' : '8px' }}>
                           <div className="flex justify-center">
                             <div className={`px-3 py-1 rounded-lg font-black tracking-widest uppercase text-center ${badgeClass}`} style={{ minWidth: isFechaPlayoffs ? '82px' : '92px', fontSize: isFechaPlayoffs ? '9.5px' : '11.5px' }}>
                                {labelZona}
                             </div>
                           </div>
                        </td>
                        <td className="px-6 font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald', fontSize: isFechaPlayoffs ? '20px' : '28px', paddingTop: isFechaPlayoffs ? '4px' : '8px', paddingBottom: isFechaPlayoffs ? '4px' : '8px' }}>
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-6 rounded-full" style={{ background: local?.color || '#374151' }} />
                              {local?.nombre.toUpperCase() || '—'}
                           </div>
                        </td>
                        <td className="px-6 font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald', fontSize: isFechaPlayoffs ? '20px' : '28px', paddingTop: isFechaPlayoffs ? '4px' : '8px', paddingBottom: isFechaPlayoffs ? '4px' : '8px' }}>
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-6 rounded-full" style={{ background: visitante?.color || '#374151' }} />
                              {visitante?.nombre.toUpperCase() || '—'}
                           </div>
                        </td>
                        <td className="px-6 text-center font-black italic uppercase" style={{ fontFamily: 'Oswald', fontSize: isFechaPlayoffs ? '20px' : '28px', paddingTop: isFechaPlayoffs ? '4px' : '8px', paddingBottom: isFechaPlayoffs ? '4px' : '8px' }}>
                           {esJugado ? (
                               <span className="text-green-400">{p.goles_local} — {p.goles_visitante}</span>
                           ) : (
                             <span className="text-yellow-500/60" style={{ fontSize: isFechaPlayoffs ? '18px' : '24px' }}>PENDIENTE</span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Libres Compactos */}
            <div className="px-8 py-3 border-t border-white/5 bg-black/20">
              {fechaActiva === 6 ? (
                <div className="flex justify-center items-center gap-6">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-4">PASE DIRECTO A SEMIFINALES - COPA DE ORO:</span>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[8px] font-black bg-yellow-500 text-black">#1 GENERAL</span>
                    <span className="font-black tracking-tight uppercase text-gold" style={{ fontFamily: 'Oswald', fontSize: '20.7px' }}>
                      {semifinalista ? semifinalista.nombre.toUpperCase() : 'NO DETERMINADO'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center gap-12">
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-4">DESCANSAN:</span>
                    {libresHoyCalculados.map(l => {
                      const badgeClass = ZONA_STYLES[l.zona];
                      return (
                        <div key={l.zona} className="flex items-center gap-3">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black ${badgeClass}`}>ZONA {l.zona}</span>
                           <span className="font-black tracking-tight uppercase text-gold" style={{ fontFamily: 'Oswald', fontSize: '20.7px' }}>
                              {l.equipo ? l.equipo.nombre.toUpperCase() : '...'}
                           </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
