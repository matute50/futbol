import React, { useEffect, useState } from 'react';
import type { ImpactoGol } from '../lib/tablaGeneral';

interface Props {
    impacto: ImpactoGol;
    duration?: number;
    onClose?: () => void;
}

export const NotificacionImpacto: React.FC<Props> = ({ impacto, duration = 8000, onClose }) => {
    const [visible, setVisible] = useState(false);
    const { equipoGoleador: eg, equipoRecibioGol: er } = impacto;

    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 500);
        }, duration);

        return () => clearTimeout(timer);
    }, [impacto, duration, onClose]);

    if (!impacto) return null;

    const renderEquipoImpacto = (eq: typeof eg, type: 'goleador' | 'recibio') => {
        const subio = eq.posicionNueva < eq.posicionPrevia;
        const bajo = eq.posicionNueva > eq.posicionPrevia;
        const cambioCopa = eq.categoriaPrevia !== eq.categoriaNueva;
        
        const isGreen = type === 'goleador';
        const mainColor = isGreen ? 'text-green-400' : 'text-red-400';
        const bgColor = isGreen ? 'bg-green-500/10' : 'bg-red-500/10';
        const borderColor = isGreen ? 'border-green-500/30' : 'border-red-500/30';

        return (
            <div className={`flex-1 p-4 rounded-xl border ${borderColor} ${bgColor} backdrop-blur-md transition-all duration-500`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl uppercase tracking-tighter text-white" style={{ fontFamily: 'Impact, sans-serif', fontWeight: 400 }}>
                        {eq.nombre}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold opacity-50 text-white">POS</span>
                        <div className="flex items-center font-black text-2xl">
                            <span className="text-white/40 line-through mr-2 text-sm">{eq.posicionPrevia}</span>
                            <span className={mainColor}>{eq.posicionNueva}</span>
                            {subio && <span className="ml-1 text-green-400 text-sm">▲</span>}
                            {bajo && <span className="ml-1 text-red-400 text-sm">▼</span>}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${eq.categoriaNueva === 'Oro' ? 'bg-yellow-500 text-black' : 'bg-slate-500 text-white'}`}>
                            COPA DE {eq.categoriaNueva}
                        </span>
                        {cambioCopa && (
                            <span className="animate-pulse text-[10px] font-bold text-yellow-400">
                                ¡CAMBIO DE COPA!
                            </span>
                        )}
                    </div>
                    
                    <p className="text-sm font-medium text-white/90 leading-tight">
                        Proyectando: Se enfrentaría a <span className="text-[#f5a623] font-bold">{eq.rivalNuevo}</span> en <span className="underline decoration-[#f5a623]/40 underline-offset-4">{eq.instanciaNueva} de {eq.categoriaNueva}</span>.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className={`
            fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] 
            w-full max-w-4xl px-4 transition-all duration-500 ease-out
            ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95 pointer-events-none'}
        `}>
            {/* Header / Glow Effect */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-[#f5a623]/20 blur-[50px] -z-10" />
            
            <div className="bg-black/80 border-t-4 border-[#f5a623] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="bg-gradient-to-r from-black via-[#1a1a1a] to-black px-6 py-2 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-[0.3em] text-[#f5a623] animate-pulse">
                        LIVE IMPACTO • TABLA GENERAL
                    </span>
                    <span className="text-[10px] font-bold text-white/40">FECHA 5 • SIMULACIÓN EN VIVO</span>
                </div>

                <div className="p-4 flex flex-col md:flex-row gap-4">
                    {renderEquipoImpacto(eg, 'goleador')}
                    <div className="hidden md:flex items-center justify-center">
                        <div className="w-px h-full bg-white/10" />
                    </div>
                    {renderEquipoImpacto(er, 'recibio')}
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
