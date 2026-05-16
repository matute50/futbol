import type { Equipo, Partido } from '../types';
import type { EquipoProyectado } from './tablaGeneral';
import { calcularProyeccionGeneral } from './tablaGeneral';

export interface CertezaPosicion {
    id: string;
    nombre: string;
    esDefinitivo: boolean;
    motivo?: string;
}

export interface EvaluacionCerteza {
    equipoGoleador: CertezaPosicion;
    equipoRecibioGol: CertezaPosicion;
}

/**
 * Evalúa si la posición y cruces de un equipo son matemáticamente definitivos
 * considerando todos los resultados posibles de los partidos pendientes de la Fecha 5.
 */
export function evaluarCertezaDePosicion(
    equipos: Equipo[],
    partidos: Partido[],
    idEquipoGoleador: string,
    idEquipoRecibioGol: string
): EvaluacionCerteza {
    // 1. Identificar partidos pendientes de la Fecha 5
    const partidosPendientes = partidos.filter(p => p.fecha_numero === 5 && p.estado !== 'jugado');

    // 2. Función para evaluar un equipo específico
    const evaluarEquipo = (idTarget: string): CertezaPosicion => {
        const equipo = equipos.find(e => e.id === idTarget);
        if (!equipo) return { id: idTarget, nombre: '?', esDefinitivo: false };

        // Proyección actual (estado base)
        const proyeccionActual = calcularProyeccionGeneral(equipos, partidos);
        const estadoBase = proyeccionActual.find(e => e.id === idTarget);
        if (!estadoBase) return { id: idTarget, nombre: equipo.nombre, esDefinitivo: false };

        // Si hay demasiados partidos pendientes, no intentamos simulación exhaustiva 
        // (Aunque en una fecha de 15 equipos nunca habrá más de 7 partidos)
        if (partidosPendientes.length > 8) {
            return { id: idTarget, nombre: equipo.nombre, esDefinitivo: false, motivo: 'Demasiadas combinaciones pendientes' };
        }

        // 3. Simulación exhaustiva de todos los resultados posibles (3^N)
        // Resultados posibles por partido: [Gana Local, Empate, Gana Visitante]
        const resultadosPosibles = [
            { gl: 1, gv: 0 }, // Gana Local
            { gl: 1, gv: 1 }, // Empate
            { gl: 0, gv: 1 }  // Gana Visitante
        ];

        let esDefinitivo = true;
        const totalCombinaciones = Math.pow(3, partidosPendientes.length);
        
        // Usamos un bucle para generar todas las combinaciones
        for (let i = 0; i < totalCombinaciones; i++) {
            let tempIdx = i;
            const partidosSimulados = [...partidos];
            
            // Reemplazar resultados de pendientes para esta combinación
            partidosPendientes.forEach(pOriginal => {
                const outcomeIdx = tempIdx % 3;
                tempIdx = Math.floor(tempIdx / 3);
                
                const resultado = resultadosPosibles[outcomeIdx];
                const pIdx = partidosSimulados.findIndex(ps => ps.id_partido === pOriginal.id_partido);
                
                partidosSimulados[pIdx] = {
                    ...pOriginal,
                    goles_local: resultado.gl,
                    goles_visitante: resultado.gv,
                    estado: 'jugado' // Lo marcamos como jugado para la proyección
                };
            });

            // Calcular tabla con esta combinación
            const tablaSimulada = calcularProyeccionGeneral(equipos, partidosSimulados);
            const equipoSimulado = tablaSimulada.find(e => e.id === idTarget);

            // Verificar si cambió algo crítico respecto al estado base
            if (
                !equipoSimulado ||
                equipoSimulado.categoria !== estadoBase.categoria ||
                equipoSimulado.instancia !== estadoBase.instancia ||
                equipoSimulado.rivalNombre !== estadoBase.rivalNombre
            ) {
                esDefinitivo = false;
                break; // Con una sola variación basta para decir que no es definitivo
            }
        }

        return {
            id: idTarget,
            nombre: equipo.nombre,
            esDefinitivo,
            motivo: esDefinitivo ? 'Matemáticamente asegurado' : 'Sujeto a resultados restantes'
        };
    };

    return {
        equipoGoleador: evaluarEquipo(idEquipoGoleador),
        equipoRecibioGol: evaluarEquipo(idEquipoRecibioGol)
    };
}
