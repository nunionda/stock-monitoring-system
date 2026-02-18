'use client';

import { useEffect, useState } from 'react';
import { components } from '../../types/api';
import TradeForm from '../components/TradeForm';
import TradeList from '../components/TradeList';

type Trade = components['schemas']['Trade'];

export default function TradingJournalPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchTrades();
    }, []);

    useEffect(() => {
        if (trades.length > 0) {
            updateMarketPrices();
        }
    }, [trades]);

    const fetchTrades = async () => {
        try {
            const res = await fetch('http://localhost:8000/trades/');
            if (res.ok) {
                const data = await res.json();
                setTrades(data);
            }
        } catch (err) {
            console.error('Failed to fetch trades:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateMarketPrices = async () => {
        const uniqueSymbols = Array.from(new Set(trades.map(t => t.stock_name)));
        if (uniqueSymbols.length === 0) return;

        try {
            const res = await fetch('http://localhost:8000/stocks/prices/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uniqueSymbols),
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentPrices(data);
            }
        } catch (err) {
            console.error('Failed to fetch market prices:', err);
        }
    };

    const handleTradeAdded = (newTrade: Trade) => {
        setTrades([newTrade, ...trades]);
    };

    const handleDeleteTrade = async (id: number) => {
        if (!confirm('Are you sure you want to delete this trade?')) return;

        try {
            const res = await fetch(`http://localhost:8000/trades/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setTrades(trades.filter(t => t.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete trade:', err);
        }
    };

    // Calculate Detailed Summary Stats & Holdings
    const totalTrades = trades.length;
    const stats = trades.reduce((acc, t) => {
        const value = t.price * t.quantity;
        if (t.type === 'Buy') {
            acc.buyCosts += value;
        } else {
            acc.sellProceeds += value;
        }
        acc.turnover += value;
        return acc;
    }, { buyCosts: 0, sellProceeds: 0, turnover: 0 });

    // Per-symbol holdings calculation
    const symbolMap: Record<string, { quantity: number; totalCost: number; realizedPL: number }> = {};

    // Sort trades by date (ascending) to calculate cost basis correctly
    [...trades].sort((a, b) => new Date(a.trade_date || 0).getTime() - new Date(b.trade_date || 0).getTime()).forEach(t => {
        if (!symbolMap[t.stock_name]) {
            symbolMap[t.stock_name] = { quantity: 0, totalCost: 0, realizedPL: 0 };
        }
        const s = symbolMap[t.stock_name];
        if (t.type === 'Buy') {
            s.quantity += t.quantity;
            s.totalCost += (t.price * t.quantity);
        } else {
            // Realized P/L = (Sell Price - Avg Cost) * Quantity
            const avgCost = s.quantity > 0 ? s.totalCost / s.quantity : 0;
            s.realizedPL += (t.price - avgCost) * t.quantity;
            s.quantity -= t.quantity;
            s.totalCost -= (avgCost * t.quantity);
        }
    });

    const marketValue = Object.entries(symbolMap).reduce((acc, [symbol, s]) => {
        const price = currentPrices[symbol] || 0;
        return acc + (s.quantity * price);
    }, 0);

    const unrealizedPL = Object.entries(symbolMap).reduce((acc, [symbol, s]) => {
        const price = currentPrices[symbol] || 0;
        return acc + (s.quantity * (price - (s.quantity > 0 ? s.totalCost / s.quantity : 0)));
    }, 0);

    const totalRealizedPL = Object.values(symbolMap).reduce((acc, s) => acc + s.realizedPL, 0);
    const netPL = totalRealizedPL + unrealizedPL;
    const roi = stats.buyCosts > 0 ? (netPL / stats.buyCosts) * 100 : 0;

    if (loading) return <div className="p-8 text-stone-400 font-serif italic">Loading your portfolio...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900">Trading Journal</h1>
                    <p className="text-stone-500 font-serif italic mt-1">Keep track of your market journey.</p>
                </div>
            </header>

            {/* Dashboard / Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">ROI (%)</p>
                    <p className={`text-2xl font-serif font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Net P/L</p>
                    <p className={`text-2xl font-serif font-bold ${netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netPL >= 0 ? '+' : ''}${Math.abs(netPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Realized P/L</p>
                    <p className={`text-xl font-serif font-bold ${totalRealizedPL >= 0 ? 'text-stone-700' : 'text-stone-700'}`}>
                        ${totalRealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Unrealized P/L</p>
                    <p className={`text-xl font-serif font-bold ${unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Form & Holdings */}
                <div className="lg:col-span-1 space-y-8">
                    <TradeForm onTradeAdded={handleTradeAdded} />

                    <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
                        <h3 className="text-lg font-serif font-bold text-stone-800 mb-4 uppercase tracking-tight">Current Holdings</h3>
                        <div className="space-y-4">
                            {Object.entries(symbolMap).filter(([_, s]) => s.quantity > 0).map(([symbol, s]) => {
                                const price = currentPrices[symbol] || 0;
                                const avgCost = s.totalCost / s.quantity;
                                const itemROI = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;
                                return (
                                    <div key={symbol} className="flex justify-between items-center border-b border-stone-100 pb-2">
                                        <div>
                                            <p className="font-bold text-stone-900">{symbol}</p>
                                            <p className="text-xs text-stone-500">{s.quantity} Shares @ ${avgCost.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-stone-900">${(s.quantity * price).toLocaleString()}</p>
                                            <p className={`text-xs ${itemROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {itemROI >= 0 ? '+' : ''}{itemROI.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side: List */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-serif font-bold text-stone-800 mb-4">Recent Trades</h3>
                    <TradeList trades={trades} onDelete={handleDeleteTrade} />
                </div>
            </div>
        </div>
    );
}
