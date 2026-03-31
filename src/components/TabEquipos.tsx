import React, { useState } from 'react';
import type { Equipo, Zona } from '../types';
import { generarCodigoEquipo } from '../fixture';

interface Props {
  equipos: Equipo[];
  onAgregarEquipo: (equipo: Equipo) => void;
  onEliminarEquipo: (id: string) => void;
}

const ZONAS: Zona[] = ['A', 'B', 'C'];

const ZONA_STYLES: Record<Zona, { badge: string; row: string }> = {
  A: { badge: 'zone-badge-a', row: 'border-l-blue-500' },
  B: { badge: 'zone-badge-b', row: 'border-l-green-500' },
  C: { badge: 'zone-badge-c', row: 'border-l-orange-500' },
};

export const TabEquipos: React.FC<Props> = ({ equipos, onAgregarEquipo, onEliminarEquipo }) => {
  const [nombreInput, setNombreInput] = useState('');
  const [zonaInput, setZonaInput] = useState<Zona>('A');

  const equiposPorZona = (zona: Zona) => equipos.filter(e => e.zona === zona);
  const totalEquipos = equipos.length;
  const puedeAgregar = totalEquipos < 15 && nombreInput.trim() !== '';
  const zonaSaturada = equiposPorZona(zonaInput).length >= 5;

  const agregarEquipo = () => {
    if (!puedeAgregar || zonaSaturada) return;
    const enZona = equiposPorZona(zonaInput).length + 1;
    const nuevo: Equipo = {
      id: `eq-${Date.now()}`, // ID temporal; Supabase lo reemplazará con UUID
      nombre: nombreInput.trim(),
      zona: zonaInput,
      codigo: generarCodigoEquipo(zonaInput, enZona),
    };
    onAgregarEquipo(nuevo);
    setNombreInput('');
  };

  const handleKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Enter') agregarEquipo();
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Equipos', value: `${totalEquipos}/15`, color: 'text-white' },
          { label: 'Zona A', value: `${equiposPorZona('A').length}/5`, color: 'text-blue-400' },
          { label: 'Zona B', value: `${equiposPorZona('B').length}/5`, color: 'text-green-400' },
          { label: 'Zona C', value: `${equiposPorZona('C').length}/5`, color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className={`text-2xl font-bold ${color}`} style={{ fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Formulario de carga */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚽</span> Agregar Equipo
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              className="input-field"
              placeholder="Nombre del equipo..."
              value={nombreInput}
              onChange={e => setNombreInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
            />
          </div>
          <div style={{ minWidth: '160px' }}>
            <select
              className="input-field"
              value={zonaInput}
              onChange={e => setZonaInput(e.target.value as Zona)}
            >
              {ZONAS.map(z => (
                <option key={z} value={z} disabled={equiposPorZona(z).length >= 5}>
                  Zona {z} ({equiposPorZona(z).length}/5){equiposPorZona(z).length >= 5 ? ' — Completa' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            onClick={agregarEquipo}
            disabled={!puedeAgregar || zonaSaturada}
            title={zonaSaturada ? 'La zona seleccionada ya tiene 5 equipos' : ''}
          >
            + Agregar
          </button>
        </div>
        {zonaSaturada && (
          <p className="text-xs mt-2" style={{ color: '#f59e0b' }}>
            ⚠ La Zona {zonaInput} ya tiene 5 equipos. Seleccione otra zona.
          </p>
        )}
        {totalEquipos === 15 && (
          <p className="text-xs mt-2" style={{ color: '#22c55e' }}>
            ✓ Los 15 equipos han sido cargados correctamente.
          </p>
        )}
      </div>

      {/* Lista por zona */}
      <div className="grid grid-cols-3 gap-4">
        {ZONAS.map(zona => {
          const eqs = equiposPorZona(zona);
          const style = ZONA_STYLES[zona];
          return (
            <div key={zona} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${style.badge}`}>
                    ZONA {zona}
                  </span>
                </h3>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {eqs.length}/5 equipos
                </span>
              </div>

              <div className="space-y-2">
                {eqs.length === 0 ? (
                  <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Sin equipos asignados
                  </div>
                ) : (
                  eqs.map(eq => (
                    <div
                      key={eq.id}
                      className={`team-card glass-card flex items-center gap-3 p-3 border-l-2 ${style.row}`}
                    >
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${style.badge}`}
                        style={{ minWidth: '32px', textAlign: 'center' }}
                      >
                        {eq.codigo}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{eq.nombre}</span>
                      <button
                        className="btn-danger"
                        onClick={() => onEliminarEquipo(eq.id)}
                        title="Eliminar equipo"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}

                {/* Slots vacíos */}
                {Array.from({ length: 5 - eqs.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--dark-border)',
                      borderStyle: 'dashed',
                      color: 'var(--text-secondary)',
                      opacity: 0.4,
                    }}
                  >
                    <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: 'var(--dark-border)' }}>
                      {zona}{eqs.length + i + 1}
                    </span>
                    <span>Vacante</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
