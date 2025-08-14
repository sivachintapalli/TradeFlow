import { useQuery } from "@tanstack/react-query";
import CandlestickChart from "@/components/charts/candlestick-chart";

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

      <CandlestickChart 
        data={historicalData}
        symbol={symbol}
        isHistorical={true}
        className="h-96 w-full bg-navy-800 rounded-lg"
      />
    </div>
  );
}