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
    buyAndHoldReturn: number;
    alphaVsBenchmark: number;
    activePosition: ActivePosition | null;
    trades: BacktestTrade[];
}

export interface ActivePosition {
    type: 'LONG' | 'SHORT';
    avgEntryPrice: number;
    weight: number;
    floatingProfit: number;
    floatingReturn: number;
    entryDate: string;
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
            buyAndHoldReturn: 0,
            alphaVsBenchmark: 0,
            activePosition: null,
            trades: []
        };
    }

    const strategy = new AntiGravityStrategy();
    const { ENTRY_MULTIPLIER, ENTRY_2_MULTIPLIER, PROFIT_TAKE_MULTIPLIER } = DEFAULT_CONFIG;
    const trades: BacktestTrade[] = [];
    let currentPosition: {
        type: 'LONG' | 'SHORT';
        entryPrice: number;
        entryDate: string;
        entryIndex: number;
        weight: number;
        partialExitTaken: boolean;
        avgEntryPrice: number; // Keep track of original average entry for breakeven
    } | null = null;

    let equity = 100000;
    let netEquity = 100000;
    const initialEquity = equity;
    let peakEquity = equity;
    let maxDrawdown = 0;
    let totalCosts = 0;

    for (let i = 22; i < candles.length; i++) {
        const slice = candles.slice(0, i + 1);
        const currentWeight = currentPosition ? currentPosition.weight : 0;
        const result = strategy.generateSignal(slice, currentWeight);
        if (!result) continue;

        const currentCandle = candles[i];
        const atr = parseFloat(result.atr);
        const sma20 = slice.slice(-20).reduce((a, b) => a + b.close, 0) / 20;

        // Check for exits (Exits apply to entire position)
        if (currentPosition) {
            // 1. Partial Profit Taking (50% of weight)
            if (!currentPosition.partialExitTaken) {
                const profitTarget = currentPosition.type === 'LONG'
                    ? currentPosition.avgEntryPrice + (atr * PROFIT_TAKE_MULTIPLIER)
                    : currentPosition.avgEntryPrice - (atr * PROFIT_TAKE_MULTIPLIER);

                const isTargetHit = currentPosition.type === 'LONG'
                    ? currentCandle.high >= profitTarget
                    : currentCandle.low <= profitTarget;

                if (isTargetHit) {
                    const exitPrice = profitTarget; // Assume exit at target
                    const partialWeight = currentPosition.weight * 0.5;
                    const netProfit = currentPosition.type === 'LONG'
                        ? (exitPrice * (1 - SLIPPAGE) - currentPosition.avgEntryPrice) * partialWeight
                        : (currentPosition.avgEntryPrice - exitPrice * (1 + SLIPPAGE)) * partialWeight;

                    const slippageImpact = Math.abs(exitPrice * SLIPPAGE) * partialWeight;
                    totalCosts += slippageImpact + TRANSACTION_FEE;

                    const returnPercent = (netProfit / (currentPosition.avgEntryPrice * partialWeight)) * 100;
                    netEquity *= (1 + returnPercent / 100);

                    trades.push({
                        type: currentPosition.type,
                        entryDate: currentPosition.entryDate,
                        entryPrice: currentPosition.avgEntryPrice,
                        entryIndex: currentPosition.entryIndex,
                        exitDate: currentCandle.date,
                        exitPrice: exitPrice,
                        exitIndex: i,
                        profit: netProfit,
                        returnPercent: (netProfit / (currentPosition.avgEntryPrice * currentPosition.weight)) * 100,
                        cost: slippageImpact + TRANSACTION_FEE
                    });

                    currentPosition.weight -= partialWeight;
                    currentPosition.partialExitTaken = true;
                    // Move remaining position to breakeven stop by updating entryPrice used in exit calc
                    // (Actually we keep avgEntryPrice for reference but the logic below uses entryPrice)
                }
            }

            // 2. Full Exit (Exits apply to remaining weight)
            let shouldExit = false;
            if (currentPosition.type === 'LONG' && (result.signal === 'EXIT_LONG' || result.signal === 'STRONG_SELL')) {
                shouldExit = true;
            } else if (currentPosition.type === 'SHORT' && (result.signal === 'EXIT_SHORT' || result.signal === 'STRONG_BUY')) {
                shouldExit = true;
            }

            // Breakeven Stop (if partial exit taken)
            if (currentPosition.partialExitTaken) {
                const isBreakevenHit = currentPosition.type === 'LONG'
                    ? currentCandle.close < currentPosition.avgEntryPrice
                    : currentCandle.close > currentPosition.avgEntryPrice;
                if (isBreakevenHit) shouldExit = true;
            }

            if (shouldExit) {
                const exitPrice = currentCandle.close;
                const exitPriceWithSlippage = currentPosition.type === 'LONG'
                    ? exitPrice * (1 - SLIPPAGE)
                    : exitPrice * (1 + SLIPPAGE);

                const netProfit = currentPosition.type === 'LONG'
                    ? (exitPriceWithSlippage - currentPosition.avgEntryPrice) * currentPosition.weight
                    : (currentPosition.avgEntryPrice - exitPriceWithSlippage) * currentPosition.weight;

                const slippageImpact = Math.abs(exitPrice * SLIPPAGE) * currentPosition.weight;
                const tradeCost = slippageImpact + TRANSACTION_FEE;
                totalCosts += tradeCost;

                const netReturnPercent = (netProfit / (currentPosition.avgEntryPrice * currentPosition.weight)) * 100;
                netEquity *= (1 + netReturnPercent / 100);

                if (netEquity > peakEquity) peakEquity = netEquity;
                const dd = (peakEquity - netEquity) / peakEquity;
                if (dd > maxDrawdown) maxDrawdown = dd;

                trades.push({
                    type: currentPosition.type,
                    entryDate: currentPosition.entryDate,
                    entryPrice: currentPosition.avgEntryPrice,
                    entryIndex: currentPosition.entryIndex,
                    exitDate: currentCandle.date,
                    exitPrice: currentCandle.close,
                    exitIndex: i,
                    profit: netProfit,
                    returnPercent: netReturnPercent,
                    cost: tradeCost
                });
                currentPosition = null;
            }
        }

        // 3. Entry Logic
        if (!currentPosition) {
            if (result.signal === 'STRONG_BUY' || result.signal === 'STRONG_SELL') {
                const isLong = result.signal === 'STRONG_BUY';
                const weight = result.positionSize * 0.5; // Initial stage
                const entryPrice = isLong ? currentCandle.close * (1 + SLIPPAGE) : currentCandle.close * (1 - SLIPPAGE);

                currentPosition = {
                    type: isLong ? 'LONG' : 'SHORT',
                    entryPrice: entryPrice,
                    avgEntryPrice: entryPrice,
                    entryDate: currentCandle.date,
                    entryIndex: i,
                    weight: weight,
                    partialExitTaken: false
                };
                totalCosts += (entryPrice * SLIPPAGE * weight) + TRANSACTION_FEE;
            }
        } else {
            // Pyramiding stage
            if ((result.signal === 'PYRAMID_BUY' && currentPosition.type === 'LONG') ||
                (result.signal === 'PYRAMID_SELL' && currentPosition.type === 'SHORT')) {
                if (currentPosition.weight < result.positionSize) {
                    const addWeight = Math.min(0.5, result.positionSize - currentPosition.weight);
                    const entryPrice = currentPosition.type === 'LONG' ? currentCandle.close * (1 + SLIPPAGE) : currentCandle.close * (1 - SLIPPAGE);
                    const newTotalWeight = currentPosition.weight + addWeight;
                    currentPosition.avgEntryPrice = (currentPosition.avgEntryPrice * currentPosition.weight + entryPrice * addWeight) / newTotalWeight;
                    currentPosition.weight = newTotalWeight;
                    totalCosts += (entryPrice * SLIPPAGE * addWeight) + TRANSACTION_FEE;
                }
            }
        }
    }

    const netTradeProfits = trades.map(t => t.profit - t.cost);
    const wins = netTradeProfits.filter(p => p > 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

    // Compounding Net Return calculation
    const netReturnAfterCosts = ((netEquity - initialEquity) / initialEquity) * 100;
    const totalReturn = ((equity - initialEquity) / initialEquity) * 100;

    // Benchmark Analysis (S&P 500 Buy & Hold)
    const firstPrice = candles[22].close;
    const lastPrice = candles[candles.length - 1].close;
    const buyAndHoldReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    const alphaVsBenchmark = netReturnAfterCosts - buyAndHoldReturn;

    // Advanced Metrics
    const totalProfit = netTradeProfits.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const totalLoss = Math.abs(netTradeProfits.filter(p => p < 0).reduce((a, b) => a + b, 0));
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

    const totalHoldTime = trades.reduce((acc, t) => acc + (t.exitIndex - t.entryIndex), 0);
    const averageHoldTime = trades.length > 0 ? totalHoldTime / trades.length : 0;

    // Current Active Position Analysis
    let activePosition: ActivePosition | null = null;
    if (currentPosition) {
        const lastCandle = candles[candles.length - 1];
        const floatingProfit = currentPosition.type === 'LONG'
            ? (lastCandle.close - currentPosition.avgEntryPrice) * currentPosition.weight
            : (currentPosition.avgEntryPrice - lastCandle.close) * currentPosition.weight;
        const floatingReturn = (floatingProfit / (currentPosition.avgEntryPrice * currentPosition.weight)) * 100;

        activePosition = {
            type: currentPosition.type,
            avgEntryPrice: currentPosition.avgEntryPrice,
            weight: currentPosition.weight,
            floatingProfit,
            floatingReturn,
            entryDate: currentPosition.entryDate
        };
    }

    return {
        totalTrades: trades.length,
        winRate,
        totalReturn,
        netReturnAfterCosts,
        mdd: maxDrawdown * 100,
        totalCosts,
        profitFactor,
        averageHoldTime,
        buyAndHoldReturn,
        alphaVsBenchmark,
        activePosition,
        trades
    };
}
