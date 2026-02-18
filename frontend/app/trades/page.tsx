'use client';

import { useTradeData } from '../hooks/useTradeData';
import TradeForm from '../components/TradeForm';
import TradeList from '../components/TradeList';
import PortfolioStats from '../components/PortfolioStats';
import HoldingsSection from '../components/HoldingsSection';

export default function TradingJournalPage() {
    const {
        trades,
        loading,
        currentPrices,
        portfolioStats,
        addTrade,
        deleteTrade
    } = useTradeData();

    if (loading) return <div className="p-8 text-stone-400 font-serif italic">Loading your portfolio...</div>;

    const { roi, netPL, totalRealizedPL, unrealizedPL, symbolMap } = portfolioStats;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900">Trading Journal</h1>
                    <p className="text-stone-500 font-serif italic mt-1">Keep track of your market journey.</p>
                </div>
            </header>

            <PortfolioStats
                roi={roi}
                netPL={netPL}
                realizedPL={totalRealizedPL}
                unrealizedPL={unrealizedPL}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <TradeForm onTradeAdded={addTrade} />
                    <HoldingsSection
                        symbolMap={symbolMap}
                        currentPrices={currentPrices}
                    />
                </div>

                <div className="lg:col-span-2">
                    <h3 className="text-xl font-serif font-bold text-stone-800 mb-4">Recent Trades</h3>
                    <TradeList trades={trades} onDelete={deleteTrade} />
                </div>
            </div>
        </div>
    );
}
