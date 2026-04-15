// ============================================================
// TIPOS DE DATOS - Liga Veteranos Saladillo
// ============================================================

export type Zona = 'A' | 'B' | 'C';

export interface Equipo {
  id: string;
  nombre: string;
  zona: Zona;
  /** Nomenclatura automática: A1, A2, B3, etc. */
  codigo: string;
  /** Color principal del equipo (hex) */
  color?: string | null;
  /** Color secundario para gradientes (hex) */
  color_secundario?: string | null;
  /** Color de texto contrastante (hex) */
  color_texto?: string | null;
}

export interface Partido {
  id_partido: string;
  zona: Zona;
  /** Número de fecha dentro de la zona (1-5) */
  fecha_numero: number;
  /** Fecha calendario asignada (YYYY-MM-DD) */
  fecha_calendario: string | null;
  /** Turno/horario (ej. "09:00", "11:00") */
  turno_horario: string | null;
  /** ID del equipo local (null si es fecha libre) */
  id_local: string | null;
  /** ID del equipo visitante (null si es fecha libre) */
  id_visitante: string | null;
  /** ID del equipo que descansa (null si hay partido) */
  id_libre: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: 'pendiente' | 'jugado';
  /** Indica si es un slot de descanso (no es un partido real) */
  es_libre: boolean;
}

export type TabActiva = 'equipos' | 'fixture' | 'cronograma';

export interface EstadoApp {
  equipos: Equipo[];
  partidos: Partido[];
  tabActiva: TabActiva;
}
