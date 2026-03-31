import type { Equipo, Partido, Zona } from './types';

// ============================================================
// ALGORITMO ROUND-ROBIN para 5 equipos
// ============================================================
// Con 5 equipos impar, se agrega un "bye" para emparejar.
// El algoritmo de berger (round-robin) con 6 posiciones:
// - Posición 0 (bye) fija, las demás rotan.
// - Cada ronda: pos[0] vs pos[5], pos[1] vs pos[4], pos[2] vs pos[3]
// - La posición 0 es el "libre", generando 5 fechas con 2 partidos + 1 libre.

export function generarRoundRobin(equiposZona: Equipo[], zona: Zona): Partido[] {
  const n = 6; // Usamos 6 posiciones (5 equipos + 1 bye ficticio)
  const partidos: Partido[] = [];
  
  // Creamos posiciones: índice 0 = bye ficticio (null), 1-5 = equipos
  const posiciones: (Equipo | null)[] = [null, ...equiposZona];

  for (let fecha = 1; fecha <= 5; fecha++) {
    // Generar emparejamientos de esta ronda
    for (let i = 0; i < n / 2; i++) {
      const eq1 = posiciones[i];
      const eq2 = posiciones[n - 1 - i];

      if (eq1 === null || eq2 === null) {
        // El equipo que juega contra el "bye" descansa
        const equipoLibre = eq1 ?? eq2;
        if (equipoLibre) {
          partidos.push({
            id_partido: `${zona}-F${fecha}-LIBRE`,
            zona,
            fecha_numero: fecha,
            fecha_calendario: null,
            turno_horario: null,
            id_local: null,
            id_visitante: null,
            id_libre: equipoLibre.id,
            goles_local: null,
            goles_visitante: null,
            estado: 'pendiente',
            es_libre: true,
          });
        }
      } else {
        // Partido real — alternamos local/visitante según fecha para equidad
        const esLocal = fecha % 2 === 0 ? i % 2 === 0 : i % 2 !== 0;
        partidos.push({
          id_partido: `${zona}-F${fecha}-M${i + 1}`,
          zona,
          fecha_numero: fecha,
          fecha_calendario: null,
          turno_horario: null,
          id_local: esLocal ? eq1.id : eq2.id,
          id_visitante: esLocal ? eq2.id : eq1.id,
          id_libre: null,
          goles_local: null,
          goles_visitante: null,
          estado: 'pendiente',
          es_libre: false,
        });
      }
    }

    // Rotación berger: fija posición[0], rota el resto en sentido horario
    const ultimo = posiciones[n - 1];
    for (let i = n - 1; i > 1; i--) {
      posiciones[i] = posiciones[i - 1];
    }
    posiciones[1] = ultimo;
  }

  return partidos;
}

export function generarFixtureCompleto(equipos: Equipo[]): Partido[] {
  const zonas: Zona[] = ['A', 'B', 'C'];
  const todosLosPartidos: Partido[] = [];

  for (const zona of zonas) {
    const equiposZona = equipos.filter(e => e.zona === zona);
    if (equiposZona.length === 5) {
      const partidosZona = generarRoundRobin(equiposZona, zona);
      todosLosPartidos.push(...partidosZona);
    }
  }

  return todosLosPartidos;
}

// Genera código automático para un equipo según zona e índice (1-5)
export function generarCodigoEquipo(zona: Zona, indiceEnZona: number): string {
  return `${zona}${indiceEnZona}`;
}

// Horarios disponibles por defecto para turnos
export const HORARIOS_DISPONIBLES = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

// Colores por zona
export const ZONA_COLORES: Record<Zona, { text: string; bg: string; border: string }> = {
  A: { text: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/40' },
  B: { text: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/40' },
  C: { text: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/40' },
};
