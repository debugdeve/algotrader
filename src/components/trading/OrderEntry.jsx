import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShieldCheck, Info } from 'lucide-react';
import axios from 'axios';
import config from '../../config';

const OrderEntry = ({ symbol = 'RELIANCE', currentPrice = 2950.45, onClose }) => {
    const [side, setSide] = useState('BUY');
    const [orderType, setOrderType] = useState('MARKET');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(currentPrice);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleExecute = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const response = await axios.post(`${config.API_BASE_URL}/broker/order`, {
                broker: 'ZERODHA', // Default for demo
                symbol,
                qty: parseInt(qty),
                type: orderType,
                price: orderType === 'MARKET' ? null : parseFloat(price),
                side
            });
            setStatus({ type: 'success', message: response.data.message });
            setTimeout(() => onClose(), 2000);
        } catch (error) {
            setStatus({ type: 'error', message: 'Order Failed. Check API connectivity.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
            <div className="glass w-full max-w-md rounded-2xl p-10 shadow-vault overflow-hidden relative">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 style={{ fontSize: 'var(--display-sm)', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>{symbol}</h2>
                            <div className="vault-insight-chip">NSE • EQUITY</div>
                        </div>
                        <div style={{ fontSize: 'var(--title-lg)', fontWeight: 600, color: 'var(--primary)' }}>₹{currentPrice.toLocaleString()}</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                <div className="flex p-1 bg-black/20 rounded-xl mb-10">
                    <button 
                        onClick={() => setSide('BUY')}
                        style={{ background: side === 'BUY' ? 'var(--success)' : 'transparent' }}
                        className={`flex-1 py-3 rounded-lg font-800 text-[11px] tracking-[0.1em] transition-all ${side === 'BUY' ? 'text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        ACQUIRE
                    </button>
                    <button 
                        onClick={() => setSide('SELL')}
                        style={{ background: side === 'SELL' ? 'var(--error)' : 'transparent' }}
                        className={`flex-1 py-3 rounded-lg font-800 text-[11px] tracking-[0.1em] transition-all ${side === 'SELL' ? 'text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        LIQUIDATE
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="space-y-2">
                        <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', opacity: 0.5 }}>QUANTITY</label>
                        <input 
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', opacity: 0.5 }}>EXECUTION</label>
                        <select 
                            value={orderType}
                            onChange={(e) => setOrderType(e.target.value)}
                            className="form-input appearance-none"
                        >
                            <option value="MARKET">Market Execution</option>
                            <option value="LIMIT">Limit Order</option>
                            <option value="SL">Stop Protection</option>
                        </select>
                    </div>
                </div>

                {orderType !== 'MARKET' && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mb-8"
                    >
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 block mb-2">Target Price</label>
                        <input 
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </motion.div>
                )}

                <button 
                    onClick={handleExecute}
                    disabled={loading}
                    className={`btn-vault-primary w-full py-5 rounded-lg font-800 text-[13px] tracking-[0.1em] flex items-center justify-center gap-3 transition-all ${
                        loading ? 'opacity-50 grayscale' : ''
                    }`}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Zap size={16} fill="currentColor" />
                            {side === 'BUY' ? 'EXECUTE ACQUISITION' : 'EXECUTE LIQUIDATION'}
                        </>
                    )}
                </button>

                {/* Status Feedback */}
                <AnimatePresence>
                    {status && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}
                        >
                            <ShieldCheck size={20} />
                            <span className="text-sm font-bold">{status.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Info */}
                <div className="mt-8 flex items-center gap-2 justify-center text-zinc-600">
                    <Info size={14} />
                    <span className="text-[10px] font-medium uppercase tracking-tighter">Powered by AlgoTrader Engine • SEBI Registered</span>
                </div>

                {/* Decorative Background Glow */}
                <div className={`absolute -bottom-20 -left-20 w-64 h-64 blur-[100px] opacity-20 pointer-events-none ${side === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
        </motion.div>
    );
};

export default OrderEntry;
