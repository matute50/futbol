import React, { useState, useMemo } from 'react';
import type { Equipo, Partido, Zona } from '../types';

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

  const getEquipoById = (id: string | null) => id ? equipos.find(e => e.id === id) : null;
  const fixtureGenerado = partidos.length > 0;

  const listaFechas = useMemo(() => 
    Array.from(new Set(partidos.map(p => p.fecha_numero))).sort((a,b) => a-b)
  , [partidos]);
  
  const partidosHoy = useMemo(() => 
    partidos
      .filter(p => p.fecha_numero === fechaActiva && !p.es_libre)
      .sort((a,b) => {
         const hOrder = ["09.00", "10.30", "12.00", "13.30", "15.00", "16.30"];
         return hOrder.indexOf(a.turno_horario || "") - hOrder.indexOf(b.turno_horario || "");
      })
  , [partidos, fechaActiva]);
    
  const libresHoyCalculados = useMemo(() => {
    return ['A', 'B', 'C'].map(z => {
      const eqsZona = equipos.filter(e => e.zona === z);
      if (eqsZona.length < 5) return { zona: z, equipo: null };
      const idsJugando = new Set<string>();
      partidosHoy.filter(p => p.zona === z).forEach(p => {
        if (p.id_local) idsJugando.add(pf => pf.id_local); // Fix: use local id
      });
      // Actually simpler:
      const idsHoy = new Set<string>();
      partidosHoy.forEach(ph => {
        if (ph.id_local) idsHoy.add(ph.id_local);
        if (ph.id_visitante) idsHoy.add(ph.id_visitante);
      });
      const eqLibre = eqsZona.find(e => !idsHoy.has(e.id));
      return { zona: z as Zona, equipo: eqLibre || null };
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

            <div className="flex-1 overflow-hidden">
              <table className="w-full h-full text-left" style={{ tableLayout: 'fixed' }}>
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
                    const badgeClass = ZONA_STYLES[p.zona];
                    const esJugado = p.estado === 'jugado';

                    return (
                      <tr key={p.id_partido} className="hover:bg-white/2">
                        <td className="px-6 py-2 text-center">
                           <span className="text-xl font-black text-gold italic" style={{ fontFamily: 'Oswald' }}>{p.turno_horario}</span>
                        </td>
                        <td className="px-6 py-2">
                           <div className="flex justify-center">
                             <div className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase text-center ${badgeClass}`} style={{ minWidth: '80px' }}>
                               ZONA {p.zona}
                             </div>
                           </div>
                        </td>
                        <td className="px-6 py-2 text-xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald' }}>
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-6 rounded-full" style={{ background: local?.color || '#374151' }} />
                              {local?.nombre.toUpperCase() || '—'}
                           </div>
                        </td>
                        <td className="px-6 py-2 text-xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald' }}>
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-6 rounded-full" style={{ background: visitante?.color || '#374151' }} />
                              {visitante?.nombre.toUpperCase() || '—'}
                           </div>
                        </td>
                        <td className="px-6 py-2 text-center text-xl font-black italic uppercase" style={{ fontFamily: 'Oswald' }}>
                           {esJugado ? (
                               <span className="text-green-400">{p.goles_local} — {p.goles_visitante}</span>
                           ) : (
                             <span className="text-yellow-500/60 text-lg">PENDIENTE</span>
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
                <div className="flex justify-center items-center gap-12">
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-4">DESCANSAN:</span>
                    {libresHoyCalculados.map(l => {
                      const badgeClass = ZONA_STYLES[l.zona];
                      return (
                        <div key={l.zona} className="flex items-center gap-3">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black ${badgeClass}`}>ZONA {l.zona}</span>
                           <span className="text-lg font-black tracking-tight uppercase text-gold" style={{ fontFamily: 'Oswald' }}>
                              {l.equipo ? l.equipo.nombre.toUpperCase() : '...'}
                           </span>
                        </div>
                      );
                    })}
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
