import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Activity, Percent, ChevronRight } from 'lucide-react';
import axios from 'axios';
import config from '../../config';

const OptionChainDashboard = ({ symbol = 'NIFTY' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${config.API_BASE_URL}/market/derivatives/${symbol}`);
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
        <div className="w-full relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 style={{ fontSize: 'var(--headline-sm)', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
                        Derivatives Pulse
                    </h2>
                    <p style={{ fontSize: 'var(--body-sm)', opacity: 0.5, marginTop: '4px' }}>{symbol} Option Chain Analytics</p>
                </div>
                <div className="flex gap-2">
                    <button className="vault-insight-chip" style={{ border: 'none', cursor: 'pointer' }}>Details</button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
                <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }} className="p-4 rounded-xl">
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', opacity: 0.5 }}>PUT-CALL RATIO</div>
                    <div style={{ fontSize: 'var(--title-lg)', fontWeight: 900 }} className={pcrColor}>{pcrValue.toFixed(2)}</div>
                </div>
                <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }} className="p-4 rounded-xl">
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', opacity: 0.5 }}>MAX PAIN</div>
                    <div style={{ fontSize: 'var(--title-lg)', fontWeight: 900, color: 'white' }}>{data?.max_pain.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }} className="p-4 rounded-xl">
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', opacity: 0.5 }}>CE / PE OI</div>
                    <div style={{ fontSize: 'var(--body-md)', fontWeight: 800, marginTop: '4px' }}>
                        <span className="text-rose-400">{(data?.total_ce_oi / 1000000).toFixed(1)}M</span>
                        <span style={{ margin: '0 8px', opacity: 0.2 }}>/</span>
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

            <button className="btn-vault-primary w-full mt-6 py-4 rounded-lg font-800 text-[12px] tracking-[0.1em] flex items-center justify-center gap-2">
                OPEN FULL OPTION CHAIN
                <ChevronRight size={14} />
            </button>
        </div>
    );
};

export default OptionChainDashboard;
