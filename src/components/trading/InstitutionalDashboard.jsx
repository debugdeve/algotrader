import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Globe } from 'lucide-react';
import axios from 'axios';

const InstitutionalDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/market/fii-dii');
                setData(response.data);
            } catch (error) {
                console.error("Error fetching FII/DII data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="animate-pulse bg-zinc-900 rounded-2xl h-64 w-full" />;

    const isFiiPositive = data?.fii_net > 0;
    const isDiiPositive = data?.dii_net > 0;

    return (
        <div className="bg-[#050505] border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-indigo-500" />
                        Institutional Flow
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">Daily Net Buy/Sell (Cr)</p>
                </div>
                <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-500">
                    {data?.date}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FII Card */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Globe className="text-indigo-400 w-5 h-5" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isFiiPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                FII / FPI
                            </span>
                        </div>
                        <div className="text-3xl font-black text-white">
                            {isFiiPositive ? '+' : ''}{data?.fii_net.toLocaleString()}
                        </div>
                        <div className={`flex items-center gap-1 mt-2 text-sm ${isFiiPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isFiiPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {isFiiPositive ? 'Net Inflow' : 'Net Outflow'}
                        </div>
                    </div>
                    {/* Background Accent */}
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 ${isFiiPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </motion.div>

                {/* DII Card */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Users className="text-amber-400 w-5 h-5" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDiiPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                DII
                            </span>
                        </div>
                        <div className="text-3xl font-black text-white">
                            {isDiiPositive ? '+' : ''}{data?.dii_net.toLocaleString()}
                        </div>
                        <div className={`flex items-center gap-1 mt-2 text-sm ${isDiiPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isDiiPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {isDiiPositive ? 'Net Inflow' : 'Net Outflow'}
                        </div>
                    </div>
                    {/* Background Accent */}
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 ${isDiiPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </motion.div>
            </div>

            {/* Micro Chart Placeholder */}
            <div className="mt-8 flex items-end justify-between h-20 gap-1 px-2">
                {data?.history.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="flex w-full gap-0.5 items-end h-16">
                            <div 
                                className="flex-1 bg-indigo-500/40 rounded-t-sm group-hover:bg-indigo-500 transition-all"
                                style={{ height: `${Math.abs(day.fii) / 20}%` }}
                            />
                            <div 
                                className="flex-1 bg-amber-500/40 rounded-t-sm group-hover:bg-amber-500 transition-all"
                                style={{ height: `${Math.abs(day.dii) / 20}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-zinc-600 font-medium">{day.date.split('-')[2]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InstitutionalDashboard;
