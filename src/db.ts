import { supabase } from './supabase';
import type { Equipo, Partido, Zona } from './types';

interface EquipoRow {
  id: string;
  nombre: string;
  zona: Zona;
  codigo: string;
  color: string | null;
  color_secundario: string | null;
  color_texto: string | null;
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
}

export async function cargarEquiposDB(): Promise<Equipo[]> {
  const { data, error } = await supabase.from('equipos').select('*').order('zona').order('codigo');
  if (error) throw new Error(`Error al cargar equipos: ${error.message}`);
  return (data as EquipoRow[]).map(r => ({
    id: r.id, nombre: r.nombre, zona: r.zona, codigo: r.codigo, color: r.color, color_secundario: r.color_secundario, color_texto: r.color_texto
  }));
}

export async function insertarEquipoDB(equipo: Equipo): Promise<Equipo> {
  const { data, error } = await supabase.from('equipos').insert({
    id: equipo.id.startsWith('eq-') ? undefined : equipo.id,
    nombre: equipo.nombre, zona: equipo.zona, codigo: equipo.codigo,
    color: equipo.color, color_secundario: equipo.color_secundario, color_texto: equipo.color_texto
  }).select().single();
  if (error) throw new Error(`Error al insertar equipo: ${error.message}`);
  const r = data as EquipoRow;
  return { id: r.id, nombre: r.nombre, zona: r.zona, codigo: r.codigo, color: r.color, color_secundario: r.color_secundario, color_texto: r.color_texto };
}

export async function actualizarEquipoDB(id: string, campos: Partial<Equipo>): Promise<void> {
  const { error } = await supabase.from('equipos').update({
    nombre: campos.nombre, color: campos.color, color_secundario: campos.color_secundario, color_texto: campos.color_texto,
  }).eq('id', id);
  if (error) throw new Error(`Error al actualizar equipo: ${error.message}`);
}

export async function cargarPartidosDB(): Promise<Partido[]> {
  const { data, error } = await supabase.from('partidos').select('*').order('fecha_numero').order('turno_horario');
  if (error) throw new Error(`Error al cargar partidos: ${error.message}`);
  return (data as PartidoRow[]).map(r => ({
    id_partido: r.id_partido, zona: r.zona, fecha_numero: r.fecha_numero, fecha_calendario: r.fecha_calendario,
    turno_horario: r.turno_horario, id_local: r.id_local, id_visitante: r.id_visitante, id_libre: r.id_libre,
    goles_local: r.goles_local, goles_visitante: r.goles_visitante, estado: r.estado, es_libre: r.es_libre
  }));
}

export async function insertarPartidosBatchDB(partidos: Partido[]): Promise<void> {
  if (partidos.length === 0) return;
  const rows = partidos.map(p => ({
    id_partido: p.id_partido, zona: p.zona, fecha_numero: p.fecha_numero, fecha_calendario: p.fecha_calendario,
    turno_horario: p.turno_horario, id_local: p.id_local, id_visitante: p.id_visitante, id_libre: p.id_libre,
    goles_local: p.goles_local, goles_visitante: p.goles_visitante, estado: p.estado, es_libre: p.es_libre
  }));
  const { error } = await supabase.from('partidos').upsert(rows);
  if (error) throw new Error(`Error al sincronizar partidos: ${error.message}`);
}

export async function actualizarPartidoDB(id_partido: string, campos: Partial<Partido>): Promise<void> {
  const { error } = await supabase.from('partidos').update(campos).eq('id_partido', id_partido);
  if (error) throw new Error(`Error al actualizar partido: ${error.message}`);
}

export async function limpiarPartidosDB(): Promise<void> {
  const { error } = await supabase.from('partidos').delete().neq('id_partido', '');
  if (error) throw new Error(`Error al limpiar partidos: ${error.message}`);
}
