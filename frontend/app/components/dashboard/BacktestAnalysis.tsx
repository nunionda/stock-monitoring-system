import React from 'react';
import { BacktestResult } from '../../utils/backtest';

interface BacktestAnalysisProps {
    backtestResult: BacktestResult | null;
    backtestLoading: boolean;
}

export const BacktestAnalysis: React.FC<BacktestAnalysisProps> = ({ backtestResult, backtestLoading }) => {
    return (
        <div className="bg-stone-900 text-stone-100 p-8 rounded-lg shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                Institutional Backtest Analysis
                <span className="text-[10px] bg-stone-700 px-2 py-0.5 rounded uppercase tracking-tighter text-stone-300">1 Year (ES=F)</span>
            </h3>

            {backtestLoading ? (
                <p className="text-stone-400 italic">Calculating institutional grade performance metrics...</p>
            ) : backtestResult ? (
                <div className="space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="space-y-1 group">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Net Profit Rate</p>
                            <p className="text-3xl font-serif font-bold text-emerald-400 group-hover:scale-110 transition-transform origin-left">{(backtestResult.netReturnAfterCosts || 0).toFixed(1)}%</p>
                            <p className="text-[10px] text-stone-500 italic">Bench: {(backtestResult.buyAndHoldReturn || 0).toFixed(1)}% (B&H)</p>
                        </div>
                        <div className="space-y-1 group">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Max Drawdown</p>
                            <p className="text-3xl font-serif font-bold text-rose-500 group-hover:scale-110 transition-transform origin-left">{(backtestResult.mdd || 0).toFixed(1)}%</p>
                            <p className="text-[10px] text-stone-500 italic">Worst-case equity drop</p>
                        </div>
                        <div className="space-y-1 group">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Win Rate (Net)</p>
                            <p className="text-3xl font-serif font-bold text-blue-400 group-hover:scale-110 transition-transform origin-left">{(backtestResult.winRate || 0).toFixed(1)}%</p>
                            <p className="text-[10px] text-stone-500 italic">Profitable trade freq</p>
                        </div>
                        <div className="space-y-1 group">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Strategy Alpha</p>
                            <p className={`text-3xl font-serif font-bold group-hover:scale-110 transition-transform origin-left ${backtestResult.alphaVsBenchmark >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                {backtestResult.alphaVsBenchmark >= 0 ? '+' : ''}{(backtestResult.alphaVsBenchmark || 0).toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-stone-500 italic">Vs. S&P 500 Benchmark</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 border-y border-stone-800/50 py-8">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Profit Factor</p>
                            <p className={`text-4xl font-serif font-bold ${(backtestResult.profitFactor || 0) >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {(backtestResult.profitFactor || 0).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-stone-500 italic leading-tight">Institutional target: &gt; 1.5</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Avg Hold Time</p>
                            <p className="text-4xl font-serif font-bold text-stone-100">
                                {(backtestResult.averageHoldTime || 0).toFixed(1)} <span className="text-sm font-sans text-stone-500 uppercase">Days</span>
                            </p>
                            <p className="text-[10px] text-stone-500 italic leading-tight">Average duration per trade</p>
                        </div>
                    </div>

                    <div className="bg-stone-800/50 p-6 rounded-lg border border-stone-700/50">
                        <div className="flex items-start gap-4">
                            <div className="bg-amber-500/10 p-2 rounded text-amber-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.326.188 3 1.732 3z" /></svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-stone-300 uppercase tracking-widest leading-none">Friction & Reliability Analysis</p>
                                <p className="text-sm text-stone-400 italic leading-relaxed">
                                    "Strategy V5 Analysis: Outperforming benchmark by <b>{(backtestResult.alphaVsBenchmark || 0).toFixed(1)}%</b> with
                                    a Profit Factor of <b>{(backtestResult.profitFactor || 0).toFixed(2)}</b>.
                                    Triple Screen EMA filtering has successfully identified <b>{backtestResult.totalTrades || 0}</b> high-confidence trade windows."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-stone-500 italic">Unable to retrieve backtest data.</p>
            )}
        </div>
    );
};
