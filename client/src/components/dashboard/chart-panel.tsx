import { TrendingUp, Loader2 } from "lucide-react";
import CandlestickChart from "@/components/charts/candlestick-chart";
import { useHistoricalData } from "@/hooks/use-trading-data";
import type { MarketData } from "@shared/schema";

interface ChartPanelProps {
  symbol: string;
  marketData?: MarketData;
  isHistorical: boolean;
  timeframe?: string;
}

export default function ChartPanel({ symbol, marketData, isHistorical, timeframe = '1D' }: ChartPanelProps) {
  const { data: historicalData, isLoading: historyLoading, error } = useHistoricalData(
    symbol, 
    timeframe, 
    isHistorical ? 200 : 50
  );

  const showChart = historicalData && historicalData.length > 0;

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
              ${marketData?.price || (showChart ? historicalData[historicalData.length - 1]?.close : "0.00")}
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
      
      {/* Chart Content */}
      <div className="bg-navy-800/50 rounded-lg h-80 border border-white/10 overflow-hidden">
        {historyLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-primary" />
              <p className="text-lg">Loading Chart Data</p>
              <p className="text-sm">Fetching {symbol} historical data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-red-bearish" />
              <p className="text-lg">Chart Data Unavailable</p>
              <p className="text-sm">Unable to load historical data for {symbol}</p>
            </div>
          </div>
        ) : showChart ? (
          <CandlestickChart 
            data={historicalData}
            symbol={symbol}
            isHistorical={isHistorical}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${!isHistorical ? 'text-green-bullish' : ''}`} />
              <p className="text-lg">No Chart Data Available</p>
              <p className="text-sm">
                {isHistorical ? 'Load historical data to view chart' : 'Waiting for real-time data stream'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
