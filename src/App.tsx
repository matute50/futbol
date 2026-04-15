import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { Equipo, Partido, TabActiva } from './types';
import { TabEquipos } from './components/TabEquipos';
import { TabFixture } from './components/TabFixture';
import { TabCronograma } from './components/TabCronograma';
import { TabConsola } from './components/TabConsola';
import { OverlayMarcador } from './components/OverlayMarcador';
import { 
  cargarEquiposDB, 
  cargarPartidosDB, 
  insertarEquipoDB, 
  actualizarEquipoDB, 
  insertarPartidosBatchDB, 
  actualizarPartidoDB 
} from './db';
import { generarCodigoEquipo, HORARIOS_DISPONIBLES } from './fixture';

// Extender TabActiva para incluir la consola
type TabActivaExtended = TabActiva | 'consola';

const TABS: { id: TabActivaExtended; label: string }[] = [
  { id: 'equipos',    label: 'Carga de Equipos' },
  { id: 'fixture',    label: 'Generar Fixture' },
  { id: 'cronograma', label: 'Cronograma de Partidos' },
  { id: 'consola',    label: 'Consola de Transmisión' },
];

type SyncStatus = 'idle' | 'loading' | 'saving' | 'ok' | 'error';

export default function App() {
  const [tabActiva, setTabActiva] = useState<TabActivaExtended>('equipos');
  const [equipos,   setEquipos]   = useState<Equipo[]>([]);
  const [partidos,  setPartidos]  = useState<Partido[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [syncMsg,   setSyncMsg]    = useState('Cargando datos...');

  // Simple detección de vista (overlay o dashboard)
  const isOverlay = new URLSearchParams(window.location.search).get('view') === 'overlay';

  // ── Carga inicial desde Supabase ──────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setSyncStatus('loading');
      setSyncMsg('Cargando datos...');
      try {
        const [eqs, pts] = await Promise.all([cargarEquiposDB(), cargarPartidosDB()]);
        setEquipos(eqs);
        
        if (pts.length === 0) {
          // Inicializar fixture vacío con los horarios conocidos (5 fechas x 6 horarios)
          const initial: Partido[] = [];
          [1,2,3,4,5].forEach(f => {
            HORARIOS_DISPONIBLES.forEach((h, idx) => {
              initial.push({
                id_partido: `F${f}-H${idx}`,
                zona: 'A',
                fecha_numero: f,
                fecha_calendario: null,
                turno_horario: h,
                id_local: null, id_visitante: null, id_libre: null,
                goles_local: null, goles_visitante: null,
                estado: 'pendiente', es_libre: false
              });
            });
            // 3 libres por fecha
            ['A','B','C'].forEach(z => {
              initial.push({
                id_partido: `F${f}-Z${z}-LIBRE`,
                zona: (z as any), fecha_numero: f, fecha_calendario: null, turno_horario: null,
                id_local: null, id_visitante: null, id_libre: null,
                goles_local: null, goles_visitante: null,
                estado: 'pendiente', es_libre: true
              });
            });
          });
          setPartidos(initial);
        } else {
          setPartidos(pts);
        }
        
        setSyncStatus('ok');
        setSyncMsg('Datos cargados');
      } catch (e) {
        setSyncStatus('error');
        setSyncMsg('Error al cargar datos de Supabase');
        console.error(e);
      }
    };
    cargar();

    // Suscripción en tiempo real para equipos
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => {
        cargarEquiposDB().then(setEquipos);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  const handleEditarEquipo = useCallback(async (id: string, campos: Partial<Equipo>) => {
    setEquipos(prev => prev.map(e => e.id === id ? { ...e, ...campos } : e));
    try {
      await actualizarEquipoDB(id, campos);
      mostrarOk('Equipo actualizado');
    } catch (e) { mostrarError('Error al actualizar equipo'); console.error(e); }
  }, []);


  // ── Partidos ──────────────────────────────────────────────────────────────
  const handlePartidosChange = useCallback(async (nuevosPartidos: Partido[]) => {
    setPartidos(nuevosPartidos);
    setSyncStatus('saving');
    try {
      await insertarPartidosBatchDB(nuevosPartidos);
      mostrarOk('Datos sincronizados con Supabase');
    } catch (e) { 
      mostrarError('Error al sincronizar con Supabase'); 
      console.error(e); 
    }
  }, []);

  // ── Partido finalizado desde la Consola ───────────────────────────────────
  const handlePartidoFinalizado = useCallback((idPartido: string, golesLocal: number, golesVisita: number) => {
    setPartidos(prev => prev.map(p =>
      p.id_partido === idPartido
        ? { ...p, goles_local: golesLocal, goles_visitante: golesVisita, estado: 'jugado' }
        : p
    ));
    mostrarOk('Resultado guardado ✓');
  }, []);


  const equiposPorZona = (zona: 'A' | 'B' | 'C') => equipos.filter(e => e.zona === zona).length;
  const fixtureGenerado = partidos.length > 0;

  const syncColor: Record<SyncStatus, string> = {
    idle: 'transparent', loading: '#3b82f6', saving: '#f59e0b', ok: '#22c55e', error: '#ef4444',
  };
  const syncLabel: Record<SyncStatus, string> = {
    idle: '', loading: '⟳ Cargando...', saving: '⟳ Guardando...', ok: '✓ Sincronizado', error: '⚠ Error de conexión'
  };

  if (isOverlay) {
    return <OverlayMarcador />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark-bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="gradient-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 40px' }}>
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

              {/* Botón RESET Global (solo en Consola) */}
              {tabActiva === 'consola' && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-match'))}
                  style={{ 
                    background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px',
                    fontFamily: 'Oswald', fontSize: '12px', fontWeight: 900, cursor: 'pointer', letterSpacing: '1px',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                  RESET PARTIDO
                </button>
              )}


            </div>
          </div>
        </div>
      </header>


      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--dark-border)' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 40px' }}>
          <div className="flex gap-8" style={{ paddingTop: '8px' }}>
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
                 <span>{tab.label}</span>
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
        <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '10px 40px 40px 40px' }}>
          {tabActiva === 'equipos' && (
            <TabEquipos
              equipos={equipos}
              onAgregarEquipo={handleAgregarEquipo}
              onEditarEquipo={handleEditarEquipo}
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

    </div>
  );
}
