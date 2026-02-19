import React from 'react';
import { BacktestResult } from '../../utils/backtest';

interface TradeMonitorProps {
    symbol: string;
    data: any; // Ideally typed, but consistent with existing codebase for now
    backtestResult: BacktestResult | null;
    strategyResult: any; // TradingSignal from strategy.ts
}

export const TradeMonitor: React.FC<TradeMonitorProps> = ({ symbol, data, backtestResult, strategyResult }) => {
    // Hardcoded simulation values from original implementation
    const manualEntryPrice = 6872.50;
    const manualStopLoss = 6885.50;
    const manualTakeProfit = 6840.50;
    const manualBreakeven = 6860.00;

    return (
        <div className="space-y-8">
            {backtestResult?.activePosition ? (
                <div className="bg-stone-900 p-6 rounded-lg border border-stone-700 shadow-xl space-y-4">
                    <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-stone-800 pb-2 flex justify-between items-center">
                        Live Position Status
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-stone-500 font-bold uppercase">Direction</p>
                                <p className={`text-2xl font-serif font-bold ${backtestResult.activePosition.type === 'LONG' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {backtestResult.activePosition.type}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-stone-500 font-bold uppercase">Floating P&L</p>
                                <p className={`text-2xl font-serif font-bold ${backtestResult.activePosition.floatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {backtestResult.activePosition.floatingProfit >= 0 ? '+' : ''}{backtestResult.activePosition.floatingReturn.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-800">
                            <div>
                                <p className="text-[10px] text-stone-500 font-bold uppercase">Avg Entry</p>
                                <p className="text-sm font-serif font-medium text-stone-200">{backtestResult.activePosition.avgEntryPrice.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-stone-500 font-bold uppercase">Current Price</p>
                                <p className="text-sm font-serif font-medium text-stone-200">{(data?.price || 0).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="pt-2">
                            <p className="text-[10px] text-stone-500 font-bold uppercase">Allocation</p>
                            <p className="text-sm font-serif font-medium text-stone-200">{Math.round(backtestResult.activePosition.weight * 100)}% of Portfolio</p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Live / Manual Trade Monitor */
                <div className="bg-stone-900 p-6 rounded-lg border border-stone-700 shadow-xl space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                        <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm1-5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" /></svg>
                    </div>

                    <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-stone-800 pb-2 flex justify-between items-center z-10 relative">
                        Trade Monitor (1 Contract)
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                    </h3>

                    {/* Manual Override Controls */}
                    <div className="z-10 relative space-y-4">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Position</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif font-bold text-rose-500">SHORT</span>
                                    <span className="text-sm text-stone-400 font-mono">x1 Cont</span>
                                </div>
                                <p className="text-[9px] text-stone-600 mt-1">Entry: <span className="text-stone-300">{manualEntryPrice.toFixed(2)}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Unrealized P&L</p>
                                <p className={`text-3xl font-serif font-bold ${(data?.price || manualEntryPrice) < manualEntryPrice ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {data?.price ? (
                                        <>
                                            {((manualEntryPrice - data.price) * 50).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                        </>
                                    ) : '$0.00'}
                                </p>
                                <p className="text-[9px] text-stone-500 mt-1">
                                    {(data?.price || manualEntryPrice) < manualEntryPrice ? '+' : ''}
                                    {data?.price ? (manualEntryPrice - data.price).toFixed(2) : '0.00'} pts
                                </p>
                            </div>
                        </div>

                        {/* Risk Management Levels */}
                        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-800">
                            <div className="bg-stone-800/50 p-2 rounded border border-rose-900/30">
                                <p className="text-[9px] text-rose-400 font-bold uppercase">Stop Loss</p>
                                <p className="text-lg font-mono text-stone-200">{manualStopLoss.toFixed(2)}</p>
                                <p className="text-[8px] text-stone-500">-13.0 pts (1 ATR)</p>
                            </div>
                            <div className="bg-stone-800/50 p-2 rounded border border-stone-700/30">
                                <p className="text-[9px] text-stone-400 font-bold uppercase">Breakeven</p>
                                <p className="text-lg font-mono text-stone-400">{manualBreakeven.toFixed(2)}</p>
                                <p className="text-[8px] text-stone-500">Auto-Trigger</p>
                            </div>
                            <div className="bg-stone-800/50 p-2 rounded border border-emerald-900/30">
                                <p className="text-[9px] text-emerald-400 font-bold uppercase">Take Profit</p>
                                <p className="text-lg font-mono text-stone-200">{manualTakeProfit.toFixed(2)}</p>
                                <p className="text-[8px] text-stone-500">+32.0 pts (2.5 ATR)</p>
                            </div>
                        </div>
                        <div className="text-center pt-2">
                            <p className="text-[9px] text-stone-600 uppercase tracking-widest">
                                Strategy V5 Auto-Monitor Active
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
