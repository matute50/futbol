import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';

interface FilaTabla {
    id: string;
    nombre: string;
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    dg: number;
    pts: number;
    color: string;
}

export const OverlayLiveStandings: React.FC = () => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [visible, setVisible] = useState(true); // FORZADO PARA DISEÑO
    const [currentZona, setCurrentZona] = useState<'A' | 'B' | 'C' | null>(null);
    const [filas, setFilas] = useState<FilaTabla[]>([]);
    
    // Refs para evitar problemas con cierres (closures) y manejar timers
    const partidosRef = useRef<Partido[]>([]);
    const equiposRef = useRef<Equipo[]>([]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*');
        if (eqs) {
            setEquipos(eqs);
            equiposRef.current = eqs;
        }
        if (pts) {
            const ptsData = pts as any[];
            setPartidos(ptsData);
            partidosRef.current = ptsData;
            
            // Detectar zona del partido más recientemente actualizado (el activo en consola)
            const latestMatch = [...ptsData].sort((a, b) => 
                new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
            )[0];
            
            const zonaToUse = latestMatch?.zona || currentZona || 'A';
            setCurrentZona(zonaToUse);
            setFilas(calcularTabla(zonaToUse, ptsData));
        }
    };

    const calcularTabla = (zona: 'A' | 'B' | 'C', partidosData: Partido[]): FilaTabla[] => {
        const eqsZona = equiposRef.current.filter(e => e.zona === zona);
        const tabla: Record<string, FilaTabla> = {};

        eqsZona.forEach(e => {
            tabla[e.id] = { 
                id: e.id, nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
                color: e.color || '#333'
            };
        });

        partidosData.filter(p => p.zona === zona).forEach(p => {
            // Solo procesamos partidos que tengan equipos y goles (finalizados o en vivo)
            if (!p.id_local || !p.id_visitante || p.goles_local === null || p.goles_visitante === null) return;
            
            const gl = p.goles_local;
            const gv = p.goles_visitante;

            // Local
            if (tabla[p.id_local]) {
                const t = tabla[p.id_local];
                t.pj++;
                t.gf += gl;
                t.gc += gv;
                if (gl > gv) { t.pg++; t.pts += 3; }
                else if (gl === gv) { t.pe++; t.pts += 1; }
                else t.pp++;
            }

            // Visitante
            if (tabla[p.id_visitante]) {
                const t = tabla[p.id_visitante];
                t.pj++;
                t.gf += gv;
                t.gc += gl;
                if (gv > gl) { t.pg++; t.pts += 3; }
                else if (gv === gl) { t.pe++; t.pts += 1; }
                else t.pp++;
            }
        });

        return Object.values(tabla)
            .map(t => ({ ...t, dg: t.gf - t.gc }))
            .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
    };

    useEffect(() => {
        fetchData();
        
        const channel = supabase.channel('broadcast-scoreboard')
            .on('broadcast', { event: 'cambio-partido' }, ({ payload }) => {
                const { id_partido, zona } = payload;
                let zonaToUse = zona;
                
                if (id_partido) {
                    const match = partidosRef.current.find(p => p.id_partido === id_partido);
                    if (match) zonaToUse = match.zona;
                }

                if (zonaToUse) {
                    setCurrentZona(zonaToUse);
                    setFilas(calcularTabla(zonaToUse, partidosRef.current));
                }
            })
            .on('broadcast', { event: 'goles' }, ({ payload }) => {
                const { id_partido, goles_local, goles_visitante } = payload;
                
                // Encontrar el partido afectado
                const match = partidosRef.current.find(p => p.id_partido === id_partido);
                if (!match) return;

                const zona = match.zona;
                setCurrentZona(zona);
                
                // 1. Calcular tabla ANTES del gol (usando el estado actual de partidosRef)
                const filasBefore = calcularTabla(zona, partidosRef.current);
                
                // 2. Calcular tabla DESPUÉS del gol
                const ptsAfter = partidosRef.current.map(p => 
                    p.id_partido === id_partido 
                    ? { ...p, goles_local, goles_visitante, estado: 'pendiente' } // Lo tratamos como pendiente pero con goles actualizados
                    : p
                );
                const filasAfter = calcularTabla(zona, ptsAfter);

                // 3. Preparar la secuencia de visualización
                setFilas(filasBefore);
                // setVisible(false); // COMENTADO PARA DISEÑO

                // Limpiar timers previos si los hubiera
                timers.current.forEach(clearTimeout);
                timers.current = [];

                // Aparecer a los 15 segundos
                timers.current.push(setTimeout(() => {
                    // setVisible(true); // COMENTADO PARA DISEÑO
                }, 15000));

                // Animar cambios a los 17 segundos (2s después de aparecer)
                timers.current.push(setTimeout(() => {
                    setFilas(filasAfter);
                }, 17000));

                // Desaparecer a los 27 segundos (12s después de aparecer)
                /* timers.current.push(setTimeout(() => {
                    setVisible(false);
                }, 27000)); */

                // Actualizar el ref de partidos para la próxima vez
                partidosRef.current = ptsAfter;
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channel);
            timers.current.forEach(clearTimeout);
        };
    }, []);

    if (!currentZona) return null;

    const zoneColors: Record<string, string> = { 'A': '#3b82f6', 'B': '#22c55e', 'C': '#f97316' };
    const color = zoneColors[currentZona];

    return (
        <div style={{
            position: 'fixed', bottom: '40px', left: '40px',
            width: '280px',
            background: 'rgba(10, 15, 20, 0.5)', 
            backdropFilter: 'blur(10px)',
            border: `4px solid ${color}`,
            borderRadius: '12px',
            color: 'white', fontFamily: 'Oswald, sans-serif',
            overflow: 'hidden',
            boxShadow: `0 15px 40px rgba(0,0,0,0.8), 0 0 20px ${color}22`,
            zIndex: 9999,
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            pointerEvents: 'none'
        }}>
            {/* Header Compacto con PTS y DG */}
            <div style={{ 
                background: `linear-gradient(90deg, ${color}, ${color}cc)`, 
                padding: '6px 12px', 
                display: 'flex', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <span style={{ flex: 1, fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    TABLA EN VIVO - ZONA {currentZona}
                </span>
                <span style={{ width: '30px', textAlign: 'center', fontSize: '13px', fontWeight: 900, transform: 'translateX(-5px)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>PJ</span>
                <span style={{ width: '30px', textAlign: 'center', fontSize: '13px', fontWeight: 900, transform: 'translateX(-5px)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Pts</span>
                <span style={{ width: '30px', textAlign: 'center', fontSize: '13px', fontWeight: 900, transform: 'translateX(-5px)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>DG</span>
            </div>
            
            {/* Table Container con Filas Maximizadas */}
            <div style={{ padding: '5px 12px', position: 'relative', height: `${filas.length * 36 + 10}px` }}>
                <div style={{ position: 'relative' }}>
                    {filas.map((r, idx) => (
                        <div key={r.id} style={{
                            position: 'absolute',
                            top: `${idx * 36}px`,
                            left: 0, right: 0,
                            height: '34px',
                            display: 'flex', alignItems: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '4px',
                            padding: '0 12px',
                            transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            borderLeft: `5px solid ${r.color}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                            <span style={{ flex: 1, fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)' }}>{r.nombre}</span>
                            <span style={{ width: '30px', textAlign: 'center', fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontSize: '18px', transform: 'translateX(3px)', textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)' }}>{r.pj}</span>
                            <span style={{ width: '30px', textAlign: 'center', fontWeight: 900, color: color, fontSize: '22px', transform: 'translateX(3px)', textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)' }}>{r.pts}</span>
                            <span style={{ width: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '18px', fontWeight: 700, transform: 'translateX(3px)', textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)' }}>{r.dg > 0 ? `+${r.dg}` : r.dg}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <style>{`
                @keyframes pulse-gold {
                    0% { box-shadow: 0 0 0 0 rgba(245, 166, 35, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(245, 166, 35, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(245, 166, 35, 0); }
                }
            `}</style>
        </div>
    );
};
