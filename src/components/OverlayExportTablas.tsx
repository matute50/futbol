import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';
import { toPng } from 'html-to-image';

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

export const OverlayExportTablas: React.FC = () => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);
    
    // We will render 3 invisible/off-screen capture refs to download them
    const captureRefA = useRef<HTMLDivElement>(null);
    const captureRefB = useRef<HTMLDivElement>(null);
    const captureRefC = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*');
        if (eqs) setEquipos(eqs);
        if (pts) setPartidos(pts as any[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('export-tablas-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return null;

    const calcularTabla = (zona: 'A' | 'B' | 'C'): { filas: FilaTabla[], equiposLive: Set<string> } => {
        const eqsZona = equipos.filter(e => e.zona === zona);
        const tabla: Record<string, FilaTabla> = {};
        const equiposLive = new Set<string>();

        eqsZona.forEach(e => {
            tabla[e.id] = { 
                id: e.id, nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
                color: e.color || '#333'
            };
        });

        partidos.filter(p => p.zona === zona).forEach(p => {
            if (!p.id_local || !p.id_visitante || p.goles_local === null || p.goles_visitante === null) return;
            
            if (p.estado !== 'jugado') {
                equiposLive.add(p.id_local);
                equiposLive.add(p.id_visitante);
            }

            const gl = p.goles_local;
            const gv = p.goles_visitante;

            if (tabla[p.id_local]) {
                const t = tabla[p.id_local];
                t.pj++; t.gf += gl; t.gc += gv;
                if (gl > gv) { t.pg++; t.pts += 3; }
                else if (gl === gv) { t.pe++; t.pts += 1; }
                else t.pp++;
            }

            if (tabla[p.id_visitante]) {
                const t = tabla[p.id_visitante];
                t.pj++; t.gf += gv; t.gc += gl;
                if (gv > gl) { t.pg++; t.pts += 3; }
                else if (gv === gl) { t.pe++; t.pts += 1; }
                else t.pp++;
            }
        });

        const filas = Object.values(tabla)
            .map(t => ({ ...t, dg: t.gf - t.gc }))
            .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

        return { filas, equiposLive };
    };

    const handleDownload = async (zona: 'A' | 'B' | 'C', ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return;
        try {
            const dataUrl = await toPng(ref.current, { 
                cacheBust: true, 
                backgroundColor: 'rgba(0,0,0,0)',
                width: 960,
                height: 1080,
                style: {
                    transform: 'none' // Ensure no scaling issues
                }
            });
            const link = document.createElement('a');
            link.download = `tabla_${zona.toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error al generar PNG:', err);
            alert('Hubo un error al generar la imagen.');
        }
    };

    const RenderZonaCapture = ({ zona, innerRef }: { zona: 'A' | 'B' | 'C', innerRef: React.RefObject<HTMLDivElement | null> }) => {
        const { filas: rows, equiposLive } = calcularTabla(zona);
        const zoneColors: Record<string, string> = { 'A': '#3b82f6', 'B': '#22c55e', 'C': '#f97316' };
        const color = zoneColors[zona];

        return (
            <div ref={innerRef} style={{
                width: '960px', height: '1080px', // Exact 50vw of a 1920x1080 screen
                background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                color: 'white', fontFamily: 'Inter, sans-serif', padding: '70px 40px 40px 40px',
                display: 'flex', flexDirection: 'column',
                boxSizing: 'border-box'
            }}>
                <header style={{ marginBottom: '30px', borderLeft: '10px solid #f5a623', paddingLeft: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
                        LIGA DE FÚTBOL DE VETERANOS DE SALADILLO
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'white' }}>TABLA DE POSICIONES</div>
                </header>
                
                <div style={{ 
                    background: 'rgba(255,255,255,0.08)', 
                    borderRadius: '15px', 
                    padding: '0', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderLeft: '10px solid #f5a623',
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: '28px' }}>
                            <thead>
                                <tr style={{ background: color, color: 'white' }}>
                                    <th style={{ textAlign: 'right', padding: '10px 20px 10px 10px', fontSize: '36px' }}>ZONA {zona}</th>
                                    <th style={{ padding: '10px' }}>PJ</th>
                                    <th style={{ padding: '10px' }}>PG</th>
                                    <th style={{ padding: '10px' }}>PTS</th>
                                    <th style={{ padding: '10px', borderRadius: '0 15px 15px 0' }}>DG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, idx) => {
                                    const isLive = equiposLive.has(r.id);
                                    return (
                                        <tr key={r.id} style={{ 
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            background: isLive ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                        }}>
                                            <td style={{ padding: '8px 20px 8px 25px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '20px' }}>
                                                    {isLive && (
                                                        <span style={{
                                                            background: '#ef4444', color: 'white', fontSize: '14px',
                                                            padding: '2px 8px', borderRadius: '4px', fontWeight: 900,
                                                            marginLeft: '10px', verticalAlign: 'middle'
                                                        }}>LIVE</span>
                                                    )}
                                                    <span style={{ opacity: 0.4 }}>{idx + 1}</span>
                                                    <span style={{ fontWeight: 400, textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'Impact, sans-serif' }}>{r.nombre}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '10px', color: '#f5a623', fontWeight: 700 }}>{r.pj}</td>
                                            <td style={{ textAlign: 'center', padding: '10px', color: '#f5a623', fontWeight: 700 }}>{r.pg}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, color: color, padding: '10px' }}>{r.pts}</td>
                                            <td style={{ textAlign: 'center', padding: '10px', color: '#f5a623', fontWeight: 700 }}>{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#1a1a1a', // Fondo oscuro para el panel de control
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box'
        }}>
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h1 style={{ color: 'white', margin: '0 0 10px 0', fontFamily: 'Inter', fontSize: '32px' }}>Exportador de Tablas</h1>
                <p style={{ color: '#888', margin: '0 0 20px 0', fontSize: '16px' }}>Generá PNGs transparentes con las tablas para usar en el video compacto.</p>
                
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button 
                        onClick={() => handleDownload('A', captureRefA)}
                        style={{
                            background: '#3b82f6', color: 'white',
                            padding: '12px 24px', borderRadius: '6px',
                            border: 'none', fontSize: '16px', fontWeight: 'bold',
                            cursor: 'pointer', fontFamily: 'Inter', textTransform: 'uppercase',
                            boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)'
                        }}
                    >
                        Descargar Tabla A
                    </button>
                    <button 
                        onClick={() => handleDownload('B', captureRefB)}
                        style={{
                            background: '#22c55e', color: 'white',
                            padding: '12px 24px', borderRadius: '6px',
                            border: 'none', fontSize: '16px', fontWeight: 'bold',
                            cursor: 'pointer', fontFamily: 'Oswald', textTransform: 'uppercase',
                            boxShadow: '0 4px 10px rgba(34, 197, 94, 0.4)'
                        }}
                    >
                        Descargar Tabla B
                    </button>
                    <button 
                        onClick={() => handleDownload('C', captureRefC)}
                        style={{
                            background: '#f97316', color: 'white',
                            padding: '12px 24px', borderRadius: '6px',
                            border: 'none', fontSize: '16px', fontWeight: 'bold',
                            cursor: 'pointer', fontFamily: 'Oswald', textTransform: 'uppercase',
                            boxShadow: '0 4px 10px rgba(249, 115, 22, 0.4)'
                        }}
                    >
                        Descargar Tabla C
                    </button>
                </div>
            </div>

            {/* Contenedores a capturar (escalados para previsualización, pero el PNG usará 960x1080 original) */}
            <div style={{ display: 'flex', gap: '20px', transform: 'scale(0.3)', transformOrigin: 'top center', height: '350px' }}>
                <RenderZonaCapture zona="A" innerRef={captureRefA} />
                <RenderZonaCapture zona="B" innerRef={captureRefB} />
                <RenderZonaCapture zona="C" innerRef={captureRefC} />
            </div>
        </div>
    );
};
