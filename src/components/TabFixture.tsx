import React, { useState, useEffect, useMemo } from 'react';
import type { Equipo, Partido, Zona } from '../types';
import { HORARIOS_DISPONIBLES } from '../fixture';
import { calcularProyeccionGeneral } from '../lib/tablaGeneral';
import { supabase } from '../supabase';

interface Props {
  equipos: Equipo[];
  partidos: Partido[];
  onPartidosChange: (partidos: Partido[]) => void;
}

const FECHAS_NUM = [1, 2, 3, 4, 5];
const ZONAS: Zona[] = ['A', 'B', 'C'];

export const TabFixture: React.FC<Props> = ({ equipos, partidos, onPartidosChange }) => {
  const [localFixture, setLocalFixture] = useState<Partido[]>([]);

  // Lógica para Cuartos de Final
  const proyeccion = useMemo(() => calcularProyeccionGeneral(equipos, partidos), [equipos, partidos]);
  const partidosCuartosExistentes = useMemo(() => partidos.filter(p => p.fecha_numero === 6), [partidos]);
  const tieneCuartosGuardados = partidosCuartosExistentes.length > 0;

  const partidosParaUI = useMemo(() => {
    if (tieneCuartosGuardados) {
      const parseHorario = (h: string | null) => {
        if (!h) return 9999;
        const limpio = h.toLowerCase().replace(/hs/g, '').trim();
        const partes = limpio.split(/[\.:]/);
        const horas = parseInt(partes[0], 10);
        const minutos = partes[1] ? parseInt(partes[1], 10) : 0;
        return isNaN(horas) ? 9999 : horas * 60 + (isNaN(minutos) ? 0 : minutos);
      };

      return [...partidosCuartosExistentes]
        .sort((a, b) => parseHorario(a.turno_horario) - parseHorario(b.turno_horario))
        .map(p => {
          const localEq = equipos.find(e => e.id === p.id_local);
          const visitEq = equipos.find(e => e.id === p.id_visitante);
          const copa = p.zona === 'A' ? 'Oro' : 'Plata';
          const posLocal = proyeccion.find(e => e.id === p.id_local)?.posicion || 0;
          const posVisitante = proyeccion.find(e => e.id === p.id_visitante)?.posicion || 0;
          return {
            id_partido: p.id_partido,
            horario: p.turno_horario,
            copa,
            local: localEq,
            visitante: visitEq,
            posLocal,
            posVisitante,
            estado: p.estado,
            goles_local: p.goles_local,
            goles_visitante: p.goles_visitante
          };
        });
    } else {
      return [
        {
          id_partido: 'Q-PLATA-M3', horario: '09.00', copa: 'Plata' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 9)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 14)?.id),
          posLocal: 9, posVisitante: 14,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        },
        {
          id_partido: 'Q-ORO-M3', horario: '10.10', copa: 'Oro' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 2)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 7)?.id),
          posLocal: 2, posVisitante: 7,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        },
        {
          id_partido: 'Q-PLATA-M1', horario: '11.20', copa: 'Plata' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 11)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 12)?.id),
          posLocal: 11, posVisitante: 12,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        },
        {
          id_partido: 'Q-ORO-M1', horario: '12.30', copa: 'Oro' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 4)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 5)?.id),
          posLocal: 4, posVisitante: 5,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        },
        {
          id_partido: 'Q-PLATA-M4', horario: '13.40', copa: 'Plata' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 8)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 15)?.id),
          posLocal: 8, posVisitante: 15,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        },
        {
          id_partido: 'Q-ORO-M2', horario: '14.50', copa: 'Oro' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 3)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 6)?.id),
          posLocal: 3, posVisitante: 6,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        },
        {
          id_partido: 'Q-PLATA-M2', horario: '16.00', copa: 'Plata' as const,
          local: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 10)?.id),
          visitante: equipos.find(e => e.id === proyeccion.find(p => p.posicion === 13)?.id),
          posLocal: 10, posVisitante: 13,
          estado: 'pendiente' as const, goles_local: null, goles_visitante: null
        }
      ];
    }
  }, [tieneCuartosGuardados, partidosCuartosExistentes, equipos, proyeccion]);

  const semifinalista = useMemo(() => {
    return equipos.find(e => e.id === proyeccion.find(p => p.posicion === 1)?.id);
  }, [equipos, proyeccion]);

  const handlePersistirCuartos = async () => {
    if (!confirm('¿Está seguro de generar y persistir el fixture de cuartos de final? Esto congelará los cruces basados en la tabla de posiciones actual.')) return;
    
    try {
      const nuevosPartidosCuartos: Partido[] = [
        {
          id_partido: 'Q-PLATA-M3', zona: 'B', fecha_numero: 6, fecha_calendario: null, turno_horario: '09.00',
          id_local: proyeccion.find(e => e.posicion === 9)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 14)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        },
        {
          id_partido: 'Q-ORO-M3', zona: 'A', fecha_numero: 6, fecha_calendario: null, turno_horario: '10.10',
          id_local: proyeccion.find(e => e.posicion === 2)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 7)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        },
        {
          id_partido: 'Q-PLATA-M1', zona: 'B', fecha_numero: 6, fecha_calendario: null, turno_horario: '11.20',
          id_local: proyeccion.find(e => e.posicion === 11)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 12)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        },
        {
          id_partido: 'Q-ORO-M1', zona: 'A', fecha_numero: 6, fecha_calendario: null, turno_horario: '12.30',
          id_local: proyeccion.find(e => e.posicion === 4)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 5)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        },
        {
          id_partido: 'Q-PLATA-M4', zona: 'B', fecha_numero: 6, fecha_calendario: null, turno_horario: '13.40',
          id_local: proyeccion.find(e => e.posicion === 8)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 15)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        },
        {
          id_partido: 'Q-ORO-M2', zona: 'A', fecha_numero: 6, fecha_calendario: null, turno_horario: '14.50',
          id_local: proyeccion.find(e => e.posicion === 3)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 6)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        },
        {
          id_partido: 'Q-PLATA-M2', zona: 'B', fecha_numero: 6, fecha_calendario: null, turno_horario: '16.00',
          id_local: proyeccion.find(e => e.posicion === 10)?.id || null,
          id_visitante: proyeccion.find(e => e.posicion === 13)?.id || null,
          id_libre: null, goles_local: null, goles_visitante: null, estado: 'pendiente', es_libre: false
        }
      ];

      const { error } = await supabase.from('partidos').insert(nuevosPartidosCuartos);
      if (error) throw error;
      alert('¡Fixture de Cuartos de Final generado con éxito y guardado en Supabase!');
    } catch (e: any) {
      console.error(e);
      alert(`Error al guardar en Supabase: ${e.message}`);
    }
  };

  const handleLimpiarCuartos = async () => {
    if (!confirm('¿Está seguro de ELIMINAR el fixture de cuartos de final de la base de datos? Esto borrará los partidos cargados para la fecha 6.')) return;
    try {
      const { error } = await supabase.from('partidos').delete().eq('fecha_numero', 6);
      if (error) throw error;
      alert('Fixture de Cuartos de Final eliminado correctamente.');
    } catch (e: any) {
      console.error(e);
      alert(`Error al limpiar: ${e.message}`);
    }
  };

  const crearTemplateVacio = () => {
    const initial: Partido[] = [];
    FECHAS_NUM.forEach(f => {
      HORARIOS_DISPONIBLES.forEach((h, idx) => {
        initial.push({
          id_partido: `F${f}-H${idx}`, zona: 'A', fecha_numero: f, fecha_calendario: null, turno_horario: h,
          id_local: null, id_visitante: null, id_libre: null, goles_local: null, goles_visitante: null,
          estado: 'pendiente', es_libre: false,
        });
      });
      ZONAS.forEach(z => {
        initial.push({
          id_partido: `F${f}-Z${z}-LIBRE`, zona: z, fecha_numero: f, fecha_calendario: null, turno_horario: null,
          id_local: null, id_visitante: null, id_libre: null, goles_local: null, goles_visitante: null,
          estado: 'pendiente', es_libre: true,
        });
      });
    });
    return initial;
  };

  useEffect(() => {
    if (partidos.length > 0) {
      const corregidos = partidos.map(p => {
        if (p.es_libre || p.turno_horario) return p;
        const idx = parseInt(p.id_partido.split('-H')[1]);
        if (!isNaN(idx) && HORARIOS_DISPONIBLES[idx]) return { ...p, turno_horario: HORARIOS_DISPONIBLES[idx] };
        return p;
      });
      setLocalFixture(corregidos);
    } else {
      setLocalFixture(crearTemplateVacio());
    }
  }, [partidos]);

  // LÓGICA DE DEDUCCIÓN AUTOMÁTICA DE LIBRES
  // Se ejecuta cada vez que cambia localFixture
  useEffect(() => {
    let haCambiado = false;
    const nuevoFixture = localFixture.map(p => {
      if (!p.es_libre) return p;

      // Buscar equipos de esta zona que NO están en los partidos de esta fecha
      const equiposZona = equipos.filter(e => e.zona === p.zona);
      if (equiposZona.length < 5) return p; // Solo deducir si la zona está completa

      const partidosFechaZona = localFixture.filter(pf => pf.fecha_numero === p.fecha_numero && pf.zona === p.zona && !pf.es_libre);
      const idsJugando = new Set<string>();
      partidosFechaZona.forEach(pf => {
        if (pf.id_local) idsJugando.add(pf.id_local);
        if (pf.id_visitante) idsJugando.add(pf.id_visitante);
      });

      const equiposLibres = equiposZona.filter(e => !idsJugando.has(e.id));
      
      // Si hay exactamente 1 equipo que no juega, ese es el libre
      const nuevoIdLibre = equiposLibres.length === 1 ? equiposLibres[0].id : null;
      
      if (p.id_libre !== nuevoIdLibre) {
        haCambiado = true;
        return { ...p, id_libre: nuevoIdLibre };
      }
      return p;
    });

    if (haCambiado) {
      setLocalFixture(nuevoFixture);
    }
  }, [localFixture, equipos]);

  const updateMatch = (id: string, field: keyof Partido, value: any) => {
    let updated = localFixture.map(p => {
      if (p.id_partido !== id) return p;
      const newP = { ...p, [field]: value };
      if (field === 'id_local' && value) {
        const eq = equipos.find(e => e.id === value);
        if (eq) {
          newP.zona = eq.zona;
          const visit = equipos.find(e => e.id === p.id_visitante);
          if (visit && visit.zona !== eq.zona) newP.id_visitante = null;
        }
      }
      return newP;
    });
    setLocalFixture(updated);
  };

  const handleGuardar = () => {
    onPartidosChange(localFixture);
  };

  const handleReiniciar = () => {
    if (window.confirm('¿Está seguro de REINICIAR el fixture?')) setLocalFixture(crearTemplateVacio());
  };

  const getEquiposVisitantes = (idLocal: string | null) => {
    if (!idLocal) return [];
    const eqL = equipos.find(e => e.id === idLocal);
    return eqL ? equipos.filter(e => e.zona === eqL.zona && e.id !== idLocal) : [];
  };

  const getEquipoById = (id: string | null) => id ? equipos.find(e => e.id === id) : null;

  return (
    <div className="fade-in space-y-12" style={{ paddingBottom: '120px' }}>
      <div className="glass-card p-8 flex items-center justify-between shadow-2xl sticky top-0 z-20" style={{ backdropFilter: 'blur(20px)', background: 'rgba(13,17,23,0.9)', borderBottom: '1px solid var(--gold)' }}>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald, sans-serif' }}>Carga de Fixture por Fecha</h2>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all font-sans" onClick={handleReiniciar}>⚠ Reiniciar Carga</button>
          <button className="btn-gold py-4 px-12 text-lg font-black tracking-[0.2em] shadow-2xl" onClick={handleGuardar}>✓ GUARDAR FIXTURE</button>
        </div>
      </div>

      <div className="space-y-20">
        {FECHAS_NUM.map(f => {
          const partidosFecha = localFixture
            .filter(p => p.fecha_numero === f && !p.es_libre)
            .sort((a,b) => HORARIOS_DISPONIBLES.indexOf(a.turno_horario || '') - HORARIOS_DISPONIBLES.indexOf(b.turno_horario || ''));
          const libresFecha = localFixture.filter(p => p.fecha_numero === f && p.es_libre);

          return (
            <div key={f} className="space-y-6">
              <div className="flex items-center gap-6">
                 <h3 className="text-5xl font-black uppercase italic text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>FECHA {f}</h3>
                 <div className="h-1 flex-1 bg-gradient-to-r from-gold/50 to-transparent rounded-full" />
              </div>

              <div className="glass-card overflow-hidden shadow-2xl border border-white/5">
                <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                  <colgroup><col style={{ width: '130px' }} /><col style={{ width: '140px' }} /><col /><col /><col style={{ width: '180px' }} /></colgroup>
                  <thead>
                    <tr className="bg-white/5" style={{ borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">HORARIO</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">GRUPO</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">LOCAL (TODOS)</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">VISITANTE (ZONA)</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {partidosFecha.map((m) => {
                      const localSel = getEquipoById(m.id_local);
                      const eqsVisit = getEquiposVisitantes(m.id_local);
                      return (
                        <tr key={m.id_partido} className="hover:bg-white/2 transition-colors">
                          <td className="px-8 py-4 text-center"><span className="text-2xl font-black text-gold italic" style={{ fontFamily: 'Oswald' }}>{m.turno_horario || '—:—'}</span></td>
                          <td className="px-8 py-4"><div className="flex justify-center"><div className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all shadow-md ${localSel ? `zone-badge-${localSel.zona.toLowerCase()} scale-105` : 'bg-gray-800 text-gray-500'}`} style={{ minWidth: '90px', textAlign: 'center' }}>{localSel ? `ZONA ${localSel.zona}` : '—'}</div></div></td>
                          <td className="px-8 py-4">
                            <select className="input-field py-3 text-sm font-bold w-full uppercase" value={m.id_local || ''} onChange={e => updateMatch(m.id_partido, 'id_local', e.target.value)}>
                              <option value="">— SELECCIONE LOCAL —</option>
                              {equipos.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(e => <option key={e.id} value={e.id} style={{background:'#161b22'}}>{e.nombre.toUpperCase()}</option>)}
                            </select>
                          </td>
                          <td className="px-8 py-4">
                            <select className="input-field py-3 text-sm font-bold w-full uppercase" value={m.id_visitante || ''} onChange={e => updateMatch(m.id_partido, 'id_visitante', e.target.value)} disabled={!m.id_local}>
                              {!m.id_local ? <option value="">— BLOQUEADO —</option> : <><option value="">— SELECCIONE VISITANTE —</option>{eqsVisit.map(e => <option key={e.id} value={e.id} style={{background:'#161b22'}}>{e.nombre.toUpperCase()}</option>)}</>}
                            </select>
                          </td>
                          <td className="px-8 py-4 text-center"><span className="text-2xl font-black italic tracking-[0.1em] text-yellow-500/80 uppercase" style={{ fontFamily: 'Oswald' }}>PENDIENTE</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="glass-card p-6 bg-white/2 border-dashed border-2 border-white/5 opacity-80">
                <div className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-4 text-center italic">EQUIPOS QUE DESCANSAN (DEDUCIDO AUTOMÁTICAMENTE)</div>
                <div className="flex justify-center gap-12">
                  {ZONAS.map(z => {
                    const libre = libresFecha.find(l => l.zona === z);
                    const eqLibre = getEquipoById(libre?.id_libre || null);
                    return (
                      <div key={z} className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-xl border border-white/5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black zone-badge-${z.toLowerCase()}`}>ZONA {z}</span>
                        <span className="text-lg font-black tracking-tight uppercase text-gold" style={{ fontFamily: 'Oswald' }}>
                           {eqLibre ? eqLibre.nombre.toUpperCase() : 'NO DETERMINADO'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SECCIÓN DE PLAYOFFS: CUARTOS DE FINAL ──────────────────────── */}
      <div className="space-y-8" style={{ marginTop: '80px', borderTop: '2px solid rgba(255,255,255,0.05)', paddingTop: '60px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h3 className="text-5xl font-black uppercase italic text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
              FECHA 6 <span className="text-gold">· CUARTOS DE FINAL</span>
            </h3>
            <div className="h-1 flex-1 bg-gradient-to-r from-gold/50 to-transparent rounded-full" />
          </div>
          <div className="flex gap-4">
            {tieneCuartosGuardados ? (
              <button 
                className="px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all font-sans" 
                onClick={handleLimpiarCuartos}
              >
                ⚠ Eliminar Fixture Cuartos
              </button>
            ) : (
              <button 
                className="btn-gold py-4 px-12 text-lg font-black tracking-[0.2em] shadow-2xl" 
                onClick={handlePersistirCuartos}
              >
                ⚡ PERSISTIR CUARTOS DE FINAL
              </button>
            )}
          </div>
        </div>

        {/* Estado Informativo */}
        <div className="glass-card p-6" style={{ background: tieneCuartosGuardados ? 'rgba(34,197,94,0.05)' : 'rgba(245,166,35,0.05)', border: `1px solid ${tieneCuartosGuardados ? 'rgba(34,197,94,0.2)' : 'rgba(245,166,35,0.2)'}` }}>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: '24px' }}>{tieneCuartosGuardados ? '✓' : 'ℹ'}</span>
            <div>
              <h4 className="font-bold text-white uppercase text-sm">
                {tieneCuartosGuardados ? 'Fixture de Cuartos de Final Activo en Base de Datos' : 'Vista Previa del Fixture Proyectado'}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {tieneCuartosGuardados 
                  ? 'Los partidos de cuartos ya están guardados en Supabase. Se listan en las pestañas Cronograma, Consola de Transmisión y Overlays.' 
                  : 'Se muestra la proyección según los resultados en vivo. Hacé click en "PERSISTIR CUARTOS" para guardar estos cruces en Supabase como la Fecha 6.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Partidos con Estética Idéntica a Fase de Zonas */}
        <div className="glass-card overflow-hidden shadow-2xl border border-white/5">
          <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '130px' }} />
              <col style={{ width: '140px' }} />
              <col />
              <col />
              <col style={{ width: '180px' }} />
            </colgroup>
            <thead>
              <tr className="bg-white/5" style={{ borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">HORARIO</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">GRUPO</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">EQUIPO LOCAL</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">EQUIPO VISITANTE</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {partidosParaUI.map((p, idx) => {
                const localSel = p.local;
                const visitanteSel = p.visitante;
                
                // Color del badge según Copa
                const badgeStyle = p.copa === 'Oro'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30';

                return (
                  <tr key={idx} className="hover:bg-white/2 transition-colors">
                    <td className="px-8 py-4 text-center">
                      <span className="text-2xl font-black text-gold italic" style={{ fontFamily: 'Oswald' }}>
                        {p.horario || '—:—'} hs
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex justify-center">
                        <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all shadow-md ${badgeStyle}`} style={{ minWidth: '90px', textAlign: 'center' }}>
                          COPA {p.copa.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full" style={{ background: localSel?.color || '#374151' }} />
                        <span className="text-white">{localSel ? localSel.nombre.toUpperCase() : 'POR DETERMINAR'}</span>
                        <span className="text-[10px] font-bold text-gray-500 tracking-normal ml-1">({p.posLocal}°)</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-black uppercase tracking-tighter" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full" style={{ background: visitanteSel?.color || '#374151' }} />
                        <span className="text-white">{visitanteSel ? visitanteSel.nombre.toUpperCase() : 'POR DETERMINAR'}</span>
                        <span className="text-[10px] font-bold text-gray-500 tracking-normal ml-1">({p.posVisitante}°)</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      {p.estado === 'jugado' ? (
                        <span className="text-2xl font-black italic tracking-[0.1em] text-green-400 uppercase" style={{ fontFamily: 'Oswald' }}>
                          {p.goles_local} — {p.goles_visitante}
                        </span>
                      ) : (
                        <span className="text-2xl font-black italic tracking-[0.1em] text-yellow-500/80 uppercase" style={{ fontFamily: 'Oswald' }}>
                          PENDIENTE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Semifinalista Directo con la estética de caja de descansos de Zonas */}
        <div className="glass-card p-6 bg-white/2 border-dashed border-2 border-white/5 opacity-80">
          <div className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-4 text-center italic">
            PASE DIRECTO A SEMIFINALES - COPA DE ORO (DEDUCIDO AUTOMÁTICAMENTE)
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-xl border border-white/5">
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-yellow-500 text-black">#1 GENERAL</span>
              <span className="text-lg font-black tracking-tight uppercase text-gold" style={{ fontFamily: 'Oswald' }}>
                 {semifinalista ? semifinalista.nombre.toUpperCase() : 'NO DETERMINADO'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
