import React, { useState, useCallback, useRef } from 'react';
import type { Equipo, Partido } from '../types';
import { supabase } from '../supabase';
import {
  precargarPartido,
  setGoalLocal,
  setGoalVisita,
  ejecutarCiclo,
  setColorLocal  as vmixSetColorLocal,
  setColorVisita as vmixSetColorVisita,
  stopCountdown,
} from '../lib/vmix';

interface Props {
  equipos: Equipo[];
  partidos: Partido[];
  onPartidoFinalizado: (idPartido: string, golesLocal: number, golesVisita: number) => void;
}

// ── Ciclo del partido ──────────────────────────────────────────────────────────
type EstadoPartido = 'pre' | 'primer_tiempo' | 'entretiempo' | 'segundo_tiempo' | 'finalizado';

const CICLO_LABELS: Record<EstadoPartido, { label: string; color: string; icon: string }> = {
  pre:            { label: 'INICIAR 1° TIEMPO',  color: '#22c55e', icon: '▶' },
  primer_tiempo:  { label: 'FIN 1° TIEMPO',      color: '#f59e0b', icon: '⏸' },
  entretiempo:    { label: 'INICIAR 2° TIEMPO',  color: '#22c55e', icon: '▶' },
  segundo_tiempo: { label: 'FINALIZAR PARTIDO',  color: '#ef4444', icon: '🏁' },
  finalizado:     { label: 'PARTIDO FINALIZADO', color: '#6b7280', icon: '✓' },
};

const ESTADO_ORDEN: EstadoPartido[] = ['pre', 'primer_tiempo', 'entretiempo', 'segundo_tiempo', 'finalizado'];
const VMIX_CICLO_MAP: Record<EstadoPartido, 0 | 1 | 2 | 3> = {
  pre:            0,
  primer_tiempo:  1,
  entretiempo:    2,
  segundo_tiempo: 3,
  finalizado:     3,
};
const PERIODO_DISPLAY: Record<EstadoPartido, string> = {
  pre:            '—',
  primer_tiempo:  'PRIMER TIEMPO',
  entretiempo:    'ENTRETIEMPO',
  segundo_tiempo: 'SEGUNDO TIEMPO',
  finalizado:     'FINAL',
};

