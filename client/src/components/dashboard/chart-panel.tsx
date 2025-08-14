import { TrendingUp } from "lucide-react";
import type { MarketData } from "@shared/schema";

interface ChartPanelProps {
  symbol: string;
  marketData?: MarketData;
  isHistorical: boolean;
}

export default function ChartPanel({ symbol, marketData, isHistorical }: ChartPanelProps) {
  return (
    <div className="chart-container rounded-xl p-6 h-96" data-testid="chart-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            {symbol} - {isHistorical ? 'Historical Analysis' : 'Live Trading'}
          </h3>
          <div className="flex items-center space-x-3">
            <span 
              className="font-mono text-2xl font-bold"
              data-testid="chart-price"
            >
              ${marketData?.price || "0.00"}
            </span>
            <span 
              className={`font-mono text-sm ${
                marketData && parseFloat(marketData.change) >= 0 ? 'price-up' : 'price-down'
              }`}
              data-testid="chart-change"
            >
              {marketData?.change && parseFloat(marketData.change) >= 0 ? '+' : ''}
              {marketData?.change || '0.00'} ({marketData?.changePercent || '0.00'}%)
            </span>
          </div>
          {!isHistorical && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-bullish rounded-full pulse-dot"></div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
          )}
        </div>
        <div 
          className="text-sm text-gray-400"
          data-testid="chart-last-update"
        >
          Last updated: {marketData?.lastUpdate 
            ? new Date(marketData.lastUpdate).toLocaleString() 
            : 'Never'
          }
        </div>
      </div>
      
      {/* Chart Placeholder */}
      <div className="bg-navy-800/50 rounded-lg h-80 flex items-center justify-center border border-white/10">
        <div className="text-center text-gray-400">
          <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${!isHistorical ? 'text-green-bullish' : ''}`} />
          <p className="text-lg">
            {isHistorical ? 'Interactive Candlestick Chart' : 'Live Trading Chart'}
          </p>
          <p className="text-sm">
            {isHistorical ? 'Historical price data visualization' : 'Real-time market data stream'}
          </p>
        </div>
      </div>
    </div>
  );
}
