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

    // Agrupar por fecha
    const fechas = Array.from(new Set(partidos.map(p => p.fecha_numero))).sort((a,b) => a-b);
    
    // Por ahora mostramos la Fecha 1 o la más reciente
    const fechaActual = 1; 
    const hOrder = ['09.00', '10.30', '12.00', '13.30', '15.00', '16.30'];
    const partidosFecha = partidos
        .filter(p => p.fecha_numero === fechaActual && !p.es_libre && p.id_local && p.id_visitante)
        .sort((a,b) => hOrder.indexOf(a.turno_horario || '') - hOrder.indexOf(b.turno_horario || ''));

    const getEquipo = (id: string | null) => equipos.find(e => e.id === id);

    return (
        <div style={{
            width: '50vw', height: '100vh', 
            background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            color: 'white', fontFamily: 'Oswald, sans-serif', padding: '35px 40px',
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
                    <span style={{ color: 'black', fontSize: '18px', fontWeight: 900, letterSpacing: '1px', textShadow: 'none' }}>
                        TORNEO 2026 - HECTOR "TOTI" ERRO - FECHA {fechaActual}
                    </span>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flex: 1, justifyContent: 'center' }}>
                {partidosFecha.map(p => {
                    const el = getEquipo(p.id_local);
                    const ev = getEquipo(p.id_visitante);
                    const zoneColors: Record<string, string> = { 'A': '#3b82f6', 'B': '#22c55e', 'C': '#f97316' };
                    return (
                        <div key={p.id_partido} style={{
                            display: 'grid', gridTemplateColumns: '55px 1fr 75px',
                            alignItems: 'center', background: 'rgba(255,255,255,0.15)',
                            padding: '10px 15px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                            height: '12.5%', gap: '8px'
                        }}>
                            {/* HORARIO */}
                            <div style={{ fontWeight: 800, color: '#f5a623', fontSize: '15px' }}>{p.turno_horario}</div>
                            
                            {/* ENCUENTRO */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr', alignItems: 'center', gap: '5px' }}>
                                <div style={{ textAlign: 'right', fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    {el?.nombre}
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 900, color: p.estado === 'jugado' ? '#f5a623' : 'rgba(255,255,255,0.4)' }}>
                                    {p.estado === 'jugado' ? `${p.goles_local}-${p.goles_visitante}` : 'VS'}
                                </div>
                                <div style={{ textAlign: 'left', fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    {ev?.nombre}
                                </div>
                            </div>

                            {/* ZONA */}
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ 
                                    background: zoneColors[p.zona], color: 'white', 
                                    padding: '3px 8px', borderRadius: '4px', 
                                    fontSize: '12px', fontWeight: 900, letterSpacing: '0.5px', whiteSpace: 'nowrap'
                                }}>
                                    ZONA {p.zona}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
