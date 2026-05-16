/**
 * Generador de mensajes de impacto para las proyecciones de la Tabla General.
 * Cumple con reglas estrictas de vocabulario y condicionales de certeza matemática.
 */

interface SituacionEquipo {
    puesto: number;
    categoria: 'Oro' | 'Plata';
    instancia: 'Semis' | 'Cuartos';
    rival: string;
}

/**
 * Genera un copy profesional para la comunidad de Saladillo.
 * RESTRICCIÓN: No utiliza 'viste', 'che', 'pibe', 'hoy', 'ayer' ni 'mañana'.
 */
export function generarMensajeDeImpacto(
    nombreEquipo: string,
    situacion: SituacionEquipo,
    esDefinitivo: boolean
): string {
    const { puesto, categoria, instancia, rival } = situacion;
    
    // Prefijo obligatorio según certeza matemática
    const prefijo = esDefinitivo ? "" : "Hasta este momento, ";
    
    // Caso: Clasificación directa a Semifinales (Puesto 1)
    if (instancia === 'Semis') {
        if (esDefinitivo) {
            return `${nombreEquipo} se asegura el primer puesto de la Tabla General y el pase directo a las Semifinales de la Copa de Oro.`;
        } else {
            return `${prefijo}${nombreEquipo} sube al primer puesto de la General y clasificaría directamente a las Semifinales de Oro.`;
        }
    }

    // Caso: Cuartos de Final (Puestos 2 al 15)
    const copaTexto = `Copa de ${categoria}`;
    const instanciaTexto = `Cuartos de ${categoria}`;

    if (esDefinitivo) {
        return `${nombreEquipo} confirma su participación en los ${instanciaTexto} y se enfrentará a ${rival}.`;
    } else {
        // Para mensajes provisionales, detallamos el puesto para mayor claridad del impacto
        return `${prefijo}${nombreEquipo} se ubica en el puesto ${puesto} de la General y jugaría los ${instanciaTexto} contra ${rival}.`;
    }
}
