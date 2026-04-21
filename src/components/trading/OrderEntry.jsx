import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShieldCheck, Info } from 'lucide-react';
import axios from 'axios';

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
            const response = await axios.post('http://localhost:8000/api/broker/order', {
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
            <div className="bg-[#0A0A0A] border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-3xl font-black text-white">{symbol}</h2>
                            <span className="text-zinc-500 font-mono text-sm">NSE</span>
                        </div>
                        <div className="text-zinc-400 font-medium">₹{currentPrice.toLocaleString()}</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Side Selector */}
                <div className="flex p-1 bg-zinc-900 rounded-2xl mb-8">
                    <button 
                        onClick={() => setSide('BUY')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'BUY' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        BUY
                    </button>
                    <button 
                        onClick={() => setSide('SELL')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'SELL' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        SELL
                    </button>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Quantity</label>
                        <input 
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Price Type</label>
                        <select 
                            value={orderType}
                            onChange={(e) => setOrderType(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                        >
                            <option value="MARKET">Market</option>
                            <option value="LIMIT">Limit</option>
                            <option value="SL">Stop-Loss</option>
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

                {/* Execution Button */}
                <button 
                    onClick={handleExecute}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${
                        loading ? 'bg-zinc-800 text-zinc-600' : (side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-rose-500 hover:bg-rose-400 text-white')
                    }`}
                >
                    {loading ? (
                        <div className="w-6 h-6 border-4 border-zinc-600 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Zap size={20} fill="currentColor" />
                            {side === 'BUY' ? 'Instant Buy' : 'Instant Sell'}
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
