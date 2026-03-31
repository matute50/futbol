import { useState, useEffect, useCallback } from 'react';
import type { Equipo, Partido, TabActiva } from './types';
import { TabEquipos } from './components/TabEquipos';
import { TabFixture } from './components/TabFixture';
import { TabCronograma } from './components/TabCronograma';
import { TabConsola } from './components/TabConsola';
import {
  cargarEquiposDB,
  cargarPartidosDB,
  insertarEquipoDB,
  eliminarEquipoDB,
  actualizarCodigosDB,
  limpiarEquiposDB,
  insertarPartidosBatchDB,
  actualizarPartidoDB,
  limpiarPartidosDB,
} from './db';
import { generarCodigoEquipo } from './fixture';

// Extender TabActiva para incluir la consola
type TabActivaExtended = TabActiva | 'consola';

const TABS: { id: TabActivaExtended; label: string; icon: string; desc: string }[] = [
  { id: 'equipos',   label: 'Carga de Equipos',      icon: '👥', desc: '15 equipos · 3 zonas' },
  { id: 'fixture',   label: 'Generar Fixture',        icon: '📋', desc: 'Round-Robin por zona' },
  { id: 'cronograma',label: 'Cronograma de Partidos', icon: '📅', desc: 'Fechas y turnos' },
  { id: 'consola',   label: 'Consola de Transmisión', icon: '📺', desc: 'vMix · En directo' },
];

type SyncStatus = 'idle' | 'loading' | 'saving' | 'ok' | 'error';

