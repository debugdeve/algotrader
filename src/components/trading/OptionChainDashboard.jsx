import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Activity, Percent, ChevronRight } from 'lucide-react';
import axios from 'axios';

const OptionChainDashboard = ({ symbol = 'NIFTY' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/api/market/derivatives/${symbol}`);
                setData(response.data);
            } catch (error) {
                console.error("Error fetching derivatives data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [symbol]);

    if (loading) return <div className="animate-pulse bg-zinc-900 rounded-2xl h-64 w-full" />;

    const pcrValue = data?.pcr || 0;
    const pcrColor = pcrValue > 1 ? 'text-emerald-400' : (pcrValue < 0.7 ? 'text-rose-400' : 'text-amber-400');

    return (
        <div className="bg-[#050505] border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-cyan-500" />
                        Derivatives Pulse
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">{symbol} Option Chain Analytics</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white hover:bg-zinc-800 transition-colors">Details</button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mb-1">Put-Call Ratio</div>
                    <div className={`text-2xl font-black ${pcrColor}`}>{pcrValue.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mb-1">Max Pain</div>
                    <div className="text-2xl font-black text-white">{data?.max_pain.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mb-1">CE/PE OI</div>
                    <div className="text-xs font-bold text-zinc-300 mt-1">
                        <span className="text-rose-400">{(data?.total_ce_oi / 1000000).toFixed(1)}M</span>
                        <span className="mx-1">/</span>
                        <span className="text-emerald-400">{(data?.total_pe_oi / 1000000).toFixed(1)}M</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2">
                    <span>Strike</span>
                    <div className="flex gap-16">
                        <span>CE Change</span>
                        <span>PE Change</span>
                    </div>
                </div>
                {data?.oi_change.map((item, idx) => (
                    <div key={idx} className="group relative flex items-center justify-between p-3 bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-800/30 rounded-xl transition-all">
                        <span className="text-sm font-bold text-white z-10">{item.strike}</span>
                        
                        {/* Visualization Bars */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <div className="w-full flex h-full">
                                <div className="flex-1 flex justify-end px-4">
                                    <div 
                                        className="h-full bg-rose-500 transition-all duration-1000" 
                                        style={{ width: `${(item.ce_change / 30000) * 100}%`, maxWidth: '50%' }} 
                                    />
                                </div>
                                <div className="flex-1 flex justify-start px-4">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000" 
                                        style={{ width: `${(item.pe_change / 30000) * 100}%`, maxWidth: '50%' }} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-12 z-10">
                            <span className="text-xs font-medium text-rose-400">+{item.ce_change.toLocaleString()}</span>
                            <span className="text-xs font-medium text-emerald-400">+{item.pe_change.toLocaleString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                Open Full Option Chain
                <ChevronRight size={16} />
            </button>
        </div>
    );
};

export default OptionChainDashboard;