export const TabConsola: React.FC<Props> = ({ equipos, partidos, onPartidoFinalizado }) => {
  // ── Selección de partido ────────────────────────────────────────────────────
  const [fecha,        setFecha]        = useState('');
  const [turno,        setTurno]        = useState('');
  const [partidoSel,   setPartidoSel]   = useState<Partido | null>(null);

  // ── Estado de juego ─────────────────────────────────────────────────────────
  const [golesLocal,   setGolesLocal]   = useState(0);
  const [golesVisita,  setGolesVisita]  = useState(0);
  const [estadoJuego,  setEstadoJuego]  = useState<EstadoPartido>('pre');

  // ── Colores ─────────────────────────────────────────────────────────────────
  const [colorLocal,   setColorLocal]   = useState('#1a4a2e');
  const [colorVisita,  setColorVisita]  = useState('#1a2a4a');

  // ── Status de operación ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<{ type: 'idle' | 'ok' | 'error' | 'loading'; msg: string }>({ type: 'idle', msg: '' });
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = (type: 'ok' | 'error' | 'loading', msg: string) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ type, msg });
    if (type !== 'loading') {
      statusTimer.current = setTimeout(() => setStatus({ type: 'idle', msg: '' }), 3000);
    }
  };

  // ── Filtros de partido ──────────────────────────────────────────────────────
  const fechasDisponibles = [...new Set(
    partidos
      .filter(p => !p.es_libre)
      .map(p => p.fecha_calendario)
      .filter(Boolean)
  )].sort() as string[];

  const turnosDisponibles = [...new Set(
    partidos
      .filter(p => !p.es_libre && (fecha ? p.fecha_calendario === fecha : true) && p.turno_horario)
      .map(p => p.turno_horario)
      .filter(Boolean)
  )].sort() as string[];

  const partidosFiltrados = partidos.filter(p =>
    !p.es_libre &&
    (!fecha  || p.fecha_calendario === fecha) &&
    (!turno  || p.turno_horario   === turno)
  );

  // ── Obtener nombres de equipo ───────────────────────────────────────────────
  const getNombre = (id: string | null) =>
    equipos.find(e => e.id === id)?.nombre ?? id ?? '??';

  // ── Precargar partido en vMix ───────────────────────────────────────────────
  const seleccionarPartido = useCallback(async (p: Partido) => {
    setPartidoSel(p);
    setGolesLocal(0);
    setGolesVisita(0);
    setEstadoJuego('pre');
    showStatus('loading', 'Enviando a vMix...');
    try {
      await precargarPartido({
        nombreLocal:  getNombre(p.id_local),
        nombreVisita: getNombre(p.id_visitante),
        zona:         `ZONA ${p.zona}`,
        colorLocal,
        colorVisita,
      });
      showStatus('ok', 'Partido cargado en vMix');
    } catch {
      showStatus('error', 'Error al conectar con vMix');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipos, colorLocal, colorVisita]);

  // ── Control de goles ────────────────────────────────────────────────────────
  const cambiarGol = useCallback(async (equipo: 'local' | 'visita', delta: 1 | -1) => {
    if (!partidoSel) return;
    if (equipo === 'local') {
      const nuevo = Math.max(0, golesLocal + delta);
      setGolesLocal(nuevo);
      await setGoalLocal(nuevo).catch(() => showStatus('error', 'Error vMix: GOLES LOCAL'));
    } else {
      const nuevo = Math.max(0, golesVisita + delta);
      setGolesVisita(nuevo);
      await setGoalVisita(nuevo).catch(() => showStatus('error', 'Error vMix: GOLES VISITA'));
    }
  }, [partidoSel, golesLocal, golesVisita]);

  // ── Botón maestro ───────────────────────────────────────────────────────────
  const avanzarCiclo = useCallback(async () => {
    if (!partidoSel || estadoJuego === 'finalizado') return;

    const idx = ESTADO_ORDEN.indexOf(estadoJuego);
    const siguiente = ESTADO_ORDEN[idx + 1] as EstadoPartido;

    showStatus('loading', 'Enviando a vMix...');
    try {
      await ejecutarCiclo(VMIX_CICLO_MAP[estadoJuego]);
      setEstadoJuego(siguiente);

      if (siguiente === 'finalizado') {
        // Guardar resultado en Supabase
        await supabase
          .from('partidos')
          .update({
            goles_local:     golesLocal,
            goles_visitante: golesVisita,
            estado:          'jugado',
          })
          .eq('id_partido', partidoSel.id_partido);

        onPartidoFinalizado(partidoSel.id_partido, golesLocal, golesVisita);
        showStatus('ok', 'Resultado guardado en Supabase ✓');
      } else {
        showStatus('ok', `${PERIODO_DISPLAY[siguiente]} activado`);
      }
    } catch {
      showStatus('error', 'Error al comunicar con vMix');
    }
  }, [partidoSel, estadoJuego, golesLocal, golesVisita, onPartidoFinalizado]);

  // ── Color handler ────────────────────────────────────────────────────────────
  const aplicarColor = async (lado: 'local' | 'visita', hex: string) => {
    if (lado === 'local') {
      setColorLocal(hex);               // estado React
      vmixSetColorLocal(hex);           // vMix (fire-and-forget, no-cors)
    } else {
      setColorVisita(hex);              // estado React
      vmixSetColorVisita(hex);          // vMix (fire-and-forget, no-cors)
    }
  };

  // ── Reset completo ────────────────────────────────────────────────────────────
  const resetConsola = async () => {
    await stopCountdown().catch(() => null);
    setPartidoSel(null);
    setGolesLocal(0);
    setGolesVisita(0);
    setEstadoJuego('pre');
    showStatus('ok', 'Consola restablecida');
  };

  const cicloInfo = CICLO_LABELS[estadoJuego];

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>

      {/* ── Columna izquierda: Selector de partido ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Panel filtros */}
        <div className="glass-card" style={{ padding: '20px', border: '1px solid var(--dark-border)' }}>
          <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '14px', letterSpacing: '1px', color: '#8b949e', marginBottom: '16px' }}>
            SELECTOR DE PARTIDO
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>FECHA</label>
              <select className="input-field" value={fecha} onChange={e => { setFecha(e.target.value); setTurno(''); setPartidoSel(null); }}>
                <option value="">— Todas las fechas —</option>
                {fechasDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>TURNO / HORARIO</label>
              <select className="input-field" value={turno} onChange={e => { setTurno(e.target.value); setPartidoSel(null); }}>
                <option value="">— Todos los turnos —</option>
                {turnosDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de partidos filtrados */}
        <div className="glass-card" style={{ padding: '16px', border: '1px solid var(--dark-border)' }}>
          <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', letterSpacing: '1px', color: '#8b949e', marginBottom: '12px' }}>
            PARTIDOS DISPONIBLES
          </h3>
          {partidosFiltrados.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#4b5563', textAlign: 'center', padding: '20px 0' }}>
              Sin partidos para los filtros seleccionados
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
              {partidosFiltrados.map(p => {
                const isSelected = partidoSel?.id_partido === p.id_partido;
                const esJugado   = p.estado === 'jugado';
                return (
                  <button
                    key={p.id_partido}
                    onClick={() => seleccionarPartido(p)}
                    style={{
                      background:   isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                      border:       `1px solid ${isSelected ? '#22c55e' : 'var(--dark-border)'}`,
                      borderRadius: '8px',
                      padding:      '10px 12px',
                      textAlign:    'left',
                      cursor:       'pointer',
                      transition:   'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#22c55e' : '#e6edf3', fontFamily: 'Oswald, sans-serif' }}>
                          {getNombre(p.id_local)} vs {getNombre(p.id_visitante)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          Zona {p.zona} · F{p.fecha_numero} · {p.turno_horario ?? '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                        <span style={{
                          background: esJugado ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.15)',
                          color:      esJugado ? '#22c55e' : '#eab308',
                          fontSize:   '10px', fontWeight: 600,
                          padding:    '2px 8px', borderRadius: '20px',
                        }}>
                          {esJugado ? 'JUGADO' : 'PENDIENTE'}
                        </span>
                        {esJugado && (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>
                            {p.goles_local ?? '?'} - {p.goles_visitante ?? '?'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Colores */}
        <div className="glass-card" style={{ padding: '20px', border: '1px solid var(--dark-border)' }}>
          <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', letterSpacing: '1px', color: '#8b949e', marginBottom: '14px' }}>
            FONDOS DE PANTALLA
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'FONDO LOCAL',  value: colorLocal,  handler: (h: string) => aplicarColor('local',  h) },
              { label: 'FONDO VISITA', value: colorVisita, handler: (h: string) => aplicarColor('visita', h) },
            ].map(({ label, value, handler }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: value, border: '2px solid var(--dark-border)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={value}
                      onChange={e => handler(e.target.value)}
                      style={{ width: '36px', height: '30px', borderRadius: '4px', border: '1px solid var(--dark-border)', background: 'transparent', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && handler(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '12px', fontFamily: 'monospace', padding: '6px 10px' }}
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={resetConsola}
          style={{
            background: 'rgba(107,114,128,0.15)',
            border: '1px solid rgba(107,114,128,0.3)',
            color: '#9ca3af', borderRadius: '8px',
            padding: '10px', fontSize: '12px',
            cursor: 'pointer', transition: 'all 0.2s',
            letterSpacing: '1px',
          }}
        >
          ↺ RESTABLECER CONSOLA
        </button>
      </div>

      {/* ── Columna derecha: Control principal ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Status bar */}
        {status.type !== 'idle' && (
          <div style={{
            background: status.type === 'ok'      ? 'rgba(34,197,94,0.12)'
                      : status.type === 'error'   ? 'rgba(239,68,68,0.12)'
                      : 'rgba(59,130,246,0.12)',
            border: `1px solid ${
              status.type === 'ok'    ? 'rgba(34,197,94,0.3)'
            : status.type === 'error' ? 'rgba(239,68,68,0.3)'
            : 'rgba(59,130,246,0.3)'}`,
            color: status.type === 'ok' ? '#22c55e' : status.type === 'error' ? '#ef4444' : '#60a5fa',
            padding: '10px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span>{status.type === 'loading' ? '⟳' : status.type === 'ok' ? '✓' : '✕'}</span>
            {status.msg}
          </div>
        )}

        {/* Partido activo / sin partido */}
        {!partidoSel ? (
          <div className="glass-card" style={{
            padding: '60px', textAlign: 'center',
            border: '1px dashed var(--dark-border)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📺</div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', letterSpacing: '1px', color: '#4b5563' }}>
              SELECCIONE UN PARTIDO PARA INICIAR LA TRANSMISIÓN
            </div>
          </div>
        ) : (
          <>
            {/* Encabezado del partido */}
            <div className="glass-card" style={{
              padding: '20px 28px',
              border: `1px solid ${estadoJuego === 'finalizado' ? '#22c55e44' : 'var(--dark-border)'}`,
              background: estadoJuego === 'finalizado' ? 'rgba(34,197,94,0.06)' : undefined,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    border: '1px solid rgba(59,130,246,0.3)',
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '1px',
                  }}>
                    ZONA {partidoSel.zona}
                  </span>
                  <span style={{ color: '#4b5563', fontSize: '12px' }}>
                    Fecha {partidoSel.fecha_numero} · {partidoSel.turno_horario ?? '—'}
                  </span>
                </div>
                <div style={{
                  background: `${cicloInfo.color}22`,
                  color:  cicloInfo.color,
                  border: `1px solid ${cicloInfo.color}44`,
                  padding: '4px 14px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                }}>
                  {PERIODO_DISPLAY[estadoJuego]}
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center', gap: '20px', marginTop: '20px',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#4b5563', marginBottom: '4px', fontFamily: 'Oswald' }}>LOCAL</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#e6edf3', fontFamily: 'Oswald' }}>
                    {getNombre(partidoSel.id_local).toUpperCase()}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#374151', fontFamily: 'Oswald' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#4b5563', marginBottom: '4px', fontFamily: 'Oswald' }}>VISITA</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#e6edf3', fontFamily: 'Oswald' }}>
                    {getNombre(partidoSel.id_visitante).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Marcador ─────────────────────────────────────────────────── */}
            <div className="glass-card" style={{ padding: '28px', border: '1px solid var(--dark-border)' }}>
              <h3 style={{ fontFamily: 'Oswald', fontSize: '13px', letterSpacing: '2px', color: '#4b5563', marginBottom: '24px', textAlign: 'center' }}>
                MARCADOR EN TIEMPO REAL
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '24px', alignItems: 'center' }}>
                {/* LOCAL */}
                <GoalControl
                  label="LOCAL"
                  goles={golesLocal}
                  onMas={() => cambiarGol('local', 1)}
                  onMenos={() => cambiarGol('local', -1)}
                  colorAccent={colorLocal}
                  disabled={estadoJuego === 'pre' || estadoJuego === 'finalizado'}
                />

                {/* Separador */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '48px', fontWeight: 900, fontFamily: 'Oswald',
                    color: estadoJuego === 'finalizado' ? '#22c55e' : '#4b5563',
                    lineHeight: 1,
                  }}>
                    {golesLocal} - {golesVisita}
                  </div>
                  {estadoJuego === 'finalizado' && (
                    <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#22c55e', marginTop: '6px', fontFamily: 'Oswald' }}>
                      RESULTADO FINAL
                    </div>
                  )}
                </div>

                {/* VISITA */}
                <GoalControl
                  label="VISITA"
                  goles={golesVisita}
                  onMas={() => cambiarGol('visita', 1)}
                  onMenos={() => cambiarGol('visita', -1)}
                  colorAccent={colorVisita}
                  disabled={estadoJuego === 'pre' || estadoJuego === 'finalizado'}
                />
              </div>
            </div>

            {/* ── Botón maestro ─────────────────────────────────────────────── */}
            <MasterButton
              label={cicloInfo.label}
              color={cicloInfo.color}
              icon={cicloInfo.icon}
              disabled={estadoJuego === 'finalizado'}
              onClick={avanzarCiclo}
              estadoPct={ESTADO_ORDEN.indexOf(estadoJuego) / (ESTADO_ORDEN.length - 1)}
            />

            {/* ── Progreso del partido ─────────────────────────────────────── */}
            <div className="glass-card" style={{ padding: '16px 20px', border: '1px solid var(--dark-border)' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {ESTADO_ORDEN.filter(e => e !== 'pre').map((e, i) => {
                  const idx = ESTADO_ORDEN.indexOf(estadoJuego);
                  const paso = i + 1;
                  const activo   = idx === paso;
                  const completo = idx > paso;
                  return (
                    <div key={e} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        height: '4px', width: '100%', borderRadius: '2px',
                        background: completo ? '#22c55e' : activo ? cicloInfo.color : '#1f2937',
                        transition: 'background 0.4s',
                      }} />
                      <span style={{
                        fontSize: '10px', letterSpacing: '0.5px',
                        color: completo ? '#22c55e' : activo ? cicloInfo.color : '#374151',
                        fontFamily: 'Oswald', fontWeight: completo || activo ? 700 : 400,
                      }}>
                        {PERIODO_DISPLAY[e]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Sub-componente: Control de goles ──────────────────────────────────────────
interface GoalControlProps {
  label: string;
  goles: number;
  onMas: () => void;
  onMenos: () => void;
  colorAccent: string;
  disabled: boolean;
}

const GoalControl: React.FC<GoalControlProps> = ({ label, goles, onMas, onMenos, colorAccent, disabled }) => {
  const [pressMas, setPressMas] = useState(false);
  const [pressMenos, setPressMenos] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#4b5563', fontFamily: 'Oswald' }}>{label}</div>

      {/* Goles display */}
      <div style={{
        fontSize: '72px', fontWeight: 900, fontFamily: 'Oswald, sans-serif',
        color: disabled ? '#374151' : '#e6edf3',
        lineHeight: 1, minWidth: '80px', textAlign: 'center',
        textShadow: disabled ? 'none' : `0 0 30px ${colorAccent}44`,
        transition: 'all 0.2s',
        userSelect: 'none',
      }}>
        {goles}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onMenos}
          disabled={disabled || goles === 0}
          onMouseDown={() => setPressMenos(true)}
          onMouseUp={() => setPressMenos(false)}
          onMouseLeave={() => setPressMenos(false)}
          style={{
            width: '52px', height: '52px', borderRadius: '12px',
            background: pressMenos ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: disabled || goles === 0 ? '#374151' : '#ef4444',
            fontSize: '22px', fontWeight: 700,
            cursor: disabled || goles === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: pressMenos ? 'scale(0.93)' : 'scale(1)',
          }}
        >
          −
        </button>
        <button
          onClick={onMas}
          disabled={disabled}
          onMouseDown={() => setPressMas(true)}
          onMouseUp={() => setPressMas(false)}
          onMouseLeave={() => setPressMas(false)}
          style={{
            width: '52px', height: '52px', borderRadius: '12px',
            background: pressMas ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.4)',
            color: disabled ? '#374151' : '#22c55e',
            fontSize: '22px', fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: pressMas ? 'scale(0.93)' : 'scale(1)',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};

// ── Sub-componente: Botón maestro ─────────────────────────────────────────────
interface MasterButtonProps {
  label: string;
  color: string;
  icon: string;
  disabled: boolean;
  onClick: () => void;
  estadoPct: number;
}

const MasterButton: React.FC<MasterButtonProps> = ({ label, color, icon, disabled, onClick }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: '100%', padding: '22px',
        background: disabled
          ? 'rgba(31,41,55,0.5)'
          : pressed
          ? `${color}44`
          : `${color}1a`,
        border: `2px solid ${disabled ? '#1f2937' : `${color}66`}`,
        borderRadius: '14px',
        color:  disabled ? '#374151' : color,
        fontSize: '20px', fontWeight: 800, letterSpacing: '2px',
        fontFamily: 'Oswald, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
        transition: 'all 0.15s',
        transform: pressed && !disabled ? 'scale(0.98)' : 'scale(1)',
        boxShadow: disabled ? 'none' : pressed ? `0 0 0 4px ${color}22` : `0 0 30px ${color}18`,
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      {label}
    </button>
  );
};

// ── Estilos compartidos ───────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', letterSpacing: '1.5px',
  color: '#4b5563', fontFamily: 'Oswald, sans-serif',
  marginBottom: '6px', fontWeight: 600,
};
