import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    const { data: equipos, error: errEq } = await supabase.from('equipos').select('*');
    if (errEq) {
        console.error("Error fetching equipos:", errEq);
        return;
    }

    const matches = [
        { local: 'RIESTRA', visitante: 'PLAZA ESPAÑA', time: '10.00' },
        { local: 'LA CAMPANA', visitante: 'APEADERO', time: '11.30' },
        { local: 'DEL CARRIL', visitante: 'EL MANGRULLO', time: '13.00' },
        { local: 'LA CHACARITA', visitante: 'ARGENTINO', time: '14.30' }
    ];

    const getEquipoId = (name) => {
        const eq = equipos.find(e => e.nombre.toUpperCase() === name.toUpperCase() || e.nombre.toUpperCase().includes(name.toUpperCase()));
        if (!eq) throw new Error("Not found: " + name);
        return eq;
    };

    const nuevosPartidos = matches.map((m, index) => {
        const local = getEquipoId(m.local);
        const visit = getEquipoId(m.visitante);
        const copa = local.zona === 'A' ? 'ORO' : 'PLATA';

        return {
            id_partido: `S-${copa}-M${index+1}`,
            zona: local.zona,
            fecha_numero: 7,
            fecha_calendario: null,
            turno_horario: m.time,
            id_local: local.id,
            id_visitante: visit.id,
            id_libre: null,
            goles_local: null,
            goles_visitante: null,
            estado: 'pendiente',
            es_libre: false
        };
    });

    // Delete existing fecha 7 just in case
    await supabase.from('partidos').delete().eq('fecha_numero', 7);

    const { error } = await supabase.from('partidos').insert(nuevosPartidos);
    if (error) {
        console.error("Error inserting partidos:", error);
    } else {
        console.log("Successfully inserted Semifinales as fecha_numero: 7");
    }
}

run();
