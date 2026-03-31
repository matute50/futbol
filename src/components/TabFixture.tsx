import React, { useState } from 'react';
import type { Equipo, Partido, Zona } from '../types';
import { generarFixtureCompleto } from '../fixture';

interface Props {
  equipos: Equipo[];
  partidos: Partido[];
  onPartidosChange: (partidos: Partido[]) => void;
}

const ZONA_STYLES: Record<Zona, { badge: string; header: string }> = {
  A: { badge: 'zone-badge-a', header: 'from-blue-900/30 to-transparent' },
  B: { badge: 'zone-badge-b', header: 'from-green-900/30 to-transparent' },
  C: { badge: 'zone-badge-c', header: 'from-orange-900/30 to-transparent' },
};

export const TabFixture: React.FC<Props> = ({ equipos, partidos, onPartidosChange }) => {
  const [confirmando, setConfirmando] = useState(false);

  const equiposPorZona = (zona: Zona) => equipos.filter(e => e.zona === zona);
  const zonaCompleta = (zona: Zona) => equiposPorZona(zona).length === 5;
  const todasCompletas = (['A', 'B', 'C'] as Zona[]).every(z => zonaCompleta(z));
  const fixtureGenerado = partidos.length > 0;

  const getEquipoById = (id: string | null) =>
    id ? equipos.find(e => e.id === id) : null;

  const handleGenerar = () => {
    if (!todasCompletas) return;
    if (fixtureGenerado) {
      setConfirmando(true);
      return;
    }
    onPartidosChange(generarFixtureCompleto(equipos));
  };

  const confirmarRegenerar = () => {
    onPartidosChange(generarFixtureCompleto(equipos));
    setConfirmando(false);
  };

  const partidosPorZona = (zona: Zona) =>
    partidos.filter(p => p.zona === zona && !p.es_libre);

  const libresPorZona = (zona: Zona) =>
    partidos.filter(p => p.zona === zona && p.es_libre);

  return (
    <div className="fade-in space-y-6">
      {/* Panel de estado */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Generación de Fixture Round-Robin</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              5 fechas por zona · 2 partidos por fecha · 1 equipo libre por fecha
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {(['A', 'B', 'C'] as Zona[]).map(zona => (
              <div key={zona} className="flex items-center gap-1.5 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    zonaCompleta(zona) ? 'bg-green-400' : 'bg-gray-600'
                  }`}
                />
                <span style={{ color: zonaCompleta(zona) ? '#22c55e' : 'var(--text-secondary)' }}>
                  Zona {zona}
                </span>
              </div>
            ))}
            <button
              className="btn-gold ml-4"
              onClick={handleGenerar}
              disabled={!todasCompletas}
              title={!todasCompletas ? 'Debe cargar los 15 equipos primero' : ''}
            >
              {fixtureGenerado ? '↺ Regenerar Fixture' : '⚡ Generar Fixture'}
            </button>
          </div>
        </div>

        {!todasCompletas && (
          <div
            className="mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#eab308' }}
          >
            <span>⚠</span>
            <span>
              Para generar el fixture es necesario que las 3 zonas tengan 5 equipos cada una.
              Actualmente:{' '}
              {(['A', 'B', 'C'] as Zona[])
                .map(z => `Zona ${z}: ${equiposPorZona(z).length}/5`)
                .join(' · ')}
            </span>
          </div>
        )}

        {/* Modal de confirmación */}
        {confirmando && (
          <div
            className="mt-4 p-4 rounded-lg flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <span className="text-sm" style={{ color: '#ef4444' }}>
              ⚠ Regenerar el fixture eliminará todas las fechas y horarios asignados. ¿Confirmar?
            </span>
            <div className="flex gap-2">
              <button
                className="btn-danger"
                onClick={confirmarRegenerar}
              >
                Sí, regenerar
              </button>
              <button
                onClick={() => setConfirmando(false)}
                className="text-sm px-3 py-1 rounded"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fixture por zona */}
      {fixtureGenerado ? (
        <div className="space-y-6">
          {(['A', 'B', 'C'] as Zona[]).map(zona => {
            const style = ZONA_STYLES[zona];
            const pz = partidosPorZona(zona);
            const lz = libresPorZona(zona);

            return (
              <div key={zona} className="glass-card overflow-hidden">
                {/* Header zona */}
                <div className={`p-4 bg-gradient-to-r ${style.header} border-b`} style={{ borderColor: 'var(--dark-border)' }}>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded font-bold text-sm ${style.badge}`}>
                      ZONA {zona}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {pz.length} partidos · {lz.length} fechas libres
                    </span>
                  </div>
                </div>

                {/* Tabla de partidos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>FECHA</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>PARTIDO</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>LOCAL</th>
                        <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>VS</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>VISITANTE</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ID PARTIDO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }, (_, f) => f + 1).map(fecha => {
                        const ps = pz.filter(p => p.fecha_numero === fecha);
                        const libre = lz.find(p => p.fecha_numero === fecha);
                        const equipoLibre = getEquipoById(libre?.id_libre ?? null);

                        return (
                          <React.Fragment key={fecha}>
                            {ps.map((p, idx) => {
                              const local = getEquipoById(p.id_local);
                              const visitante = getEquipoById(p.id_visitante);
                              return (
                                <tr
                                  key={p.id_partido}
                                  className="match-row"
                                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                >
                                  {idx === 0 && (
                                    <td rowSpan={3} className="px-4 py-3 align-middle">
                                      <div
                                        className={`inline-block px-2 py-1 rounded font-bold text-xs ${style.badge}`}
                                        style={{ fontFamily: 'Oswald, sans-serif' }}
                                      >
                                        F{fecha}
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-4 py-3">
                                    <span
                                      className="text-xs font-mono px-2 py-0.5 rounded"
                                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                                    >
                                      {p.id_partido}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium">{local?.nombre}</span>
                                    <span
                                      className={`ml-2 text-xs px-1.5 rounded ${style.badge}`}
                                    >
                                      {local?.codigo}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold" style={{ color: 'var(--text-secondary)' }}>
                                    VS
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium">{visitante?.nombre}</span>
                                    <span className={`ml-2 text-xs px-1.5 rounded ${style.badge}`}>
                                      {visitante?.codigo}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="status-pending">Pendiente</span>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Fila de equipo libre */}
                            {libre && (
                              <tr className="bye-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td className="px-4 py-2.5 text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                                  — Libre
                                </td>
                                <td colSpan={4} className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  Descansa:{' '}
                                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {equipoLibre?.nombre}{' '}
                                    <span className={`text-xs px-1 rounded ${style.badge}`}>{equipoLibre?.codigo}</span>
                                  </span>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="glass-card p-12 text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div className="text-5xl mb-4">📋</div>
          <div className="text-lg font-semibold mb-2">Sin fixture generado</div>
          <div className="text-sm">
            {todasCompletas
              ? 'Presione "Generar Fixture" para crear el torneo Round-Robin.'
              : 'Cargue los 15 equipos (5 por zona) para habilitar la generación del fixture.'}
          </div>
        </div>
      )}
    </div>
  );
};
