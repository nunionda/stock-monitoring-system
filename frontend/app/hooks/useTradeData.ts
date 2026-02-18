import { useState, useEffect, useCallback, useMemo } from 'react';
import { components } from '../../types/api';

type Trade = components['schemas']['Trade'];

export const useTradeData = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

    const fetchTrades = useCallback(async () => {
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
    }, []);

    const updateMarketPrices = useCallback(async (symbols: string[]) => {
        if (symbols.length === 0) return;
        try {
            const res = await fetch('http://localhost:8000/stocks/prices/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(symbols),
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentPrices(data);
            }
        } catch (err) {
            console.error('Failed to fetch market prices:', err);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    useEffect(() => {
        const uniqueSymbols = Array.from(new Set(trades.map(t => t.stock_name)));
        updateMarketPrices(uniqueSymbols);
    }, [trades, updateMarketPrices]);

    const portfolioStats = useMemo(() => {
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

        const symbolMap: Record<string, { quantity: number; totalCost: number; realizedPL: number }> = {};

        [...trades].sort((a, b) => new Date(a.trade_date || 0).getTime() - new Date(b.trade_date || 0).getTime()).forEach(t => {
            if (!symbolMap[t.stock_name]) {
                symbolMap[t.stock_name] = { quantity: 0, totalCost: 0, realizedPL: 0 };
            }
            const s = symbolMap[t.stock_name];
            if (t.type === 'Buy') {
                s.quantity += t.quantity;
                s.totalCost += (t.price * t.quantity);
            } else {
                const avgCost = s.quantity > 0 ? s.totalCost / s.quantity : 0;
                s.realizedPL += (t.price - avgCost) * t.quantity;
                s.quantity -= t.quantity;
                s.totalCost -= (avgCost * t.quantity);
            }
        });

        const unrealizedPL = Object.entries(symbolMap).reduce((acc, [symbol, s]) => {
            const price = currentPrices[symbol] || 0;
            return acc + (s.quantity * (price - (s.quantity > 0 ? s.totalCost / s.quantity : 0)));
        }, 0);

        const totalRealizedPL = Object.values(symbolMap).reduce((acc, s) => acc + s.realizedPL, 0);
        const netPL = totalRealizedPL + unrealizedPL;
        const roi = stats.buyCosts > 0 ? (netPL / stats.buyCosts) * 100 : 0;

        return { stats, symbolMap, unrealizedPL, totalRealizedPL, netPL, roi };
    }, [trades, currentPrices]);

    const addTrade = (newTrade: Trade) => {
        setTrades(prev => [newTrade, ...prev]);
    };

    const deleteTrade = async (id: number) => {
        if (!confirm('Are you sure you want to delete this trade?')) return false;
        try {
            const res = await fetch(`http://localhost:8000/trades/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTrades(prev => prev.filter(t => t.id !== id));
                return true;
            }
        } catch (err) {
            console.error('Failed to delete trade:', err);
        }
        return false;
    };

    return { trades, loading, currentPrices, portfolioStats, addTrade, deleteTrade, refresh: fetchTrades };
};
