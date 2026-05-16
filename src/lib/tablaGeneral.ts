import type { Equipo, Partido, Zona } from '../types';

export interface EquipoProyectado {
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
    posicion: number;
    zona: string;
    cruce?: string;
    rivalNombre?: string;
    categoria: 'Oro' | 'Plata';
    instancia: 'Semis' | 'Cuartos';
}

/**
 * Calcula la proyección de la Tabla General para los 15 equipos.
 * Criterio de desempate: 1) Puntos, 2) Diferencia de Gol.
 */
export function calcularProyeccionGeneral(equipos: Equipo[], partidos: Partido[]): EquipoProyectado[] {
    const tabla: Record<string, Omit<EquipoProyectado, 'posicion' | 'cruce' | 'categoria' | 'instancia'>> = {};

    // Inicializar tabla con todos los equipos
    equipos.forEach(e => {
        tabla[e.id] = {
            id: e.id,
            nombre: e.nombre,
            pj: 0,
            pg: 0,
            pe: 0,
            pp: 0,
            gf: 0,
            gc: 0,
            dg: 0,
            pts: 0,
            zona: e.zona
        };
    });

    // Procesar partidos (Fechas 1 a 5)
    // Se asume que los partidos de Fecha 5 tienen goles cargados aunque el estado sea 'pendiente'
    partidos.forEach(p => {
        if (!p.id_local || !p.id_visitante) return;
        // Solo procesar hasta la fecha 5 (Fase de Grupos)
        if (p.fecha_numero > 5) return;
        
        // Solo procesar partidos que tienen goles cargados (hasta este momento)
        if (p.goles_local === null || p.goles_visitante === null) return;

        const gl = p.goles_local;
        const gv = p.goles_visitante;

        // Stats Local
        if (tabla[p.id_local]) {
            const t = tabla[p.id_local];
            t.pj++;
            t.gf += gl;
            t.gc += gv;
            if (gl > gv) { t.pg++; t.pts += 3; }
            else if (gl === gv) { t.pe++; t.pts += 1; }
            else t.pp++;
        }

        // Stats Visitante
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

    // Convertir a array, calcular DG y ordenar
    const equiposOrdenados = Object.values(tabla)
        .map(t => ({
            ...t,
            dg: t.gf - t.gc
        }))
        .sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return b.dg - a.dg;
        })
        .map((t, index) => ({
            ...t,
            posicion: index + 1
        })) as EquipoProyectado[];

    // Asignar categorías y cruces
    equiposOrdenados.forEach((equipo, i) => {
        const pos = equipo.posicion;
        
        if (pos === 1) {
            equipo.categoria = 'Oro';
            equipo.instancia = 'Semis';
            equipo.cruce = 'Pasa directo a Semis';
        } else if (pos >= 2 && pos <= 7) {
            equipo.categoria = 'Oro';
            equipo.instancia = 'Cuartos';
            // 2 vs 7, 3 vs 6, 4 vs 5
            const rivalPos = 9 - pos;
            const rival = equiposOrdenados.find(e => e.posicion === rivalPos);
            equipo.rivalNombre = rival?.nombre || '?';
            equipo.cruce = `Cuartos Oro vs ${equipo.rivalNombre}`;
        } else if (pos >= 8 && pos <= 15) {
            equipo.categoria = 'Plata';
            equipo.instancia = 'Cuartos';
            // 8 vs 15, 9 vs 14, 10 vs 13, 11 vs 12
            const rivalPos = 23 - pos;
            const rival = equiposOrdenados.find(e => e.posicion === rivalPos);
            equipo.rivalNombre = rival?.nombre || '?';
            equipo.cruce = `Cuartos Plata vs ${equipo.rivalNombre}`;
        }
    });

    return equiposOrdenados;
}

export interface ImpactoEquipo {
    id: string;
    nombre: string;
    posicionPrevia: number;
    posicionNueva: number;
    categoriaPrevia: 'Oro' | 'Plata';
    categoriaNueva: 'Oro' | 'Plata';
    instanciaPrevia: 'Semis' | 'Cuartos';
    instanciaNueva: 'Semis' | 'Cuartos';
    rivalPrevio: string;
    rivalNuevo: string;
    huboCambioSignificativo: boolean;
}

export interface ImpactoGol {
    equipoGoleador: ImpactoEquipo;
    equipoRecibioGol: ImpactoEquipo;
}

/**
 * Compara dos estados de la Tabla General para determinar el impacto de un gol.
 */
export function calcularImpactoDeGol(
    tablaAntes: EquipoProyectado[],
    tablaDespues: EquipoProyectado[],
    idEquipoGoleador: string,
    idEquipoRecibioGol: string
): ImpactoGol | null {
    const obtenerImpacto = (id: string): ImpactoEquipo | null => {
        const antes = tablaAntes.find(e => e.id === id);
        const despues = tablaDespues.find(e => e.id === id);

        if (!antes || !despues) return null;

        const huboCambioSignificativo = 
            antes.posicion !== despues.posicion || 
            antes.categoria !== despues.categoria || 
            antes.instancia !== despues.instancia ||
            antes.rivalNombre !== despues.rivalNombre;

        return {
            id: id,
            nombre: antes.nombre,
            posicionPrevia: antes.posicion,
            posicionNueva: despues.posicion,
            categoriaPrevia: antes.categoria,
            categoriaNueva: despues.categoria,
            instanciaPrevia: antes.instancia,
            instanciaNueva: despues.instancia,
            rivalPrevio: antes.rivalNombre || 'Ninguno',
            rivalNuevo: despues.rivalNombre || 'Ninguno',
            huboCambioSignificativo
        };
    };

    const impactoGoleador = obtenerImpacto(idEquipoGoleador);
    const impactoRecibio = obtenerImpacto(idEquipoRecibioGol);

    if (!impactoGoleador || !impactoRecibio) return null;

    return {
        equipoGoleador: impactoGoleador,
        equipoRecibioGol: impactoRecibio
    };
}
