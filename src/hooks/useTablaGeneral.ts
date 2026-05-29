import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import type { Equipo, Partido } from '../types';
import { calcularProyeccionGeneral } from '../lib/tablaGeneral';


/**
 * Hook para obtener la Tabla General proyectada en tiempo real.
 * Se suscribe a cambios en la tabla 'partidos' de Supabase y a eventos de broadcast.
 */
export function useTablaGeneral() {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const { data: eqs, error: errEqs } = await supabase.from('equipos').select('*');
            const { data: pts, error: errPts } = await supabase.from('partidos').select('*');
            
            if (errEqs) throw errEqs;
            if (errPts) throw errPts;

            if (eqs) setEquipos(eqs);
            if (pts) setPartidos(pts as Partido[]);
        } catch (e: any) {
            console.error('Error fetching data for Tabla General:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Suscripción en tiempo real a la tabla partidos y canal de broadcast
        const channel = supabase.channel('proyeccion-general')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'partidos' }, 
                () => fetchData()
            )
            .on('broadcast', { event: 'goles' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // El cálculo se memoriza para que solo se ejecute cuando los datos cambian
    const tablaProyectada = useMemo(() => {
        if (equipos.length === 0) return [];
        return calcularProyeccionGeneral(equipos, partidos);
    }, [equipos, partidos]);

    return {
        tabla: tablaProyectada,
        loading,
        error,
        refetch: fetchData
    };
}
