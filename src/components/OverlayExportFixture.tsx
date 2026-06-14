import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';
import { toPng } from 'html-to-image';

export const OverlayExportFixture: React.FC = () => {
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<number>(1);
    const captureRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*').order('fecha_numero', { ascending: true });
        
        if (eqs) setEquipos(eqs);
        if (pts) {
            setPartidos(pts as any[]);
            // Intentar detectar la fecha activa por defecto
            const fechasDisponibles = Array.from(new Set(pts.map(p => p.fecha_numero))).sort((a, b) => a - b);
            let fechaActual = fechasDisponibles[0] || 1;
            for (const f of fechasDisponibles) {
                const partidosDeLaFecha = pts.filter(p => p.fecha_numero === f && !p.es_libre && p.id_local && p.id_visitante);
                if (partidosDeLaFecha.length > 0) {
                    const algunPendiente = partidosDeLaFecha.some(p => p.estado === 'pendiente');
                    fechaActual = f;
                    if (algunPendiente) break;
                }
            }
            setFechaSeleccionada(fechaActual);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase
            .channel('broadcast-export-fixture')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return null;

    const parseHorario = (h: string | null) => {
        if (!h) return 9999;
        const limpio = h.toLowerCase().replace(/hs/g, '').trim();
        const partes = limpio.split(/[\.:]/);
        const horas = parseInt(partes[0], 10);
        const minutos = partes[1] ? parseInt(partes[1], 10) : 0;
        return isNaN(horas) ? 9999 : horas * 60 + (isNaN(minutos) ? 0 : minutos);
    };

    const partidosFecha = [...partidos]
        .filter(p => p.fecha_numero === fechaSeleccionada && !p.es_libre && p.id_local && p.id_visitante)
        .sort((a, b) => parseHorario(a.turno_horario) - parseHorario(b.turno_horario));

    const getEquipo = (id: string | null) => equipos.find(e => e.id === id);

    const handleDownload = async () => {
        if (!captureRef.current) return;
        try {
            const dataUrl = await toPng(captureRef.current, { 
                cacheBust: true, 
                backgroundColor: 'rgba(0,0,0,0)',
                width: 960,
                height: 1080
            });
            const link = document.createElement('a');
            link.download = `fixture_fecha_${fechaSeleccionada}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error al generar PNG:', err);
            alert('Hubo un error al generar la imagen del fixture.');
        }
    };

    // Obtener la lista única de fechas que tienen partidos configurados
    const fechasConPartidos = Array.from(new Set(partidos.map(p => p.fecha_numero))).sort((a, b) => a - b);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#141414',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '20px',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box'
        }}>
            {/* Cabecera del Panel */}
            <div style={{ marginBottom: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '600px' }}>
                <h1 style={{ color: 'white', margin: '0 0 5px 0', fontFamily: 'Oswald, sans-serif', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Exportador de Fixture
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 15px 0', fontSize: '13px' }}>
                    Genera una imagen PNG transparente de alta definición (960x1080 px) del cronograma de juego.
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Seleccionar Fecha:</span>
                        <select 
                            value={fechaSeleccionada} 
                            onChange={(e) => setFechaSeleccionada(Number(e.target.value))}
                            style={{
                                background: '#222',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {fechasConPartidos.map(f => (
                                <option key={f} value={f}>
                                    Fecha {f} {f === 6 ? '(Playoffs - Cuartos)' : f === 7 ? '(Playoffs - Semifinales)' : f > 7 ? `(Playoffs - F${f})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleDownload}
                        style={{
                            background: 'linear-gradient(135deg, #f5a623, #d4891a)',
                            color: 'black',
                            padding: '8px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'Inter',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 12px rgba(245, 166, 35, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                    >
                        Descargar PNG de Fecha {fechaSeleccionada}
                    </button>
                </div>
            </div>

            {/* Contenedor con escala para visualización en pantalla */}
            <div style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                overflow: 'hidden', 
                height: '520px',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '16px',
                background: 'rgba(0,0,0,0.2)',
                paddingTop: '20px'
            }}>
                <div style={{ transform: 'scale(0.45)', transformOrigin: 'top center' }}>
                    
                    {/* Elemento de Captura Real (960x1080) */}
                    <div ref={captureRef} style={{
                        width: '960px', 
                        height: '1080px', 
                        background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 100%)',
                        color: 'white', 
                        fontFamily: 'Inter, sans-serif', 
                        padding: '60px 40px 40px 40px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'stretch',
                        boxSizing: 'border-box'
                    }}>
                        <header style={{ marginBottom: '35px', borderLeft: '10px solid #f5a623', paddingLeft: '20px' }}>
                            <div style={{ fontSize: '26px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1, textTransform: 'uppercase' }}>
                                LIGA DE FÚTBOL DE VETERANOS DE SALADILLO
                            </div>
                            <div style={{ 
                                background: '#f5a623', 
                                padding: '6px 15px', 
                                borderRadius: '4px', 
                                marginTop: '12px', 
                                display: 'inline-block'
                            }}>
                                <span style={{ color: 'black', fontSize: '18px', fontWeight: 900, letterSpacing: '1px', textShadow: '2px 2px 4px rgba(255,255,255,0.7)' }}>
                                    TORNEO 2026 - CRONOGRAMA - FECHA {fechaSeleccionada}
                                </span>
                            </div>
                        </header>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', flex: 1, justifyContent: 'flex-start' }}>
                            {partidosFecha.map(p => {
                                const el = getEquipo(p.id_local);
                                const ev = getEquipo(p.id_visitante);
                                const zoneColors: Record<string, string> = { 'A': '#3b82f6', 'B': '#22c55e', 'C': '#f97316' };

                                const isPlayoff = fechaSeleccionada >= 6;
                                const badgeBg = isPlayoff
                                    ? (p.zona === 'A' ? '#d4af37' : '#a0a0a0')
                                    : (zoneColors[p.zona] || '#374151');
                                
                                let badgeText = '';
                                if (isPlayoff) {
                                    const pid = p.id_partido.toUpperCase();
                                    let instancia = '';
                                    const minutos = parseHorario(p.turno_horario);

                                    if (fechaSeleccionada >= 8) {
                                        if (minutos === 600 || minutos === 690) { // 10:00 o 11:30
                                            instancia = '3er/4to ';
                                        } else if (minutos === 780 || minutos === 870) { // 13:00 o 14:30
                                            instancia = 'FINAL ';
                                        }
                                    }

                                    if (!instancia) {
                                        if (pid.includes('FINAL') && !pid.includes('CUARTOS') && !pid.includes('SEMI')) {
                                            instancia = 'FINAL ';
                                        } else if (pid.includes('3ER') || pid.includes('TERCER') || pid.includes('3RO') || pid.includes('TERCERO')) {
                                            instancia = '3er/4to ';
                                        } else if (pid.includes('SEMI') || pid.includes('S-')) {
                                            instancia = 'SEMIFINAL ';
                                        } else if (pid.includes('CUARTOS') || pid.includes('Q-')) {
                                            instancia = 'CUARTOS ';
                                        }
                                    }
                                    badgeText = `${instancia}COPA DE ${p.zona === 'A' ? 'ORO' : 'PLATA'}`.trim();
                                } else {
                                    badgeText = `ZONA ${p.zona}`;
                                }

                                return (
                                    <div key={p.id_partido} style={{
                                        display: 'grid', 
                                        gridTemplateColumns: '90px 1fr auto',
                                        alignItems: 'center', 
                                        background: 'rgba(255,255,255,0.06)',
                                        padding: '12px 20px', 
                                        borderRadius: '8px', 
                                        borderLeft: '6px solid #f5a623',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        borderRight: '1px solid rgba(255,255,255,0.05)',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                        height: '75px',
                                        boxSizing: 'border-box'
                                    }}>
                                        {/* HORARIO */}
                                        <div style={{ fontWeight: 800, color: '#f5a623', fontSize: '20px', fontFamily: 'Oswald, sans-serif' }}>
                                            {p.turno_horario}
                                        </div>
                                        
                                        {/* ENCUENTRO */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'center', gap: '10px' }}>
                                            {/* LOCAL */}
                                            <div style={{ 
                                                textAlign: 'right', 
                                                fontSize: '26px', 
                                                fontWeight: 400, 
                                                textTransform: 'uppercase', 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontFamily: 'Impact, sans-serif',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {el?.nombre}
                                            </div>
                                            
                                            {/* VS */}
                                            <div style={{ 
                                                textAlign: 'center', 
                                                fontSize: '16px', 
                                                fontWeight: 900, 
                                                color: '#f5a623',
                                                background: 'rgba(245,166,35,0.1)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(245,166,35,0.2)'
                                            }}>
                                                VS
                                            </div>
                                            
                                            {/* VISITANTE */}
                                            <div style={{ 
                                                textAlign: 'left', 
                                                fontSize: '26px', 
                                                fontWeight: 400, 
                                                textTransform: 'uppercase', 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontFamily: 'Impact, sans-serif',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {ev?.nombre}
                                            </div>
                                        </div>

                                        {/* ZONA BADGE */}
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ 
                                                background: badgeBg, 
                                                color: isPlayoff && p.zona === 'A' ? 'black' : 'white', 
                                                textShadow: isPlayoff && p.zona === 'A' ? '2px 2px 4px rgba(255,255,255,1)' : '2px 2px 4px rgba(0,0,0,1)',
                                                padding: '5px 12px', 
                                                borderRadius: '6px', 
                                                fontSize: '13px', 
                                                fontWeight: 900, 
                                                letterSpacing: '0.5px', 
                                                whiteSpace: 'nowrap',
                                                textTransform: 'uppercase',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                            }}>
                                                {badgeText}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
