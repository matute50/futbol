import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';
import { toPng } from 'html-to-image';

export const OverlayMarcadores: React.FC = () => {
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const captureRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*').order('fecha_numero', { ascending: true });
        
        if (eqs) setEquipos(eqs);
        if (pts) setPartidos(pts as any[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase
            .channel('broadcast-marcadores')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return null;

    // Determinar la fecha pasada a mostrar
    const fechasDisponibles = Array.from(new Set(partidos.map(p => p.fecha_numero))).sort((a, b) => a - b);
    let fechaPasada = fechasDisponibles[0] || 1;

    for (const f of fechasDisponibles) {
        const partidosDeLaFecha = partidos.filter(p => p.fecha_numero === f && !p.es_libre && p.id_local && p.id_visitante);
        if (partidosDeLaFecha.length > 0) {
            const algunPendiente = partidosDeLaFecha.some(p => p.estado === 'pendiente');
            if (algunPendiente) {
                fechaPasada = Math.max(1, f - 1);
                break;
            } else {
                fechaPasada = f; 
            }
        }
    }

    const hOrder = ['09.00', '10.30', '12.00', '13.30', '15.00', '16.30'];
    const partidosFecha = partidos
        .filter(p => p.fecha_numero === fechaPasada && !p.es_libre && p.id_local && p.id_visitante)
        .sort((a,b) => hOrder.indexOf(a.turno_horario || '') - hOrder.indexOf(b.turno_horario || ''));

    const getEquipo = (id: string | null) => equipos.find(e => e.id === id);

    const handleDownload = async () => {
        if (!captureRef.current) return;
        try {
            // Asegurarse de que el fondo sea transparente en el renderizado
            const dataUrl = await toPng(captureRef.current, { 
                cacheBust: true, 
                backgroundColor: 'rgba(0,0,0,0)' 
            });
            const link = document.createElement('a');
            link.download = `marcadores_fecha_${fechaPasada}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error al generar PNG:', err);
            alert('Hubo un error al generar la imagen.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#1a1a1a', // Fondo oscuro para el panel de control
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box'
        }}>
            <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                <h1 style={{ color: 'white', margin: '0 0 5px 0', fontFamily: 'Inter', fontSize: '22px' }}>Exportador de Marcadores</h1>
                <p style={{ color: '#888', margin: '0 0 10px 0', fontSize: '12px' }}>Generá un PNG transparente con los resultados para usar en el video compacto.</p>
                <button 
                    onClick={handleDownload}
                    style={{
                        background: '#f5a623', color: 'black',
                        padding: '8px 16px', borderRadius: '6px',
                        border: 'none', fontSize: '14px', fontWeight: 'bold',
                        cursor: 'pointer', fontFamily: 'Inter', textTransform: 'uppercase',
                        boxShadow: '0 4px 10px rgba(245, 166, 35, 0.4)'
                    }}
                >
                    Descargar PNG de Fecha {fechaPasada}
                </button>
            </div>

            {/* Contenedor a capturar */}
            <div ref={captureRef} style={{
                width: '760px', // Aún más reducido para asegurar visibilidad sin scroll en pantallas pequeñas
                background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 100%)',
                color: 'white', fontFamily: 'Inter, sans-serif', padding: '15px 25px',
                display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <header style={{ marginBottom: '10px', borderLeft: '6px solid #f5a623', paddingLeft: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1, textTransform: 'uppercase' }}>
                        LIGA DE FÚTBOL DE VETERANOS DE SALADILLO
                    </div>
                    <div style={{ 
                        background: '#f5a623', padding: '4px 12px', 
                        borderRadius: '4px', marginTop: '6px', 
                        display: 'inline-block'
                    }}>
                        <span style={{ color: 'black', fontSize: '16px', fontWeight: 900, letterSpacing: '1px' }}>
                            RESULTADOS - FECHA {fechaPasada}
                        </span>
                    </div>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    {partidosFecha.map(p => {
                        const el = getEquipo(p.id_local);
                        const ev = getEquipo(p.id_visitante);
                        const zoneColors: Record<string, string> = { 'A': '#3b82f6', 'B': '#22c55e', 'C': '#f97316' };
                        return (
                            <div key={p.id_partido} style={{
                                display: 'flex', alignItems: 'stretch', background: '#000', color: '#fff',
                                borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)', height: '48px'
                            }}>
                                {/* ZONA */}
                                <div style={{
                                    background: '#000', padding: '0 12px', display: 'flex', flexDirection: 'column', 
                                    alignItems: 'center', justifyContent: 'center', 
                                    borderRight: '1px solid rgba(255,255,255,0.1)', color: '#f5a623', minWidth: '45px'
                                }}>
                                    <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>ZONA</span>
                                    <span style={{ fontSize: '20px', fontWeight: 900, lineHeight: 0.9 }}>{p.zona}</span>
                                </div>

                                {/* LOCAL */}
                                <div style={{
                                    background: el?.color || '#222',
                                    padding: '0 20px', display: 'flex', alignItems: 'center',
                                    flex: 1, justifyContent: 'flex-end', textShadow: '2px 2px 4px rgba(0,0,0,1)',
                                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                                    color: el?.color_texto ?? 'white',
                                    borderBottom: `4px solid ${el?.color_secundario || 'transparent'}`
                                }}>
                                    <span style={{ fontSize: '18px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap', fontFamily: 'Impact, sans-serif' }}>
                                        {el?.nombre}
                                    </span>
                                </div>

                                {/* GOLES LOCAL */}
                                <div style={{
                                    background: '#000', padding: '0 15px', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', fontSize: '26px', fontWeight: 900, minWidth: '45px',
                                    borderRight: p.estado === 'jugado' ? '2px solid rgba(255,255,255,0.1)' : 'none',
                                    color: p.estado === 'jugado' ? 'white' : '#555'
                                }}>
                                    {p.estado === 'jugado' ? p.goles_local : ''}
                                </div>

                                {/* DIVIDER / VS */}
                                {p.estado === 'jugado' ? (
                                    <div style={{ background: '#fff', width: '2px', zIndex: 5 }} />
                                ) : (
                                    <div style={{ background: '#000', color: '#f5a623', fontSize: '16px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px' }}>
                                        VS
                                    </div>
                                )}

                                {/* GOLES VISITANTE */}
                                <div style={{
                                    background: '#000', padding: '0 15px', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', fontSize: '26px', fontWeight: 900, minWidth: '45px',
                                    borderLeft: p.estado === 'jugado' ? '2px solid rgba(255,255,255,0.1)' : 'none',
                                    color: p.estado === 'jugado' ? 'white' : '#555'
                                }}>
                                    {p.estado === 'jugado' ? p.goles_visitante : ''}
                                </div>

                                {/* VISITANTE */}
                                <div style={{
                                    background: ev?.color || '#222',
                                    padding: '0 20px', display: 'flex', alignItems: 'center',
                                    flex: 1, justifyContent: 'flex-start', textShadow: '2px 2px 4px rgba(0,0,0,1)',
                                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                                    color: ev?.color_texto ?? 'white',
                                    borderBottom: `4px solid ${ev?.color_secundario || 'transparent'}`
                                }}>
                                    <span style={{ fontSize: '18px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap', fontFamily: 'Impact, sans-serif' }}>
                                        {ev?.nombre}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
