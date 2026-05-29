import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';
import { calcularProyeccionGeneral } from '../lib/tablaGeneral';
import { toPng } from 'html-to-image';

interface PartidoCuartos {
    horario: string;
    copa: 'Oro' | 'Plata';
    posLocal: number;
    posVisitante: number;
    local: any;
    visitante: any;
}

export const OverlayCruces: React.FC = () => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*');
        if (eqs) setEquipos(eqs);
        if (pts) setPartidos(pts as any[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('cruces-realtime-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white font-['Oswald']">
                <div className="animate-pulse text-2xl font-bold tracking-widest text-[#f5a623]">CARGANDO CRUCES...</div>
            </div>
        );
    }

    const proyeccion = calcularProyeccionGeneral(equipos, partidos);
    const semifinalista = proyeccion.find(e => e.posicion === 1);

    const partidosCuartos: PartidoCuartos[] = [
        {
            horario: "09:00 hs",
            copa: "Plata",
            posLocal: 11,
            posVisitante: 12,
            local: proyeccion.find(e => e.posicion === 11),
            visitante: proyeccion.find(e => e.posicion === 12),
        },
        {
            horario: "10:10 hs",
            copa: "Plata",
            posLocal: 10,
            posVisitante: 13,
            local: proyeccion.find(e => e.posicion === 10),
            visitante: proyeccion.find(e => e.posicion === 13),
        },
        {
            horario: "11:20 hs",
            copa: "Plata",
            posLocal: 9,
            posVisitante: 14,
            local: proyeccion.find(e => e.posicion === 9),
            visitante: proyeccion.find(e => e.posicion === 14),
        },
        {
            horario: "12:30 hs",
            copa: "Plata",
            posLocal: 8,
            posVisitante: 15,
            local: proyeccion.find(e => e.posicion === 8),
            visitante: proyeccion.find(e => e.posicion === 15),
        },
        {
            horario: "13:40 hs",
            copa: "Oro",
            posLocal: 4,
            posVisitante: 5,
            local: proyeccion.find(e => e.posicion === 4),
            visitante: proyeccion.find(e => e.posicion === 5),
        },
        {
            horario: "14:50 hs",
            copa: "Oro",
            posLocal: 3,
            posVisitante: 6,
            local: proyeccion.find(e => e.posicion === 3),
            visitante: proyeccion.find(e => e.posicion === 6),
        },
        {
            horario: "16:00 hs",
            copa: "Oro",
            posLocal: 2,
            posVisitante: 7,
            local: proyeccion.find(e => e.posicion === 2),
            visitante: proyeccion.find(e => e.posicion === 7),
        }
    ];

    const handleDownload = async () => {
        if (!containerRef.current) return;
        try {
            const dataUrl = await toPng(containerRef.current, {
                cacheBust: true,
                backgroundColor: '#07070a',
                width: 1280,
                height: 720,
            });
            const link = document.createElement('a');
            link.download = `cruces_playoffs.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error al generar PNG:', err);
            alert('Hubo un error al generar la imagen.');
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Botón flotante para descargar */}
            <button
                onClick={handleDownload}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '25px',
                    zIndex: 10000,
                    background: 'linear-gradient(135deg, #f5a623, #d4891a)',
                    color: 'black',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 15px rgba(245, 166, 35, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 166, 35, 0.6)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 166, 35, 0.4)';
                }}
            >
                <span>📥 Descargar Imagen</span>
            </button>

            {/* Contenedor Principal (vMix / OBS standard 1280x720) */}
            <div 
                ref={containerRef}
                style={{
                    width: '1280px',
                    height: '720px',
                    background: 'radial-gradient(circle at center, #151522 0%, #07070a 100%)',
                    color: 'white',
                    fontFamily: 'Inter, sans-serif',
                    padding: '30px 40px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Decoración cancha de fútbol sutil en el fondo */}
                <div style={{
                    position: 'absolute',
                    top: '5%',
                    bottom: '5%',
                    left: '5%',
                    right: '5%',
                    border: '2px solid rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px',
                    pointerEvents: 'none',
                    zIndex: 0
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '0',
                        right: '0',
                        height: '2px',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '120px',
                        height: '120px',
                        border: '2px solid rgba(255, 255, 255, 0.02)',
                        borderRadius: '50%'
                    }} />
                </div>

                {/* ── HEADER ──────────────────────────────────────────────────────── */}
                <header style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderBottom: '2px solid rgba(255,255,255,0.08)', 
                    paddingBottom: '12px',
                    zIndex: 1
                }}>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#f5a623', letterSpacing: '3px', textTransform: 'uppercase' }}>
                            Liga de Veteranos Saladillo
                        </div>
                        <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '32px', fontWeight: 900, margin: '2px 0 0 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
                            CRUCES DE PLAYOFFS <span style={{ color: '#f5a623' }}>· CUARTOS DE FINAL</span>
                        </h1>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Estado de la tabla
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
                            En Vivo Proyectado
                        </div>
                    </div>
                </header>

                {/* ── SECCIÓN CENTRAL: SEMIFINALISTA DIRECTO ──────────────────────── */}
                <section style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    zIndex: 1, 
                    margin: '10px 0' 
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.12) 0%, rgba(212, 137, 26, 0.05) 100%)',
                        border: '2px dashed rgba(245, 166, 35, 0.4)',
                        boxShadow: '0 8px 32px rgba(245, 166, 35, 0.1)',
                        borderRadius: '12px',
                        padding: '12px 40px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '500px',
                        position: 'relative'
                    }}>
                        {/* Pequeña corona decorativa */}
                        <span style={{ fontSize: '20px', position: 'absolute', top: '-14px', background: '#0a0a14', padding: '0 10px', color: '#f5a623' }}>👑</span>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#f5a623', letterSpacing: '3px', textTransform: 'uppercase' }}>
                            Pase Directo a Semifinales (Copa de Oro)
                        </div>
                        <div style={{ 
                            fontFamily: 'Oswald, sans-serif', 
                            fontSize: '28px', 
                            fontWeight: 900, 
                            color: 'white', 
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            {semifinalista?.nombre || 'POR DEFINIR'}
                            <span style={{ color: '#f5a623', marginLeft: '12px', fontSize: '18px', fontWeight: 400 }}>#1 General</span>
                        </div>
                    </div>
                </section>

                {/* ── PARTIDOS DE CUARTOS DE FINAL ───────────────────────────────── */}
                <section style={{ 
                    flex: 1, 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '12px', 
                    margin: '5px 0',
                    zIndex: 1
                }}>
                    {partidosCuartos.map((pc, idx) => {
                        const isOro = pc.copa === 'Oro';
                        const accentColor = isOro ? '#f5a623' : '#a1a1aa';
                        const bgGradient = isOro 
                            ? 'linear-gradient(to right, rgba(245, 166, 35, 0.08) 0%, rgba(0,0,0,0.3) 100%)'
                            : 'linear-gradient(to right, rgba(255, 255, 255, 0.04) 0%, rgba(0,0,0,0.3) 100%)';
                        
                        const borderStyle = isOro 
                            ? '1px solid rgba(245, 166, 35, 0.25)' 
                            : '1px solid rgba(255, 255, 255, 0.08)';

                        const leftAccent = isOro ? '6px solid #f5a623' : '6px solid #a1a1aa';

                        return (
                            <div 
                                key={idx}
                                style={{
                                    background: bgGradient,
                                    border: borderStyle,
                                    borderLeft: leftAccent,
                                    borderRadius: '10px',
                                    padding: '12px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                    backdropFilter: 'blur(8px)',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* Horario y Copa info */}
                                <div style={{ minWidth: '95px' }}>
                                    <div style={{ 
                                        fontFamily: 'Oswald, sans-serif', 
                                        fontSize: '18px', 
                                        fontWeight: 700, 
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        🕒 {pc.horario}
                                    </div>
                                    <span style={{ 
                                        fontSize: '10px', 
                                        fontWeight: 900, 
                                        color: accentColor, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '1px',
                                        display: 'block',
                                        marginTop: '2px'
                                    }}>
                                        Copa de {pc.copa}
                                    </span>
                                </div>

                                {/* Partido Enfrentamiento */}
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '14px', 
                                    padding: '0 10px',
                                    overflow: 'hidden'
                                }}>
                                    {/* Local */}
                                    <div style={{ 
                                        flex: 1, 
                                        textAlign: 'right', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap' 
                                    }}>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: 700, 
                                            color: accentColor, 
                                            marginRight: '6px' 
                                        }}>
                                            ({pc.posLocal}°)
                                        </span>
                                        <span style={{ 
                                            fontWeight: 800, 
                                            fontSize: '14px', 
                                            textTransform: 'uppercase',
                                            color: pc.local ? 'white' : 'rgba(255,255,255,0.4)',
                                            borderBottom: pc.local?.color ? `3px solid ${pc.local.color}` : 'none',
                                            paddingBottom: '2px'
                                        }}>
                                            {pc.local?.nombre || 'POR DEFINIR'}
                                        </span>
                                    </div>

                                    {/* VS Badge */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        color: '#f5a623',
                                        letterSpacing: '1px'
                                    }}>
                                        VS
                                    </div>

                                    {/* Visitante */}
                                    <div style={{ 
                                        flex: 1, 
                                        textAlign: 'left', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap' 
                                    }}>
                                        <span style={{ 
                                            fontWeight: 800, 
                                            fontSize: '14px', 
                                            textTransform: 'uppercase',
                                            color: pc.visitante ? 'white' : 'rgba(255,255,255,0.4)',
                                            borderBottom: pc.visitante?.color ? `3px solid ${pc.visitante.color}` : 'none',
                                            paddingBottom: '2px',
                                            marginRight: '6px'
                                        }}>
                                            {pc.visitante?.nombre || 'POR DEFINIR'}
                                        </span>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: 700, 
                                            color: accentColor 
                                        }}>
                                            ({pc.posVisitante}°)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* ── FOOTER ──────────────────────────────────────────────────────── */}
                <footer style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderTop: '1px solid rgba(255,255,255,0.06)', 
                    paddingTop: '8px',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.4)',
                    zIndex: 1
                }}>
                    <div>
                        Organización y Cómputos: <strong>Saladillo Vivo</strong>
                    </div>
                    <div>
                        © {new Date().getFullYear()} Todos los derechos reservados · Liga de Veteranos
                    </div>
                </footer>
            </div>
        </div>
    );
};
