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

    const getEquipoId = (name) => {
        const eq = equipos.find(e => e.nombre.toUpperCase() === name.toUpperCase() || e.nombre.toUpperCase().includes(name.toUpperCase()));
        if (!eq) throw new Error("Not found: " + name);
        return eq;
    };

    // Copa de Oro -> Zona 'A'
    // Copa de Plata -> Zona 'B'

    const updates = [
        { local: 'LA CHACARITA', visitante: 'ARGENTINO', zona: 'A' },
        { local: 'LA CAMPANA', visitante: 'APEADERO', zona: 'A' },
        { local: 'RIESTRA', visitante: 'PLAZA ESPAÑA', zona: 'B' },
        { local: 'DEL CARRIL', visitante: 'EL MANGRULLO', zona: 'B' }
    ];

    for (const u of updates) {
        const local = getEquipoId(u.local);
        const visit = getEquipoId(u.visitante);
        
        const { error } = await supabase
            .from('partidos')
            .update({ zona: u.zona })
            .eq('fecha_numero', 7)
            .eq('id_local', local.id)
            .eq('id_visitante', visit.id);
            
        if (error) {
            console.error("Error updating:", error);
        } else {
            console.log(`Updated ${u.local} vs ${u.visitante} to Copa ${u.zona === 'A' ? 'ORO' : 'PLATA'}`);
        }
    }
}

run();
