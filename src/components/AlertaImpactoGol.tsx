import React, { useEffect, useState } from 'react';
import { generarMensajeDeImpacto } from '../lib/mensajes';

interface Props {
    impacto: any; // ImpactoGol
    certeza: any; // EvaluacionCerteza
    visible: boolean;
    onClose: () => void;
}

export const AlertaImpactoGol: React.FC<Props> = ({ impacto, certeza, visible, onClose }) => {
    const [render, setRender] = useState(visible);

    useEffect(() => {
        if (visible) setRender(true);
        else {
            const timer = setTimeout(() => setRender(false), 500);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!render || !impacto) return null;

    const renderPanel = (type: 'goleador' | 'recibio') => {
        const data = type === 'goleador' ? impacto.equipoGoleador : impacto.equipoRecibioGol;
        const cert = type === 'goleador' ? certeza.equipoGoleador : certeza.equipoRecibioGol;
        
        const esDefinitivo = cert?.esDefinitivo || false;
        const subio = data.posicionNueva < data.posicionPrevia;
        const bajo = data.posicionNueva > data.posicionPrevia;

        const statusBadge = esDefinitivo 
            ? "bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]" 
            : "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]";
        
        const panelBg = esDefinitivo
            ? "bg-green-950/20 border-green-500/30"
            : "bg-yellow-950/10 border-yellow-500/20";

        const mensaje = generarMensajeDeImpacto(
            data.nombre,
            {
                puesto: data.posicionNueva,
                categoria: data.categoriaNueva,
                instancia: data.instanciaNueva,
                rival: data.rivalNuevo
            },
            esDefinitivo
        );

        return (
            <div className={`flex-1 p-6 rounded-2xl border-2 backdrop-blur-xl transition-all duration-700 ${panelBg}`}>
                <div className="flex justify-between items-center mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBadge}`}>
                        {esDefinitivo ? "CLASIFICADO" : "PROYECCIÓN EN VIVO"}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-white/40 text-[10px] font-bold">PUESTO</span>
                        <div className="flex items-center text-3xl font-black text-white">
                            {data.posicionNueva}
                            {subio && <span className="ml-1 text-green-400 text-xl">▲</span>}
                            {bajo && <span className="ml-1 text-red-400 text-xl">▼</span>}
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl text-white mb-3 uppercase tracking-tighter italic" style={{ fontFamily: 'Impact, sans-serif', fontWeight: 400 }}>
                    {data.nombre}
                </h2>

                <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent mb-4" />

                <p className="text-lg font-medium text-white/90 leading-relaxed">
                    {mensaje}
                </p>
                
                {!esDefinitivo && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-yellow-500/60 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        Sujeto a resultados de los partidos restantes
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`
            fixed inset-0 z-[10000] flex items-start justify-center p-8 pointer-events-none
            transition-all duration-500 ease-in-out
            ${visible ? 'opacity-100' : 'opacity-0'}
        `}>
            {/* Se elimina el fondo negro para permitir ver la tabla debajo */}

            <div className={`
                relative w-full max-w-4xl pointer-events-auto mt-20
                transition-all duration-700 delay-100 transform
                ${visible ? 'translate-y-0 scale-100' : 'translate-y-[-20px] scale-95'}
            `}>
                <div className="bg-[#0f0f0f]/90 backdrop-blur-md border-t-8 border-[#f5a623] rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="bg-[#1a1a1a] px-8 py-3 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                            <span className="text-sm font-black tracking-[0.4em] text-[#f5a623]">
                                ACTUALIZACIÓN DE LA GENERAL
                            </span>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-white/20 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                        >
                            Cerrar [X]
                        </button>
                    </div>

                    <div className="p-8 flex flex-col lg:flex-row gap-8 items-stretch">
                        {renderPanel('goleador')}
                        <div className="hidden lg:flex flex-col items-center justify-center py-4">
                            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                            <span className="my-4 text-white/20 font-black text-xl italic">VS</span>
                            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                        </div>
                        {renderPanel('recibio')}
                    </div>

                    <div className="bg-black/40 px-8 py-2 text-center">
                        <p className="text-[9px] font-bold text-white/30 tracking-[0.5em] uppercase">
                            Liga de Veteranos Saladillo • Fecha 5 • Proyección de Cruces en Tiempo Real
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
