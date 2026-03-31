import { supabase } from './supabase';
import type { Equipo, Partido, Zona } from './types';

// ============================================================
// TIPOS para Supabase (columnas de BD)
// ============================================================
interface EquipoRow {
  id: string;
  nombre: string;
  zona: Zona;
  codigo: string;
  created_at: string;
  updated_at: string;
}

interface PartidoRow {
  id_partido: string;
  zona: Zona;
  fecha_numero: number;
  fecha_calendario: string | null;
  turno_horario: string | null;
  id_local: string | null;
  id_visitante: string | null;
  id_libre: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: 'pendiente' | 'jugado';
  es_libre: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// EQUIPOS
// ============================================================

export async function cargarEquiposDB(): Promise<Equipo[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .order('zona')
    .order('codigo');

  if (error) throw new Error(`Error al cargar equipos: ${error.message}`);

  return (data as EquipoRow[]).map(r => ({
    id: r.id,
    nombre: r.nombre,
    zona: r.zona,
    codigo: r.codigo,
  }));
}

export async function insertarEquipoDB(equipo: Equipo): Promise<Equipo> {
  const { data, error } = await supabase
    .from('equipos')
    .insert({
      id: equipo.id.startsWith('eq-') ? undefined : equipo.id, // Dejar que Supabase genere el UUID
      nombre: equipo.nombre,
      zona: equipo.zona,
      codigo: equipo.codigo,
    })
    .select()
    .single();

  if (error) throw new Error(`Error al insertar equipo: ${error.message}`);

  const r = data as EquipoRow;
  return { id: r.id, nombre: r.nombre, zona: r.zona, codigo: r.codigo };
}

export async function actualizarCodigosDB(equipos: Equipo[]): Promise<void> {
  // Actualiza los códigos de todos los equipos en un batch
  const updates = equipos.map(e =>
    supabase
      .from('equipos')
      .update({ codigo: e.codigo })
      .eq('id', e.id)
  );
  await Promise.all(updates);
}

export async function eliminarEquipoDB(id: string): Promise<void> {
  const { error } = await supabase.from('equipos').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar equipo: ${error.message}`);
}

export async function limpiarEquiposDB(): Promise<void> {
  const { error } = await supabase.from('equipos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`Error al limpiar equipos: ${error.message}`);
}

// ============================================================
// PARTIDOS
// ============================================================

export async function cargarPartidosDB(): Promise<Partido[]> {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .order('zona')
    .order('fecha_numero');

  if (error) throw new Error(`Error al cargar partidos: ${error.message}`);

  return (data as PartidoRow[]).map(r => ({
    id_partido: r.id_partido,
    zona: r.zona,
    fecha_numero: r.fecha_numero,
    fecha_calendario: r.fecha_calendario,
    turno_horario: r.turno_horario,
    id_local: r.id_local,
    id_visitante: r.id_visitante,
    id_libre: r.id_libre,
    goles_local: r.goles_local,
    goles_visitante: r.goles_visitante,
    estado: r.estado,
    es_libre: r.es_libre,
  }));
}

export async function insertarPartidosBatchDB(partidos: Partido[]): Promise<void> {
  // Primero limpiamos todos los partidos anteriores
  await supabase.from('partidos').delete().neq('id_partido', '');

  if (partidos.length === 0) return;

  const rows = partidos.map(p => ({
    id_partido: p.id_partido,
    zona: p.zona,
    fecha_numero: p.fecha_numero,
    fecha_calendario: p.fecha_calendario,
    turno_horario: p.turno_horario,
    id_local: p.id_local,
    id_visitante: p.id_visitante,
    id_libre: p.id_libre,
    goles_local: p.goles_local,
    goles_visitante: p.goles_visitante,
    estado: p.estado,
    es_libre: p.es_libre,
  }));

  const { error } = await supabase.from('partidos').insert(rows);
  if (error) throw new Error(`Error al insertar partidos: ${error.message}`);
}

export async function actualizarPartidoDB(
  id_partido: string,
  campos: Partial<Pick<Partido, 'fecha_calendario' | 'turno_horario' | 'goles_local' | 'goles_visitante' | 'estado'>>
): Promise<void> {
  const { error } = await supabase
    .from('partidos')
    .update(campos)
    .eq('id_partido', id_partido);

  if (error) throw new Error(`Error al actualizar partido ${id_partido}: ${error.message}`);
}

export async function limpiarPartidosDB(): Promise<void> {
  const { error } = await supabase.from('partidos').delete().neq('id_partido', '');
  if (error) throw new Error(`Error al limpiar partidos: ${error.message}`);
}
