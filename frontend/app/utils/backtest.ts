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
    netProfitAmount: number; // Raw $ PnL
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
    SLIPPAGE_TICKS: number;    // E.g., 1 tick = 0.25 points in ES
    TICK_VALUE: number;        // E.g., 1 tick = $12.50 in ES
    TICK_SIZE: number;         // E.g., 0.25 in ES
    TRANSACTION_FEE: number;   // E.g., $5.00 per round trip
    INITIAL_MARGIN: number;    // E.g., $13500 for ES
    FUTURES_MULTIPLIER: number; // E.g., 50 for ES
}

/**
 * Backtest Engine for Anti-Gravity Strategy with Real-World Costs
 */
export async function runBacktest(
    candles: Candle[],
    config: Partial<BacktestConfig> = {}
): Promise<BacktestResult> {
    const {
        SLIPPAGE_TICKS = 1,
        TICK_VALUE = 12.50,
        TICK_SIZE = 0.25,
        TRANSACTION_FEE = 5.0,
        INITIAL_MARGIN = 13500,
        FUTURES_MULTIPLIER = 50
    } = config;

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
            netProfitAmount: 0,
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

                    // Realistic Tick Slippage applied to point price
                    const actualExitPrice = currentPosition.type === 'LONG'
                        ? exitPrice - (SLIPPAGE_TICKS * TICK_SIZE)
                        : exitPrice + (SLIPPAGE_TICKS * TICK_SIZE);

                    const pointDiff = currentPosition.type === 'LONG'
                        ? (actualExitPrice - currentPosition.avgEntryPrice)
                        : (currentPosition.avgEntryPrice - actualExitPrice);

                    const netProfit = pointDiff * FUTURES_MULTIPLIER * partialWeight;

                    const tradeCost = TRANSACTION_FEE;
                    totalCosts += tradeCost;

                    const returnPercent = (netProfit / initialEquity) * 100;
                    netEquity += (netProfit - TRANSACTION_FEE);

                    trades.push({
                        type: currentPosition.type,
                        entryDate: currentPosition.entryDate,
                        entryPrice: currentPosition.avgEntryPrice,
                        entryIndex: currentPosition.entryIndex,
                        exitDate: currentCandle.date,
                        exitPrice: exitPrice,
                        exitIndex: i,
                        profit: netProfit,
                        returnPercent: returnPercent,
                        cost: tradeCost
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

                // Realistic Tick Slippage applied to point price
                const actualExitPrice = currentPosition.type === 'LONG'
                    ? exitPrice - (SLIPPAGE_TICKS * TICK_SIZE)
                    : exitPrice + (SLIPPAGE_TICKS * TICK_SIZE);

                const pointDiff = currentPosition.type === 'LONG'
                    ? (actualExitPrice - currentPosition.avgEntryPrice)
                    : (currentPosition.avgEntryPrice - actualExitPrice);

                const netProfit = pointDiff * FUTURES_MULTIPLIER * currentPosition.weight;

                const tradeCost = TRANSACTION_FEE;
                totalCosts += tradeCost;

                const netReturnPercent = (netProfit / initialEquity) * 100;
                netEquity += (netProfit - TRANSACTION_FEE);

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

        // 3. Entry Logic & Margin Validation
        if (!currentPosition) {
            if (result.signal === 'STRONG_BUY' || result.signal === 'STRONG_SELL') {
                const isLong = result.signal === 'STRONG_BUY';

                // Strict Initial Margin Check
                // E.g., User wants to trade 1 contract (weight = 1), does netEquity cover INITIAL_MARGIN?
                // For this simulation, we assume base 1 contract execution, but cap it to 0 if not enough margin
                let contractSize = 1;
                if (netEquity < (INITIAL_MARGIN * contractSize)) {
                    continue; // Engine denies entry due to insufficient funds (Margin Call protection)
                }

                // Initial position assigns 1 contract
                const weight = contractSize;

                // Realistic Entry Slippage
                const entryPrice = isLong
                    ? currentCandle.close + (SLIPPAGE_TICKS * TICK_SIZE)
                    : currentCandle.close - (SLIPPAGE_TICKS * TICK_SIZE);

                currentPosition = {
                    type: isLong ? 'LONG' : 'SHORT',
                    entryPrice: entryPrice,
                    avgEntryPrice: entryPrice,
                    entryDate: currentCandle.date,
                    entryIndex: i,
                    weight: weight,
                    partialExitTaken: false
                };
                totalCosts += TRANSACTION_FEE;
            }
        } else {
            // Pyramiding stage
            if ((result.signal === 'PYRAMID_BUY' && currentPosition.type === 'LONG') ||
                (result.signal === 'PYRAMID_SELL' && currentPosition.type === 'SHORT')) {
                // If we want to pyramid another contract, check margin
                if (netEquity >= (INITIAL_MARGIN * (currentPosition.weight + 1))) {
                    const addWeight = 1;
                    const entryPrice = currentPosition.type === 'LONG'
                        ? currentCandle.close + (SLIPPAGE_TICKS * TICK_SIZE)
                        : currentCandle.close - (SLIPPAGE_TICKS * TICK_SIZE);

                    const newTotalWeight = currentPosition.weight + addWeight;
                    currentPosition.avgEntryPrice = (currentPosition.avgEntryPrice * currentPosition.weight + entryPrice * addWeight) / newTotalWeight;
                    currentPosition.weight = newTotalWeight;
                    totalCosts += TRANSACTION_FEE;
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

        const pointDiff = currentPosition.type === 'LONG'
            ? (lastCandle.close - currentPosition.avgEntryPrice)
            : (currentPosition.avgEntryPrice - lastCandle.close);

        const floatingProfit = FUTURES_MULTIPLIER
            ? pointDiff * FUTURES_MULTIPLIER * currentPosition.weight
            : pointDiff * currentPosition.weight;

        const floatingReturn = FUTURES_MULTIPLIER
            ? (floatingProfit / initialEquity) * 100
            : (floatingProfit / (currentPosition.avgEntryPrice * currentPosition.weight)) * 100;

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
        netProfitAmount: netEquity - initialEquity,
        activePosition,
        trades
    };
}
