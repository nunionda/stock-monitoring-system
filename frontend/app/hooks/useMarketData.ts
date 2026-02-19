import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, WS_BASE_URL } from '../utils/config';
import { Candle } from '../utils/strategy';

export interface StockStats {
    symbol: string;
    price: number;
    change: number;
    change_percent: number;
    volume: number;
    atr: number | null;
    high: number;
    low: number;
    open: number;
}

export const useMarketData = (fixedSymbols: string[], customSymbols: string[]) => {
    const [stocks, setStocks] = useState<Record<string, StockStats | null>>({});
    const [history, setHistory] = useState<Record<string, any[]>>({});
    const [candles, setCandles] = useState<Record<string, Candle[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);

    const fetchStats = useCallback(async (symbols: string[]) => {
        const results: Record<string, StockStats | null> = {};
        let fetchError = null;
        for (const symbol of symbols) {
            if (!symbol) continue;
            try {
                const res = await fetch(`${API_BASE_URL}/stocks/stats/${symbol}`);
                if (res.ok) {
                    results[symbol] = await res.json();
                } else {
                    const errorText = await res.text();
                    fetchError = `Backend Error (${res.status}): ${errorText || 'Internal Server Error'}`;
                }
            } catch (err) {
                console.error(`Failed to fetch stats for ${symbol}:`, err);
                fetchError = `Connection Failed: Please check if the backend server is running at ${API_BASE_URL}`;
            }
        }
        setStocks(prev => ({ ...prev, ...results }));
        setError(fetchError);
    }, []);

    const fetchHistory = useCallback(async (symbol: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/stocks/history/${symbol}`);
            if (res.ok) {
                const data = await res.json();
                setHistory(prev => ({ ...prev, [symbol]: data }));
            }
        } catch (err) {
            console.error(`Failed to fetch history for ${symbol}:`, err);
        }
    }, []);

    const fetchCandles = useCallback(async (symbol: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/stocks/candles/${symbol}`);
            if (res.ok) {
                const data = await res.json();
                setCandles(prev => ({ ...prev, [symbol]: data }));
            }
        } catch (err) {
            console.error(`Failed to fetch candles for ${symbol}:`, err);
        }
    }, []);

    const fetchAllData = useCallback(async () => {
        const allSymbols = [...fixedSymbols, ...customSymbols];
        await fetchStats(allSymbols);
        setLoading(false);
        for (const symbol of allSymbols) {
            if (symbol) {
                fetchHistory(symbol);
                fetchCandles(symbol);
            }
        }
    }, [fixedSymbols, customSymbols, fetchStats, fetchHistory, fetchCandles]);

    // Initial Fetch & Polling Fallback
    useEffect(() => {
        fetchAllData();
        const interval = setInterval(() => fetchStats([...fixedSymbols, ...customSymbols]), 60000);
        return () => clearInterval(interval);
    }, [fetchAllData, fixedSymbols, customSymbols, fetchStats]);

    // WebSocket Connection
    useEffect(() => {
        const connectWS = () => {
            const socket = new WebSocket(`${WS_BASE_URL}/ws/market`);

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'stock_update') {
                    setStocks(prev => {
                        const current = prev[data.symbol];
                        if (!current) return prev;
                        return {
                            ...prev,
                            [data.symbol]: {
                                ...current,
                                price: data.price,
                                change: data.change,
                                change_percent: data.change_percent
                            }
                        };
                    });
                }
            };

            socket.onclose = () => {
                console.log('WebSocket closed, retrying in 5s...');
                setTimeout(connectWS, 5000);
            };

            ws.current = socket;
        };

        connectWS();
        return () => ws.current?.close();
    }, []);

    const recordStat = async (symbol: string) => {
        const data = stocks[symbol];
        if (!data) return;

        try {
            const payload = { ...data, date: new Date().toISOString() };
            const res = await fetch(`${API_BASE_URL}/stocks/stats/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                fetchHistory(symbol);
                return true;
            }
        } catch (err) {
            console.error('Failed to record stats:', err);
        }
        return false;
    };

    return { stocks, history, candles, loading, error, recordStat, refreshHistory: fetchHistory, refreshAll: fetchAllData };
};
