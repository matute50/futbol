import React, { useEffect, useState } from 'react';
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

export const OverlayStandings: React.FC = () => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const { data: eqs } = await supabase.from('equipos').select('*');
        const { data: pts } = await supabase.from('partidos').select('*').eq('estado', 'jugado');
        if (eqs) setEquipos(eqs);
        if (pts) setPartidos(pts as any[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('broadcast-standings').on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, fetchData).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const query = new URLSearchParams(window.location.search);
    const zonaParam = query.get('zona') as 'A' | 'B' | 'C' | null;

    if (loading) return null;

    const calcularTabla = (zona: 'A' | 'B' | 'C'): FilaTabla[] => {
        const eqsZona = equipos.filter(e => e.zona === zona);
        const tabla: Record<string, FilaTabla> = {};

        eqsZona.forEach(e => {
            tabla[e.id] = { 
                id: e.id, nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
                color: e.color || '#333'
            };
        });

        partidos.filter(p => p.zona === zona).forEach(p => {
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

    const RenderZona = ({ zona }: { zona: 'A' | 'B' | 'C' }) => {
        const rows = calcularTabla(zona);
        const zoneColors: Record<string, string> = {
            'A': '#3b82f6',
            'B': '#22c55e',
            'C': '#f97316'
        };
        const color = zoneColors[zona];

        return (
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
                            {rows.map((r, idx) => (
                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '8px 20px 8px 25px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '20px' }}>
                                            <span style={{ opacity: 0.4 }}>{idx + 1}</span>
                                            <span style={{ fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{r.nombre}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '10px', color: '#f5a623', fontWeight: 700 }}>{r.pj}</td>
                                    <td style={{ textAlign: 'center', padding: '10px', color: '#f5a623', fontWeight: 700 }}>{r.pg}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 900, color: color, padding: '10px' }}>{r.pts}</td>
                                    <td style={{ textAlign: 'center', padding: '10px', color: '#f5a623', fontWeight: 700 }}>{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // VISTA INDIVIDUAL (50% ANCHO)
    if (zonaParam) {
        return (
            <div style={{
                width: '50vw', height: '100vh', 
                background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                color: 'white', fontFamily: 'Oswald, sans-serif', padding: '70px 40px 40px 40px',
                display: 'flex', flexDirection: 'column'
            }}>
                <header style={{ marginBottom: '30px', borderLeft: '10px solid #f5a623', paddingLeft: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
                        LIGA DE FÚTBOL DE VETERANOS DE SALADILLO
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'white' }}>TABLA DE POSICIONES</div>
                </header>
                <RenderZona zona={zonaParam} />
            </div>
        );
    }

    // VISTA GENERAL (FULL SCREEN)
    return (
        <div style={{
            width: '100vw', height: '100vh', 
            background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 100%)',
            color: 'white', fontFamily: 'Oswald, sans-serif', padding: '70px 40px 40px 40px',
            display: 'flex', flexDirection: 'column'
        }}>
            <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '48px', color: '#f5a623', textTransform: 'uppercase', margin: 0 }}>TABLA DE POSICIONES</h1>
                <p style={{ opacity: 0.5, letterSpacing: '2px' }}>LIGA DE VETERANOS SALADILLO</p>
            </header>

            <div style={{ display: 'flex', gap: '30px', flex: 1 }}>
                <RenderZona zona="A" />
                <RenderZona zona="B" />
                <RenderZona zona="C" />
            </div>
        </div>
    );
};
