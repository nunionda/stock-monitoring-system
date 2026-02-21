'use client';

import { useMarketData } from '../hooks/useMarketData';
import { useTradeData } from '../hooks/useTradeData';
import React, { useState, useEffect } from 'react';
import StockCard from '../components/StockCard';
import HistoryTable from '../components/HistoryTable';
import { AntiGravityStrategy, Candle } from '../utils/strategy';
import { runBacktest, BacktestResult } from '../utils/backtest';
import { API_BASE_URL } from '../utils/config';

// Dashboard Algorithmic Components
import { TradeMonitor } from '../components/dashboard/TradeMonitor';
import { RiskMetrics } from '../components/dashboard/RiskMetrics';
import { AlgorithmInsight } from '../components/dashboard/AlgorithmInsight';
import { BacktestAnalysis } from '../components/dashboard/BacktestAnalysis';
import { TradeSetupPanel } from '../components/dashboard/TradeSetupPanel';

// Journaling Portfolio Components
import PortfolioStats from '../components/PortfolioStats';
import TradeForm from '../components/TradeForm';
import TradeList from '../components/TradeList';

export default function UnifiedTradingDashboard() {
    const symbol = 'ES=F';
    const symbols = React.useMemo(() => [symbol], [symbol]);
    const emptyArray = React.useMemo(() => [], []);

    // --- 1. Data Hooks ---
    // Market Data Feed
    const { stocks, history, candles, loading: marketLoading, error, recordStat, refreshAll } = useMarketData(symbols, emptyArray);

    // Portfolio Journal Feed (Fixed to 'US' for ES=F Futures)
    const {
        trades,
        loading: portfolioLoading,
        portfolioStats,
        addTrade,
        deleteTrade
    } = useTradeData('US');

    // Algorithmic Backtest State
    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
    const [backtestLoading, setBacktestLoading] = useState(false);

    // --- 2. Strategy Engine Initialization ---
    const strategy = React.useMemo(() => new AntiGravityStrategy({ FIXED_POSITION_SIZE: 1 }), []);
    const currentCandles = candles[symbol] && Array.isArray(candles[symbol]) ? candles[symbol] : [];
    const strategyResult = currentCandles.length >= 22 ? strategy.generateSignal(currentCandles) : null;

    // --- 3. Backtest Simulation (V6 Environment) ---
    useEffect(() => {
        const fetchAndBacktest = async () => {
            setBacktestLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/stocks/simulation/1m/${symbol}`);
                if (res.ok) {
                    const data: Candle[] = await res.json();
                    const results = await runBacktest(data, {
                        SLIPPAGE_TICKS: 1, TICK_VALUE: 12.50, TICK_SIZE: 0.25, TRANSACTION_FEE: 5.0, INITIAL_MARGIN: 13500, FUTURES_MULTIPLIER: 50
                    });
                    setBacktestResult(results);
                }
            } catch (err) {
                console.error("Backtest failed:", err);
            } finally {
                setBacktestLoading(false);
            }
        };
        fetchAndBacktest();
    }, [symbol]);

    // --- 4. Render Guards ---
    if (marketLoading || portfolioLoading) {
        return <div className="p-12 text-center text-stone-500 font-serif italic text-xl animate-pulse">Initializing Trading Protocol...</div>;
    }

    if (error) {
        return (
            <div className="max-w-[1400px] mx-auto p-8 space-y-6">
                <div className="bg-rose-50 border border-rose-200 p-8 rounded-lg shadow-sm text-center">
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Data Feed Offline</h2>
                    <p className="text-stone-600 mb-6 font-mono text-sm">{error}</p>
                    <button onClick={() => refreshAll()} className="bg-stone-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors">Retry Connection</button>
                </div>
            </div>
        );
    }

    const data = stocks[symbol];
    const stockHistory = history[symbol] || [];

    // Safely destructure portfolioStats with fallbacks 
    const roi = portfolioStats?.roi || 0;
    const netPL = portfolioStats?.netPL || 0;
    const totalRealizedPL = portfolioStats?.totalRealizedPL || 0;
    const unrealizedPL = portfolioStats?.unrealizedPL || 0;

    return (
        <div className="max-w-[1600px] mx-auto p-4 space-y-4 bg-stone-50 min-h-screen text-stone-900">
            {/* =========================================
                FRAME 1: HEADER & PORTFOLIO 
                ========================================= */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 flex flex-col gap-4">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                            Terminal Layout
                            <span className="text-[10px] bg-stone-900 text-white px-2 py-0.5 rounded uppercase tracking-widest">Frame Flow</span>
                        </h1>
                    </div>
                    {strategyResult && (
                        <div className={`px-4 py-1.5 rounded-lg font-bold text-sm tracking-widest uppercase border ${strategyResult.signal.includes('BUY') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                strategyResult.signal.includes('SELL') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-stone-50 text-stone-600 border-stone-200'
                            }`}>
                            Signal: {strategyResult.signal.replace('_', ' ')}
                        </div>
                    )}
                </header>
                <div className="pt-2 border-t border-stone-100">
                    <PortfolioStats roi={roi} netPL={netPL} realizedPL={totalRealizedPL} unrealizedPL={unrealizedPL} market={'US'} />
                </div>
            </div>

            {/* =========================================
                FRAME 2: CORE TRADING HUD (CSS Grid)
                ========================================= */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

                {/* LEFT PANEL: Charting & Live Monitoring (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden h-[500px]">
                        {data ? (
                            <StockCard symbol={symbol} data={data} name={"E-mini S&P 500 Futures"} isFixed={true} onRecord={() => recordStat(symbol)} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-stone-400 font-mono text-sm animate-pulse">
                                Syncing exchange data...
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                        <TradeMonitor symbol={symbol} data={data} backtestResult={backtestResult} strategyResult={strategyResult} />
                    </div>
                </div>

                {/* RIGHT PANEL: Logic Flow [Insight -> Risk -> Setup -> Execute] (Span 4) */}
                <div className="xl:col-span-4 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                        <AlgorithmInsight strategyResult={strategyResult} />
                    </div>

                    {strategyResult && (
                        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                            <RiskMetrics strategyResult={strategyResult} />
                        </div>
                    )}

                    {strategyResult && (
                        <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-lg p-4 text-stone-100">
                            <TradeSetupPanel strategyResult={strategyResult} />
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 shrink-0">
                        <div className="mb-2 pb-2 border-b border-stone-100">
                            <h3 className="font-serif font-bold text-stone-800">Direct Execution</h3>
                        </div>
                        <TradeForm onTradeAdded={addTrade} market={'US'} />
                    </div>
                </div>
            </div>

            {/* =========================================
                FRAME 3: SYSTEM OF RECORD & HISTORY
                ========================================= */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Ledger */}
                <div className="xl:col-span-8 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-serif font-bold text-lg text-stone-800">Trade Ledger</h3>
                        </div>
                        <TradeList trades={trades} onDelete={deleteTrade} market={'US'} />
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                        <BacktestAnalysis backtestResult={backtestResult} backtestLoading={backtestLoading} />
                    </div>
                </div>

                {/* Database */}
                <div className="xl:col-span-4">
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 h-full">
                        <h3 className="font-serif font-bold text-lg text-stone-800 mb-4">ATR Context</h3>
                        <HistoryTable symbol={symbol} history={stockHistory} />
                    </div>
                </div>
            </div>

        </div>
    );
}
