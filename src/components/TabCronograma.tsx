import React, { useState } from 'react';
import type { Equipo, Partido, Zona } from '../types';
import { HORARIOS_DISPONIBLES } from '../fixture';

interface Props {
  equipos: Equipo[];
  partidos: Partido[];
  onPartidosChange: (partidos: Partido[]) => void;
}

const ZONA_STYLES: Record<Zona, { badge: string; text: string }> = {
  A: { badge: 'zone-badge-a', text: 'text-blue-400' },
  B: { badge: 'zone-badge-b', text: 'text-green-400' },
  C: { badge: 'zone-badge-c', text: 'text-orange-400' },
};



export const TabCronograma: React.FC<Props> = ({ equipos, partidos, onPartidosChange }) => {
  const [filtroZona, setFiltroZona] = useState<Zona | 'TODAS'>('TODAS');
  const [filtroFecha, setFiltroFecha] = useState<number | 'TODAS'>('TODAS');

  const getEquipoById = (id: string | null) =>
    id ? equipos.find(e => e.id === id) : null;

  const fixtureGenerado = partidos.length > 0;

  const actualizarPartido = (id_partido: string, campo: 'fecha_calendario' | 'turno_horario', valor: string) => {
    const nuevos = partidos.map(p =>
      p.id_partido === id_partido ? { ...p, [campo]: valor || null } : p
    );
    onPartidosChange(nuevos);
  };

  const asignarFechaAJornada = (fechaNumero: number, fechaCalendario: string) => {
    const nuevos = partidos.map(p =>
      p.fecha_numero === fechaNumero ? { ...p, fecha_calendario: fechaCalendario || null } : p
    );
    onPartidosChange(nuevos);
  };

  const sortearTurnos = (fechaNumero: number) => {
    const partidosFecha = partidos.filter(p => p.fecha_numero === fechaNumero && !p.es_libre);
    const horariosMezclados = [...HORARIOS_DISPONIBLES]
      .sort(() => Math.random() - 0.5)
      .slice(0, partidosFecha.length);

    const nuevos = partidos.map(p => {
      if (p.fecha_numero !== fechaNumero || p.es_libre) return p;
      const idx = partidosFecha.findIndex(pp => pp.id_partido === p.id_partido);
      return { ...p, turno_horario: horariosMezclados[idx] ?? null };
    });
    onPartidosChange(nuevos);
  };

  // Partidos filtrados (solo partidos reales, no libres)
  const partidosReales = partidos.filter(p => !p.es_libre);
  const partidosFiltrados = partidosReales.filter(p => {
    if (filtroZona !== 'TODAS' && p.zona !== filtroZona) return false;
    if (filtroFecha !== 'TODAS' && p.fecha_numero !== filtroFecha) return false;
    return true;
  });

  // Obtener fecha calendario de una jornada (todos los partidos de esa jornada tienen la misma)
  const getFechaDeJornada = (fechaNum: number) =>
    partidos.find(p => p.fecha_numero === fechaNum)?.fecha_calendario ?? '';

  const fechas = Array.from(new Set(partidos.map(p => p.fecha_numero))).sort();

  // Calcular turnos asignados y pendientes
  const totalPartidosReales = partidosReales.length;
  const conTurno = partidosReales.filter(p => p.turno_horario).length;
  const conFecha = partidosReales.filter(p => p.fecha_calendario).length;

  return (
    <div className="fade-in space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
            {totalPartidosReales}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Total Partidos</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Oswald, sans-serif' }}>
            {conFecha}/{totalPartidosReales}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Con Fecha Asignada</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Oswald, sans-serif' }}>
            {conTurno}/{totalPartidosReales}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Con Turno Asignado</div>
        </div>
      </div>

      {!fixtureGenerado ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-5xl mb-4">📅</div>
          <div className="text-lg font-semibold mb-2">Sin cronograma disponible</div>
          <div className="text-sm">Genere el fixture primero para poder asignar fechas y horarios.</div>
        </div>
      ) : (
        <>
          {/* Gestión por Jornada */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📅</span> Asignación de Fechas por Jornada
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {fechas.map(fn => {
                const fechaCal = getFechaDeJornada(fn);
                const pFecha = partidosReales.filter(p => p.fecha_numero === fn);
                const turnosOk = pFecha.filter(p => p.turno_horario).length;
                return (
                  <div key={fn} className="glass-card p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--gold)' }}>
                        Jornada {fn}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {turnosOk}/{pFecha.length} turnos
                      </span>
                    </div>
                    <input
                      type="date"
                      className="input-field text-xs"
                      value={fechaCal || ''}
                      onChange={e => asignarFechaAJornada(fn, e.target.value)}
                    />
                    <button
                      className="btn-primary w-full text-xs justify-center py-1.5"
                      onClick={() => sortearTurnos(fn)}
                      style={{ fontSize: '11px' }}
                    >
                      🎲 Sortear Turnos
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtros */}
          <div className="glass-card p-4 flex gap-4 items-center">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Filtrar:</span>
            <div className="flex gap-2">
              {(['TODAS', 'A', 'B', 'C'] as const).map(z => (
                <button
                  key={z}
                  onClick={() => setFiltroZona(z)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    filtroZona === z ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  {z === 'TODAS' ? 'Todas las Zonas' : `Zona ${z}`}
                </button>
              ))}
            </div>
            <div className="w-px h-5 mx-2" style={{ background: 'var(--dark-border)' }} />
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroFecha('TODAS')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  filtroFecha === 'TODAS' ? 'tab-active' : 'tab-inactive'
                }`}
              >
                Todas las Fechas
              </button>
              {fechas.map(fn => (
                <button
                  key={fn}
                  onClick={() => setFiltroFecha(fn)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    filtroFecha === fn ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  F{fn}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de cronograma */}
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(255,255,255,0.03)' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>TURNO</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ZONA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>FECHA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>FECHA CALENDARIO</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>LOCAL</th>
                  <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>—</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>VISITANTE</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ASIGNAR TURNO</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {partidosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No hay partidos con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  partidosFiltrados
                    .sort((a, b) => {
                      if (a.fecha_numero !== b.fecha_numero) return a.fecha_numero - b.fecha_numero;
                      return a.zona.localeCompare(b.zona);
                    })
                    .map(p => {
                      const local = getEquipoById(p.id_local);
                      const visitante = getEquipoById(p.id_visitante);
                      const style = ZONA_STYLES[p.zona];

                      return (
                        <tr
                          key={p.id_partido}
                          className="match-row"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        >
                          {/* Turno */}
                          <td className="px-4 py-3">
                            <div
                              className="font-bold text-sm"
                              style={{
                                color: p.turno_horario ? 'var(--gold)' : 'var(--text-secondary)',
                                fontFamily: 'Oswald, sans-serif',
                                minWidth: '60px',
                              }}
                            >
                              {p.turno_horario ?? '—:——'}
                            </div>
                          </td>

                          {/* Zona */}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${style.badge}`}>
                              ZONA {p.zona}
                            </span>
                          </td>

                          {/* Fecha número */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                              Fecha {p.fecha_numero}
                            </span>
                          </td>

                          {/* Fecha calendario */}
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              className="input-field"
                              style={{ minWidth: '140px', fontSize: '12px', padding: '6px 10px' }}
                              value={p.fecha_calendario ?? ''}
                              onChange={e => actualizarPartido(p.id_partido, 'fecha_calendario', e.target.value)}
                            />
                          </td>

                          {/* Local */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 rounded ${style.badge}`}>{local?.codigo}</span>
                              <span className="font-medium text-sm">{local?.nombre}</span>
                            </div>
                          </td>

                          {/* VS */}
                          <td className="px-4 py-3 text-center text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>VS</td>

                          {/* Visitante */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 rounded ${style.badge}`}>{visitante?.codigo}</span>
                              <span className="font-medium text-sm">{visitante?.nombre}</span>
                            </div>
                          </td>

                          {/* Selector de turno */}
                          <td className="px-4 py-3">
                            <select
                              className="input-field"
                              style={{ minWidth: '110px', fontSize: '12px', padding: '6px 10px' }}
                              value={p.turno_horario ?? ''}
                              onChange={e => actualizarPartido(p.id_partido, 'turno_horario', e.target.value)}
                            >
                              <option value="">Sin turno</option>
                              {HORARIOS_DISPONIBLES.map(h => (
                                <option key={h} value={h}>{h} hs</option>
                              ))}
                            </select>
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3">
                            <span className={p.estado === 'jugado' ? 'status-played' : 'status-pending'}>
                              {p.estado === 'jugado' ? 'Jugado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Botón exportar JSON */}
          <div className="flex justify-end">
            <button
              className="btn-primary"
              onClick={() => {
                const data = JSON.stringify({ equipos, partidos }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `torneo-veteranos-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ↓ Exportar JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
};
