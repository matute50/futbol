import React, { useState } from 'react';
import type { Equipo, Zona } from '../types';
import { generarCodigoEquipo } from '../fixture';

interface Props {
  equipos: Equipo[];
  onAgregarEquipo: (equipo: Equipo) => void;
  onEditarEquipo: (id: string, campos: Partial<Equipo>) => void;
}

const ZONAS: Zona[] = ['A', 'B', 'C'];

const ZONA_STYLES: Record<Zona, { badge: string; row: string }> = {
  A: { badge: 'zone-badge-a', row: 'border-l-blue-500' },
  B: { badge: 'zone-badge-b', row: 'border-l-green-500' },
  C: { badge: 'zone-badge-c', row: 'border-l-orange-500' },
};

export const TabEquipos: React.FC<Props> = ({ equipos, onAgregarEquipo, onEditarEquipo }) => {
  const [nombreInput, setNombreInput] = useState('');
  const [zonaInput, setZonaInput] = useState<Zona>('A');
  const [colorInput1, setColorInput1] = useState('#1a4a2e');
  const [colorInput2, setColorInput2] = useState('#1a4a2e');

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
      color: colorInput1,
      color_secundario: colorInput2,
      color_texto: '#FFFFFF',
    };
    onAgregarEquipo(nuevo);
    setNombreInput('');
  };

  const handleKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Enter') agregarEquipo();
  };

  return (
    <div className="fade-in flex flex-col gap-4 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>

      <div className="glass-card p-6 shadow-xl shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block tracking-widest opacity-80">Equipo</label>
            <input
              type="text"
              className="input-field w-full py-2.5 px-4 text-lg"
              placeholder="Nombre del equipo..."
              value={nombreInput}
              onChange={e => setNombreInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block tracking-widest opacity-80">Zona</label>
              <select
                className="input-field py-2.5 px-4 text-base font-bold"
                value={zonaInput}
                onChange={e => setZonaInput(e.target.value as Zona)}
                style={{ minWidth: '110px', borderRadius: '12px' }}
              >
                {ZONAS.map(z => (
                  <option key={z} value={z}>Zona {z}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 px-4 py-2 glass-card shadow-lg" style={{ border: '1px solid var(--dark-border)', borderRadius: '12px' }}>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Colores</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colorInput1}
                    onChange={e => setColorInput1(e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <input
                    type="color"
                    value={colorInput2}
                    onChange={e => setColorInput2(e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
            <button
              className="btn-gold py-3 px-8 text-sm font-black uppercase tracking-widest shadow-xl"
              onClick={agregarEquipo}
              disabled={!puedeAgregar || zonaSaturada}
              style={{ minHeight: '52px', borderRadius: '12px' }}
            >
              + REGISTRAR
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 items-stretch overflow-hidden">
        {ZONAS.map(zona => {
          const eqs = equiposPorZona(zona);
          const style = ZONA_STYLES[zona];
          return (
            <div key={zona} className="glass-card p-6 flex flex-col shadow-xl overflow-hidden" style={{ borderRadius: '20px', background: 'rgba(0,0,0,0.3)' }}>
              <div className="mb-8 shrink-0">
                <h3 className="font-black w-full">
                  <span className={`block w-full py-4 rounded-xl text-2xl font-black tracking-[0.3em] shadow-2xl text-center ${style.badge}`}
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    ZONA {zona}
                  </span>
                </h3>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {eqs.length === 0 ? (
                  <div className="text-center py-12 text-sm opacity-30 flex flex-col items-center justify-center gap-4" style={{ color: 'var(--text-secondary)' }}>
                    <div className="text-4xl">👥</div>
                    <span className="uppercase tracking-widest font-light text-xs">Sin equipos</span>
                  </div>
                ) : (
                  eqs.map(eq => (
                    <div
                      key={eq.id}
                      className={`team-card glass-card flex items-center gap-4 p-4 border-l-4 transition-all hover:translate-x-1 shadow-lg ${style.row}`}
                      style={{ cursor: 'default', borderRadius: '12px', minHeight: '64px' }}
                    >
                      <span
                        className={`text-sm font-black px-3 py-1 rounded-lg shadow-xl ${style.badge}`}
                        style={{
                          minWidth: '48px',
                          textAlign: 'center',
                          background: eq.color_secundario
                            ? `linear-gradient(135deg, ${eq.color}, ${eq.color_secundario})`
                            : eq.color ?? undefined,
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        {eq.codigo}
                      </span>
                      <input
                        className="flex-1 text-base font-bold tracking-tight uppercase bg-transparent border-none outline-none focus:ring-1 focus:ring-white/10 rounded px-2 hover:bg-white/5 transition-all w-full"
                        style={{ fontFamily: 'Oswald, sans-serif' }}
                        defaultValue={eq.nombre}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== eq.nombre) {
                            onEditarEquipo(eq.id, { nombre: e.target.value.trim() });
                          } else {
                            e.target.value = eq.nombre;
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                      />
                      
                      {/* EDICIÓN DE COLORES EN FILA */}
                      <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                         <input 
                           type="color" value={eq.color || '#1a4a2e'} 
                           onChange={e => onEditarEquipo(eq.id, { color: e.target.value })}
                           style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                         />
                         <input 
                           type="color" value={eq.color_secundario || eq.color || '#1a4a2e'} 
                           onChange={e => onEditarEquipo(eq.id, { color_secundario: e.target.value })}
                           style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                         />
                         <div className="flex bg-black/40 rounded p-0.5 border border-white/10 ml-1">
                            <button onClick={() => onEditarEquipo(eq.id, { color_texto: 'white' })} style={{ width: '16px', height: '16px', fontSize: '8px', color: eq.color_texto === 'white' ? '#fff' : '#666', background: eq.color_texto === 'white' ? '#444' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 900 }}>W</button>
                            <button onClick={() => onEditarEquipo(eq.id, { color_texto: 'black' })} style={{ width: '16px', height: '16px', fontSize: '8px', color: eq.color_texto === 'black' ? '#fff' : '#666', background: eq.color_texto === 'black' ? '#444' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 900 }}>B</button>
                         </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Slots vacíos */}
                {Array.from({ length: 5 - eqs.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-4 p-4 rounded-xl border text-sm transition-opacity"
                    style={{
                      borderColor: 'rgba(255,255,255,0.05)',
                      borderStyle: 'dashed',
                      color: 'var(--text-secondary)',
                      opacity: 0.1,
                      minHeight: '64px'
                    }}
                  >
                    <span className="text-xs font-bold px-2 py-1 rounded border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      {zona}{eqs.length + i + 1}
                    </span>
                    <span className="uppercase tracking-widest font-black italic text-xs">Vacante</span>
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
