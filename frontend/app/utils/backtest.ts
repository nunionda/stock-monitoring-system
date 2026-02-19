import { Candle, AntiGravityStrategy, DEFAULT_CONFIG } from './strategy';

export interface BacktestResult {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    netReturnAfterCosts: number;
    mdd: number;
    totalCosts: number;
    profitFactor: number;
    averageHoldTime: number; // In days/candles
    trades: BacktestTrade[];
}

export interface BacktestTrade {
    type: 'LONG' | 'SHORT';
    entryDate: string;
    entryPrice: number;
    exitDate: string;
    exitPrice: number;
    entryIndex: number;
    exitIndex: number;
    profit: number;
    returnPercent: number;
    cost: number;
}

export interface BacktestConfig {
    SLIPPAGE: number;
    TRANSACTION_FEE: number;
    ROLLOVER_FRICTION: number;
}

/**
 * Backtest Engine for Anti-Gravity Strategy with Real-World Costs
 */
export async function runBacktest(
    candles: Candle[],
    config: Partial<BacktestConfig> = {}
): Promise<BacktestResult> {
    const { SLIPPAGE, TRANSACTION_FEE } = { ...DEFAULT_CONFIG.COSTS, ...config };

    if (candles.length < 50) {
        return {
            totalTrades: 0,
            winRate: 0,
            totalReturn: 0,
            netReturnAfterCosts: 0,
            mdd: 0,
            totalCosts: 0,
            profitFactor: 0,
            averageHoldTime: 0,
            trades: []
        };
    }

    const strategy = new AntiGravityStrategy();
    const { ENTRY_MULTIPLIER, ENTRY_2_MULTIPLIER } = DEFAULT_CONFIG;
    const trades: BacktestTrade[] = [];
    let currentPosition: {
        type: 'LONG' | 'SHORT';
        entryPrice: number;
        entryDate: string;
        entryIndex: number;
        weight: number; // 0.5 or 1.0
    } | null = null;

    let equity = 100000;
    let netEquity = 100000;
    const initialEquity = equity;
    let peakEquity = equity;
    let maxDrawdown = 0;
    let totalCosts = 0;

    for (let i = 22; i < candles.length; i++) {
        const slice = candles.slice(0, i + 1);
        const result = strategy.generateSignal(slice);
        if (!result) continue;

        const currentCandle = candles[i];
        const atr = parseFloat(result.atr);
        const sma20 = slice.slice(-20).reduce((a, b) => a + b.close, 0) / 20;

        // Check for exits (Exits apply to entire position)
        if (currentPosition) {
            let shouldExit = false;
            if (currentPosition.type === 'LONG' && (result.signal === 'EXIT_LONG' || result.signal === 'STRONG_SELL')) {
                shouldExit = true;
            } else if (currentPosition.type === 'SHORT' && (result.signal === 'EXIT_SHORT' || result.signal === 'STRONG_BUY')) {
                shouldExit = true;
            }

            if (shouldExit) {
                // Apply Slippage to Exit
                const exitPriceWithSlippage = currentPosition.type === 'LONG'
                    ? currentCandle.close * (1 - SLIPPAGE)
                    : currentCandle.close * (1 + SLIPPAGE);

                const rawProfit = currentPosition.type === 'LONG'
                    ? (currentCandle.close - currentPosition.entryPrice) * currentPosition.weight
                    : (currentPosition.entryPrice - currentCandle.close) * currentPosition.weight;

                const netProfit = currentPosition.type === 'LONG'
                    ? (exitPriceWithSlippage - currentPosition.entryPrice) * currentPosition.weight
                    : (currentPosition.entryPrice - exitPriceWithSlippage) * currentPosition.weight;

                // Costs
                const slippageImpact = Math.abs(currentCandle.close - exitPriceWithSlippage) * currentPosition.weight;
                const tradeCost = slippageImpact + TRANSACTION_FEE;
                totalCosts += tradeCost;

                const returnPercent = (rawProfit / currentPosition.entryPrice) * 100;
                const netReturnPercent = (netProfit / currentPosition.entryPrice) * 100;

                equity *= (1 + returnPercent / 100);
                netEquity *= (1 + (netReturnPercent - (TRANSACTION_FEE / currentPosition.entryPrice * 100)) / 100);

                if (netEquity > peakEquity) peakEquity = netEquity;
                const dd = (peakEquity - netEquity) / peakEquity;
                if (dd > maxDrawdown) maxDrawdown = dd;

                trades.push({
                    type: currentPosition.type,
                    entryDate: currentPosition.entryDate,
                    entryPrice: currentPosition.entryPrice,
                    entryIndex: currentPosition.entryIndex,
                    exitDate: currentCandle.date,
                    exitPrice: currentCandle.close,
                    exitIndex: i,
                    profit: rawProfit,
                    returnPercent,
                    cost: tradeCost
                });
                currentPosition = null;
            }
        }

        // ENTRY & PYRAMIDING Check
        if (result.signal === 'STRONG_BUY' || result.signal === 'STRONG_SELL') {
            const isLong = result.signal === 'STRONG_BUY';
            const entryLevel1 = isLong ? (sma20 + atr * ENTRY_MULTIPLIER) : (sma20 - atr * ENTRY_MULTIPLIER);
            const entryLevel2 = isLong ? (sma20 + atr * ENTRY_2_MULTIPLIER) : (sma20 - atr * ENTRY_2_MULTIPLIER);

            if (!currentPosition) {
                // 1st Entry (50% weight)
                const entryPriceWithSlippage = isLong ? currentCandle.close * (1 + SLIPPAGE) : currentCandle.close * (1 - SLIPPAGE);
                currentPosition = {
                    type: isLong ? 'LONG' : 'SHORT',
                    entryPrice: entryPriceWithSlippage,
                    entryDate: currentCandle.date,
                    entryIndex: i,
                    weight: 0.5
                };
                totalCosts += TRANSACTION_FEE; // 1st leg fee
            } else if (currentPosition.weight === 0.5 && currentPosition.type === (isLong ? 'LONG' : 'SHORT')) {
                // 2nd Entry (Pyramid)
                const isPyramidTriggered = isLong ? currentCandle.close > entryLevel2 : currentCandle.close < entryLevel2;
                if (isPyramidTriggered) {
                    const entryPrice2WithSlippage = isLong ? currentCandle.close * (1 + SLIPPAGE) : currentCandle.close * (1 - SLIPPAGE);
                    // Average the entry price for the combined position
                    const totalWeight = 1.0;
                    const avgEntryPrice = (currentPosition.entryPrice * 0.5 + entryPrice2WithSlippage * 0.5) / totalWeight;

                    currentPosition.entryPrice = avgEntryPrice;
                    currentPosition.weight = 1.0;
                    totalCosts += TRANSACTION_FEE; // 2nd leg fee
                }
            }
        }
    }

    const netTradeProfits = trades.map(t => t.profit - t.cost);
    const wins = netTradeProfits.filter(p => p > 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const totalReturn = ((equity - initialEquity) / initialEquity) * 100;
    const netReturnAfterCosts = ((netEquity - initialEquity) / initialEquity) * 100;

    // Advanced Metrics
    const totalProfit = netTradeProfits.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const totalLoss = Math.abs(netTradeProfits.filter(p => p < 0).reduce((a, b) => a + b, 0));
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

    const totalHoldTime = trades.reduce((acc, t) => acc + (t.exitIndex - t.entryIndex), 0);
    const averageHoldTime = trades.length > 0 ? totalHoldTime / trades.length : 0;

    return {
        totalTrades: trades.length,
        winRate,
        totalReturn,
        netReturnAfterCosts,
        mdd: maxDrawdown * 100,
        totalCosts,
        profitFactor,
        averageHoldTime,
        trades
    };
}
