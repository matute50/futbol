import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';
import { calcularProyeccionGeneral } from '../lib/tablaGeneral';



export const OverlayLiveStandings: React.FC = () => {
    const [currentZona, setCurrentZona] = useState<'A' | 'B' | 'C' | null>(null);
    const [proyeccion, setProyeccion] = useState<any[]>([]);
    

    const [loading, setLoading] = useState(true);
    const [scorerId, setScorerId] = useState<string | null>(null);
    
    // Refs para evitar problemas con cierres (closures) y manejar timers
    const partidosRef = useRef<Partido[]>([]);
    const equiposRef = useRef<Equipo[]>([]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*');
        if (eqs) {
            equiposRef.current = eqs as Equipo[];
        }
        if (pts) {
            const ptsData = pts as Partido[];
            partidosRef.current = ptsData;
            
            const latestMatch = [...ptsData].sort((a, b) => 
                new Date((b as any).updated_at || 0).getTime() - new Date((a as any).updated_at || 0).getTime()
            )[0];
            
            const zonaToUse = latestMatch?.zona || currentZona || 'A';
            setCurrentZona(zonaToUse);
            setProyeccion(calcularProyeccionGeneral(equiposRef.current, ptsData));
        }
        setLoading(false);
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
                }
            })
            .on('broadcast', { event: 'goles' }, ({ payload }) => {
                const { id_partido, goles_local, goles_visitante } = payload;
                
                const match = partidosRef.current.find(p => p.id_partido === id_partido);
                if (!match) return;

                const prevL = match.goles_local ?? 0;
                const prevV = match.goles_visitante ?? 0;
                let idGoleador = '';
                if (goles_local > prevL) {
                    idGoleador = match.id_local || '';
                } else if (goles_visitante > prevV) {
                    idGoleador = match.id_visitante || '';
                }

                const zona = match.zona;
                setCurrentZona(zona);
                
                const ptsAfter: Partido[] = partidosRef.current.map(p => 
                    p.id_partido === id_partido 
                    ? { ...p, goles_local, goles_visitante, estado: 'pendiente' as const }
                    : p
                );



                setProyeccion(calcularProyeccionGeneral(equiposRef.current, ptsAfter));
                partidosRef.current = ptsAfter;

                if (idGoleador) {
                    setScorerId(idGoleador);
                    setTimeout(() => setScorerId(null), 5000);
                }
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channel);
            timers.current.forEach(clearTimeout);
        };
    }, []);

    if (loading) return null;

    const abrev = (nombre: string) => nombre.toUpperCase().replace('PLAZA ESPAÑA', 'P. ESPAÑA');

    return (
        <>
            <style>{`
                @keyframes scorer-ping-pong {
                    0%, 100% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.2); filter: brightness(2) drop-shadow(0 0 15px #f5a623); color: #f5a623; }
                }
                .anim-scorer {
                    animation: scorer-ping-pong 0.8s ease-in-out infinite;
                    color: #f5a623 !important;
                    font-weight: 900 !important;
                    z-index: 10;
                    position: relative;
                }
            `}</style>

            {/* REPORTE HORIZONTAL DE CRUCES DE PLAYOFFS */}
            <div 
                style={{
                position: 'fixed', bottom: '15px', left: '15px', right: '15px',
                height: '75px',
                background: 'rgba(5, 10, 15, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderLeft: '10px solid #f5a623',
                borderRadius: '12px',
                color: 'white', fontFamily: 'Inter, sans-serif',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                padding: '0 25px',
                justifyContent: 'space-between'
            }}>
                {/* Título e Info General */}
                <div style={{ minWidth: '130px', paddingRight: '20px', borderRight: '1px solid rgba(245,166,35,0.3)' }}>
                    <div style={{ fontFamily: 'Impact, sans-serif', fontSize: '18px', color: '#f5a623', textTransform: 'uppercase', lineHeight: 1 }}>CRUCES</div>
                    <div style={{ fontFamily: 'Impact, sans-serif', fontSize: '18px', color: 'white', textTransform: 'uppercase', lineHeight: 1 }}>PROYECTADOS</div>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#f5a623', letterSpacing: '1px', marginTop: '4px' }}>
                        HASTA ESTE MOMENTO
                    </div>
                </div>

                {/* ZONA SEMIFINAL (PUNTERO) */}
                <div style={{ 
                    flex: '0 0 160px', 
                    textAlign: 'center', 
                    padding: '0 15px',
                    borderRight: '1px solid rgba(245,166,35,0.3)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#f5a623', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        DIRECTO A SEMIS
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#f5a623', textTransform: 'uppercase', lineHeight: 1.2, marginBottom: '4px' }}>
                        COPA DE ORO
                    </div>
                    <div className={scorerId === proyeccion.find(e => e.posicion === 1)?.id ? 'anim-scorer' : ''} style={{ fontFamily: 'Impact, sans-serif', fontSize: '20px', textTransform: 'uppercase', color: 'white', whiteSpace: 'nowrap' }}>
                        {abrev(proyeccion.find(e => e.posicion === 1)?.nombre || 'POR DEFINIR')}
                    </div>
                </div>

                {/* ZONA CUARTOS ORO */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    justifyContent: 'space-around', 
                    alignItems: 'center',
                    padding: '0 20px',
                    borderRight: '1px solid rgba(245,166,35,0.3)',
                    height: '100%'
                }}>
                    <div style={{ 
                        fontSize: '9px', fontWeight: 900, color: '#f5a623', 
                        transform: 'rotate(-90deg)', whiteSpace: 'nowrap', 
                        width: '75px', height: '30px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        marginLeft: '-35px', lineHeight: 1
                    }}>
                        <div style={{ fontSize: '10px' }}>CUARTOS</div>
                        <div style={{ fontSize: '11px' }}>ORO</div>
                    </div>
                    {[2, 3, 4].map(pos => {
                        const eq = proyeccion.find(e => e.posicion === pos);
                        if (!eq) return null;
                        return (
                            <div key={pos} style={{ textAlign: 'center' }}>
                                <div style={{ color: '#f5a623', fontSize: '9px', fontWeight: 900, marginBottom: '2px' }}>{pos}° vs {9-pos}°</div>
                                <div className={scorerId === eq.id ? 'anim-scorer' : ''} style={{ fontFamily: 'Impact, sans-serif', fontSize: '16px', textTransform: 'uppercase', color: 'white' }}>
                                    {abrev(eq.nombre)}
                                </div>
                                <div className={scorerId === proyeccion.find(e => e.posicion === (pos <= 7 ? 9 - pos : 23 - pos))?.id ? 'anim-scorer' : ''} style={{ fontFamily: 'Impact, sans-serif', fontSize: '16px', textTransform: 'uppercase', color: 'white' }}>
                                    <span style={{ color: '#f5a623', textTransform: 'lowercase', fontSize: '12px' }}>vs</span> {abrev(eq.rivalNombre || '')}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ZONA CUARTOS PLATA */}
                <div style={{ 
                    flex: 1.3, 
                    display: 'flex', 
                    justifyContent: 'space-around', 
                    alignItems: 'center',
                    paddingLeft: '20px',
                    height: '100%'
                }}>
                    <div style={{ 
                        fontSize: '9px', fontWeight: 900, color: '#f5a623', 
                        transform: 'rotate(-90deg)', whiteSpace: 'nowrap', 
                        width: '75px', height: '30px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        marginLeft: '-35px', lineHeight: 1
                    }}>
                        <div style={{ fontSize: '10px' }}>CUARTOS</div>
                        <div style={{ fontSize: '11px' }}>PLATA</div>
                    </div>
                    {[8, 9, 10, 11].map(pos => {
                        const eq = proyeccion.find(e => e.posicion === pos);
                        if (!eq) return null;
                        return (
                            <div key={pos} style={{ textAlign: 'center' }}>
                                <div style={{ color: '#f5a623', fontSize: '9px', fontWeight: 900, marginBottom: '2px' }}>{pos}° vs {23-pos}°</div>
                                <div className={scorerId === eq.id ? 'anim-scorer' : ''} style={{ fontFamily: 'Impact, sans-serif', fontSize: '16px', textTransform: 'uppercase', color: 'white' }}>
                                    {abrev(eq.nombre)}
                                </div>
                                <div className={scorerId === proyeccion.find(e => e.posicion === (pos <= 7 ? 9 - pos : 23 - pos))?.id ? 'anim-scorer' : ''} style={{ fontFamily: 'Impact, sans-serif', fontSize: '16px', textTransform: 'uppercase', color: 'white' }}>
                                    <span style={{ color: '#f5a623', textTransform: 'lowercase', fontSize: '12px' }}>vs</span> {abrev(eq.rivalNombre || '')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
