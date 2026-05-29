import React from 'react';
import { useTablaGeneral } from '../hooks/useTablaGeneral';

export const TablaGeneralProyectada: React.FC = () => {
    const { tabla, loading, error } = useTablaGeneral();

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
            <div className="animate-pulse text-2xl font-bold tracking-widest text-[#f5a623]">CARGANDO PROYECCIÓN...</div>
        </div>
    );

    if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-['Oswald'] p-8 select-none">
            <header className="mb-8 border-l-8 border-[#f5a623] pl-6 py-2">
                <h1 className="text-4xl font-black uppercase tracking-tighter">Proyección Tabla General</h1>
                <p className="text-[#f5a623] font-light tracking-[0.2em] uppercase text-sm">Fecha 5 - Simulación en Tiempo Real</p>
            </header>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#f5a623] text-black">
                            <th className="p-4 text-center w-16">POS</th>
                            <th className="p-4">EQUIPO</th>
                            <th className="p-4 text-center">ZONA</th>
                            <th className="p-4 text-center">PJ</th>
                            <th className="p-4 text-center">PTS</th>
                            <th className="p-4 text-center">DG</th>
                            <th className="p-4 text-center">GF</th>
                            <th className="p-4">CRUCE / DESTINO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tabla.map((equipo, idx) => {
                            const isOro = equipo.categoria === 'Oro';
                            const isDirecto = equipo.posicion === 1;
                            
                            return (
                                <tr 
                                    key={equipo.id} 
                                    className={`
                                        border-b border-white/5 transition-colors hover:bg-white/10
                                        ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}
                                        ${isDirecto ? 'bg-yellow-500/10' : ''}
                                    `}
                                >
                                    <td className={`p-4 text-center font-bold text-xl ${isDirecto ? 'text-[#f5a623]' : 'text-white/60'}`}>
                                        {equipo.posicion}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-3 h-8 rounded-full" 
                                                style={{ backgroundColor: equipo.zona === 'A' ? '#3b82f6' : equipo.zona === 'B' ? '#22c55e' : '#f97316' }}
                                            />
                                            <span className="font-bold text-lg uppercase">{equipo.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`
                                            px-3 py-1 rounded-full text-xs font-bold
                                            ${equipo.zona === 'A' ? 'bg-blue-500/20 text-blue-400' : 
                                              equipo.zona === 'B' ? 'bg-green-500/20 text-green-400' : 
                                              'bg-orange-500/20 text-orange-400'}
                                        `}>
                                            ZONA {equipo.zona}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-mono opacity-70">{equipo.pj}</td>
                                    <td className="p-4 text-center font-black text-xl text-[#f5a623]">{equipo.pts}</td>
                                    <td className={`p-4 text-center font-bold ${equipo.dg > 0 ? 'text-green-400' : equipo.dg < 0 ? 'text-red-400' : 'opacity-40'}`}>
                                        {equipo.dg > 0 ? `+${equipo.dg}` : equipo.dg}
                                    </td>
                                    <td className="p-4 text-center opacity-60">{equipo.gf}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold uppercase ${isOro ? 'text-yellow-500' : 'text-slate-400'}`}>
                                                Copa de {equipo.categoria}
                                            </span>
                                            <span className="text-sm font-medium">{equipo.cruce}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <footer className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-[#f5a623] font-bold text-xs uppercase mb-2">Criterio de Desempate</h3>
                    <p className="text-sm opacity-70">1. Puntos acumulados<br/>2. Diferencia de gol (DG)<br/>3. Goles a favor (GF)</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-yellow-500 font-bold text-xs uppercase mb-2">Copa de Oro</h3>
                    <p className="text-sm opacity-70">1° Directo a Semis<br/>2° al 7° Juegan Cuartos</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-slate-400 font-bold text-xs uppercase mb-2">Copa de Plata</h3>
                    <p className="text-sm opacity-70">8° al 15° Juegan Cuartos</p>
                </div>
            </footer>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@200;400;700;900&display=swap');
                
                body {
                    background-color: #0a0a0a;
                    margin: 0;
                    -webkit-font-smoothing: antialiased;
                }

                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #111;
                }
                ::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #444;
                }
            `}</style>
        </div>
    );
};
