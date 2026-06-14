import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';

export const OverlayFixture: React.FC = () => {
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);

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
            .channel('broadcast-fixture')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return null;

    // Determinar la fecha actual a mostrar:
    // La primera fecha que tenga al menos un partido pendiente.
    // Si todos los partidos de todas las fechas están jugados, se muestra la última fecha.
    const fechasDisponibles = Array.from(new Set(partidos.map(p => p.fecha_numero))).sort((a, b) => a - b);
    let fechaActual = fechasDisponibles[0] || 1;

    for (const f of fechasDisponibles) {
        const partidosDeLaFecha = partidos.filter(p => p.fecha_numero === f && !p.es_libre && p.id_local && p.id_visitante);
        if (partidosDeLaFecha.length > 0) {
            const algunPendiente = partidosDeLaFecha.some(p => p.estado === 'pendiente');
            fechaActual = f;
            if (algunPendiente) break;
        }
    }
    const parseHorario = (h: string | null) => {
        if (!h) return 9999;
        const limpio = h.toLowerCase().replace(/hs/g, '').trim();
        const partes = limpio.split(/[\.:]/);
        const horas = parseInt(partes[0], 10);
        const minutos = partes[1] ? parseInt(partes[1], 10) : 0;
        return isNaN(horas) ? 9999 : horas * 60 + (isNaN(minutos) ? 0 : minutos);
    };

    const partidosFecha = [...partidos]
        .filter(p => p.fecha_numero === fechaActual && !p.es_libre && p.id_local && p.id_visitante)
        .sort((a, b) => parseHorario(a.turno_horario) - parseHorario(b.turno_horario));

    const getEquipo = (id: string | null) => equipos.find(e => e.id === id);

    return (
        <div style={{
            width: '50vw', height: '100vh', 
            background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            color: 'white', fontFamily: 'Inter, sans-serif', padding: '35px 40px',
            display: 'flex', flexDirection: 'column', alignItems: 'stretch',
            overflow: 'hidden'
        }}>
            <header style={{ marginTop: '50px', marginBottom: '10px', borderLeft: '10px solid #f5a623', paddingLeft: '15px' }}>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1, textTransform: 'uppercase' }}>
                    LIGA DE FÚTBOL DE VETERANOS DE SALADILLO
                </div>
                <div style={{ 
                    background: '#f5a623', padding: '6px 15px', 
                    borderRadius: '4px', marginTop: '15px', 
                    width: '100%', textAlign: 'left' 
                }}>
                    <span style={{ color: 'black', fontSize: '18px', fontWeight: 900, letterSpacing: '1px', textShadow: '2px 2px 4px rgba(255,255,255,0.7)' }}>
                        TORNEO 2026 - HECTOR "TOTI" ERRO - FECHA {fechaActual}
                    </span>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flex: 1, justifyContent: 'center' }}>
                {partidosFecha.map(p => {
                    const el = getEquipo(p.id_local);
                    const ev = getEquipo(p.id_visitante);
                    const zoneColors: Record<string, string> = { 'A': '#3b82f6', 'B': '#22c55e', 'C': '#f97316' };

                    const isPlayoff = fechaActual >= 6;
                    const badgeBg = isPlayoff
                        ? (p.zona === 'A' ? '#d4af37' : '#a0a0a0')
                        : (zoneColors[p.zona] || '#374151');
                    
                    let badgeText = '';
                    if (isPlayoff) {
                        const pid = p.id_partido.toUpperCase();
                        let instancia = '';
                        const minutos = parseHorario(p.turno_horario);

                        if (fechaActual >= 8) {
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
                            display: 'grid', gridTemplateColumns: isPlayoff ? '55px 1fr auto' : '55px 1fr 75px',
                            alignItems: 'center', background: 'rgba(255,255,255,0.15)',
                            padding: isPlayoff ? '6px 15px' : '10px 15px', borderRadius: '6px', 
                            borderLeft: '5px solid #f5a623',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            borderRight: '1px solid rgba(255,255,255,0.1)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            height: isPlayoff ? '11.5%' : '12.5%', gap: '8px'
                        }}>
                            {/* HORARIO */}
                            <div style={{ fontWeight: 800, color: '#f5a623', fontSize: isPlayoff ? '15.5px' : '17.25px' }}>{p.turno_horario}</div>
                            
                            {/* ENCUENTRO */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr', alignItems: 'center', gap: '5px' }}>
                                <div style={{ textAlign: 'right', fontSize: isPlayoff ? '21px' : '25px', fontWeight: 400, textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'Impact, sans-serif' }}>
                                    {el?.nombre}
                                </div>
                                <div style={{ textAlign: 'center', fontSize: p.estado === 'jugado' ? (isPlayoff ? '23px' : '28px') : '14px', fontWeight: 900, color: '#f5a623' }}>
                                    {p.estado === 'jugado' ? `${p.goles_local}-${p.goles_visitante}` : 'VS'}
                                </div>
                                <div style={{ textAlign: 'left', fontSize: isPlayoff ? '21px' : '25px', fontWeight: 400, textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'Impact, sans-serif' }}>
                                    {ev?.nombre}
                                </div>
                            </div>

                            {/* ZONA */}
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ 
                                    background: badgeBg, color: isPlayoff && p.zona === 'A' ? 'black' : 'white', 
                                    textShadow: isPlayoff && p.zona === 'A' ? '2px 2px 4px rgba(255,255,255,1)' : '2px 2px 4px rgba(0,0,0,1)',
                                    padding: isPlayoff ? '4px 10px' : '3.5px 9.5px', borderRadius: '4px', 
                                    fontSize: isPlayoff ? '15px' : '13.8px', fontWeight: 900, letterSpacing: '0.5px', whiteSpace: 'nowrap'
                                }}>
                                    {badgeText}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
