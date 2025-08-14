import { useQuery } from "@tanstack/react-query";

interface HistoricalDataPoint {
  id: string;
  symbol: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  timeframe: string;
  createdAt: Date | null;
}

interface SimpleHistoricalChartProps {
  symbol?: string;
  timeframe?: string;
}

export default function SimpleHistoricalChart({ symbol = "SPY", timeframe = "1M" }: SimpleHistoricalChartProps) {
  // Fetch initial 1 year of data
  const { data: historicalData = [], isLoading } = useQuery({
    queryKey: [`/api/historical-data/${symbol}?timeframe=${timeframe}&limit=50000`],
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-navy-800 rounded-lg">
        <div className="text-white">Loading chart data...</div>
      </div>
    );
  }

  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-navy-800 rounded-lg">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  // Get recent data sample for display
  const recentData = historicalData.slice(0, 10);
  const latestPrice = historicalData[0] ? parseFloat(historicalData[0].close) : 0;
  const previousPrice = historicalData[1] ? parseFloat(historicalData[1].close) : 0;
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-white font-semibold text-lg">
            {symbol} - {historicalData.length.toLocaleString()} candles loaded
          </h3>
          <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
            AUTHENTIC DATA
          </div>
        </div>
        <div className="text-right text-sm text-gray-400">
          <div>Latest: {historicalData[0]?.timestamp ? new Date(historicalData[0].timestamp).toLocaleString() : 'N/A'}</div>
          <div>Records: {historicalData.length.toLocaleString()}</div>
        </div>
      </div>

      {/* Temporary chart placeholder - working display */}
      <div className="h-96 w-full bg-navy-800 rounded-lg p-6">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white text-xl font-bold">{symbol} Chart</h4>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">${latestPrice.toFixed(2)}</div>
              <div className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
          
          <div className="flex-1 bg-navy-900 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-sm">
                <span className="text-gray-400">Open: </span>
                <span className="text-white">${historicalData[0] ? parseFloat(historicalData[0].open).toFixed(2) : 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">High: </span>
                <span className="text-white">${historicalData[0] ? parseFloat(historicalData[0].high).toFixed(2) : 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Low: </span>
                <span className="text-white">${historicalData[0] ? parseFloat(historicalData[0].low).toFixed(2) : 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Volume: </span>
                <span className="text-white">{historicalData[0] ? historicalData[0].volume.toLocaleString() : 'N/A'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h5 className="text-gray-400 text-sm font-medium">Recent Data Sample:</h5>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {recentData.map((candle, index) => (
                  <div key={candle.id} className="flex justify-between text-xs">
                    <span className="text-gray-400">{new Date(candle.timestamp).toLocaleTimeString()}</span>
                    <span className="text-white">${parseFloat(candle.close).toFixed(2)}</span>
                    <span className="text-gray-400">{candle.volume.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}