export default function App() {
  const [tabActiva, setTabActiva] = useState<TabActivaExtended>('equipos');
  const [equipos,   setEquipos]   = useState<Equipo[]>([]);
  const [partidos,  setPartidos]  = useState<Partido[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [syncMsg,   setSyncMsg]    = useState('Cargando datos...');

  // ── Carga inicial desde Supabase ──────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setSyncStatus('loading');
      setSyncMsg('Cargando datos...');
      try {
        const [eqs, pts] = await Promise.all([cargarEquiposDB(), cargarPartidosDB()]);
        setEquipos(eqs);
        setPartidos(pts);
        setSyncStatus('ok');
        setSyncMsg('Datos cargados');
      } catch (e) {
        setSyncStatus('error');
        setSyncMsg('Error al cargar datos de Supabase');
        console.error(e);
      }
    };
    cargar();
  }, []);

  const mostrarOk = (msg = 'Guardado') => {
    setSyncStatus('ok'); setSyncMsg(msg);
    setTimeout(() => setSyncStatus('idle'), 2500);
  };
  const mostrarError = (msg: string) => {
    setSyncStatus('error'); setSyncMsg(msg);
    setTimeout(() => setSyncStatus('idle'), 4000);
  };

  // ── Equipos ───────────────────────────────────────────────────────────────
  const handleAgregarEquipo = useCallback(async (nuevoEquipo: Equipo) => {
    setSyncStatus('saving');
    try {
      const guardado = await insertarEquipoDB(nuevoEquipo);
      setEquipos(prev => [...prev, guardado]);
      mostrarOk('Equipo guardado');
    } catch (e) { mostrarError('Error al guardar equipo'); console.error(e); }
  }, []);

  const handleEliminarEquipo = useCallback(async (id: string) => {
    setSyncStatus('saving');
    try {
      await eliminarEquipoDB(id);
      setEquipos(prev => {
        const nuevos = prev.filter(e => e.id !== id);
        const recalc = nuevos.map(e => {
          const idx = nuevos.filter(x => x.zona === e.zona).indexOf(e) + 1;
          return { ...e, codigo: generarCodigoEquipo(e.zona, idx) };
        });
        actualizarCodigosDB(recalc).catch(console.error);
        return recalc;
      });
      mostrarOk('Equipo eliminado');
    } catch (e) { mostrarError('Error al eliminar equipo'); console.error(e); }
  }, []);

  // ── Partidos ──────────────────────────────────────────────────────────────
  const handlePartidosChange = useCallback(async (nuevosPartidos: Partido[]) => {
    const esFixtureNuevo = nuevosPartidos.length !== partidos.length ||
      nuevosPartidos.some(p => !partidos.find(pp => pp.id_partido === p.id_partido));

    setPartidos(nuevosPartidos);
    setSyncStatus('saving');
    try {
      if (esFixtureNuevo) {
        await insertarPartidosBatchDB(nuevosPartidos);
        mostrarOk('Fixture guardado en Supabase');
      } else {
        const cambios = nuevosPartidos.filter(p => {
          const ant = partidos.find(pp => pp.id_partido === p.id_partido);
          return ant && (
            ant.fecha_calendario !== p.fecha_calendario ||
            ant.turno_horario    !== p.turno_horario    ||
            ant.goles_local      !== p.goles_local      ||
            ant.goles_visitante  !== p.goles_visitante  ||
            ant.estado           !== p.estado
          );
        });
        await Promise.all(cambios.map(p => actualizarPartidoDB(p.id_partido, {
          fecha_calendario: p.fecha_calendario,
          turno_horario:    p.turno_horario,
          goles_local:      p.goles_local,
          goles_visitante:  p.goles_visitante,
          estado:           p.estado,
        })));
        if (cambios.length > 0) mostrarOk('Cronograma actualizado');
        else setSyncStatus('idle');
      }
    } catch (e) { mostrarError('Error al sincronizar con Supabase'); console.error(e); }
  }, [partidos]);

  // ── Partido finalizado desde la Consola ───────────────────────────────────
  const handlePartidoFinalizado = useCallback((idPartido: string, golesLocal: number, golesVisita: number) => {
    setPartidos(prev => prev.map(p =>
      p.id_partido === idPartido
        ? { ...p, goles_local: golesLocal, goles_visitante: golesVisita, estado: 'jugado' }
        : p
    ));
    mostrarOk('Resultado guardado ✓');
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetearTodo = async () => {
    if (!confirm('¿Eliminar todos los equipos y el fixture? Esta acción no se puede deshacer.')) return;
    setSyncStatus('saving');
    try {
      await limpiarPartidosDB();
      await limpiarEquiposDB();
      setEquipos([]); setPartidos([]);
      mostrarOk('Datos eliminados');
    } catch (e) { mostrarError('Error al reiniciar datos'); console.error(e); }
  };

  const equiposPorZona = (zona: 'A' | 'B' | 'C') => equipos.filter(e => e.zona === zona).length;
  const fixtureGenerado = partidos.length > 0;

  const syncColor: Record<SyncStatus, string> = {
    idle: 'transparent', loading: '#3b82f6', saving: '#f59e0b', ok: '#22c55e', error: '#ef4444',
  };
  const syncLabel: Record<SyncStatus, string> = {
    idle: '', loading: '⟳ Cargando...', saving: '⟳ Guardando...',
    ok: `✓ ${syncMsg}`, error: `✕ ${syncMsg}`,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark-bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="gradient-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
          <div className="flex items-center justify-between" style={{ height: '72px' }}>

            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-xl" style={{
                width: '48px', height: '48px',
                background: 'linear-gradient(135deg, #f5a623, #d4891a)',
                fontSize: '24px',
                boxShadow: '0 0 20px rgba(245,166,35,0.3)',
              }}>⚽</div>
              <div>
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.5px' }}>
                  LIGA DE VETERANOS
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Saladillo · Gestión de Torneo</span>
                  <div className="flex items-center gap-1">
                    <div className="pulse-dot" />
                    <span className="text-xs" style={{ color: '#22c55e' }}>En directo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-white" style={{ fontFamily: 'Oswald' }}>{equipos.length}/15</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>EQUIPOS</div>
                </div>
                <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="text-center">
                  <div className="font-bold" style={{ color: fixtureGenerado ? '#22c55e' : 'rgba(255,255,255,0.3)', fontFamily: 'Oswald' }}>
                    {fixtureGenerado ? '✓' : '—'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>FIXTURE</div>
                </div>
                <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="text-center">
                  <div className="font-bold text-white" style={{ fontFamily: 'Oswald' }}>
                    {partidos.filter(p => !p.es_libre && p.turno_horario).length}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>TURNOS</div>
                </div>
              </div>

              {syncStatus !== 'idle' && (
                <div className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 fade-in" style={{
                  background: `${syncColor[syncStatus]}18`,
                  color:  syncColor[syncStatus],
                  border: `1px solid ${syncColor[syncStatus]}44`,
                  minWidth: '160px', justifyContent: 'center',
                }}>
                  {syncLabel[syncStatus]}
                </div>
              )}

              <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5"
                style={{ background: 'rgba(62,207,142,0.1)', color: '#3ecf8e', border: '1px solid rgba(62,207,142,0.25)' }}>
                ⚡ Supabase
              </div>

              <button onClick={resetearTodo} className="btn-danger" style={{ fontSize: '11px' }}>
                ↺ Reiniciar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Zona pills */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--dark-border)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '8px 24px' }}>
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Zonas:</span>
            {(['A', 'B', 'C'] as const).map(z => (
              <span key={z} className={`px-2 py-0.5 rounded font-medium zone-badge-${z.toLowerCase()}`}>
                Zona {z}: {equiposPorZona(z)}/5
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--dark-border)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
          <div className="flex gap-1" style={{ paddingTop: '8px' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-lg text-sm font-medium transition-all ${
                  tabActiva === tab.id ? 'tab-active' : 'tab-inactive'
                }`}
                style={{
                  borderBottom: tabActiva === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                  // La consola tiene un indicador visual especial
                  ...(tab.id === 'consola' && tabActiva !== 'consola' ? {
                    color: '#f59e0b',
                  } : {}),
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  background: tab.id === 'consola' && tabActiva !== 'consola'
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(255,255,255,0.08)',
                  color: tab.id === 'consola' && tabActiva !== 'consola'
                    ? '#f87171'
                    : 'var(--text-secondary)',
                  fontWeight: 400,
                }}>
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {syncStatus === 'loading' && (
        <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="text-3xl mb-3">⟳</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Conectando con Supabase...</div>
          </div>
        </div>
      )}

      {/* ── Contenido ─────────────────────────────────────────────────────────── */}
      {syncStatus !== 'loading' && (
        <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
          {tabActiva === 'equipos' && (
            <TabEquipos
              equipos={equipos}
              onAgregarEquipo={handleAgregarEquipo}
              onEliminarEquipo={handleEliminarEquipo}
            />
          )}
          {tabActiva === 'fixture' && (
            <TabFixture
              equipos={equipos}
              partidos={partidos}
              onPartidosChange={handlePartidosChange}
            />
          )}
          {tabActiva === 'cronograma' && (
            <TabCronograma
              equipos={equipos}
              partidos={partidos}
              onPartidosChange={handlePartidosChange}
            />
          )}
          {tabActiva === 'consola' && (
            <TabConsola
              equipos={equipos}
              partidos={partidos}
              onPartidoFinalizado={handlePartidoFinalizado}
            />
          )}
        </main>
      )}

      <footer style={{ borderTop: '1px solid var(--dark-border)', marginTop: '40px', padding: '16px 24px', textAlign: 'center' }}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Liga de Veteranos · Saladillo Vivo · Sistema de Gestión de Torneo · Supabase · vMix 27
        </p>
      </footer>
    </div>
  );
}
