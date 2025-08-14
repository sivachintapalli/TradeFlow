import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [viewRange, setViewRange] = useState({ start: 0, end: 100 }); // Show first 100 candles by default
  const [zoomLevel, setZoomLevel] = useState(100); // Number of candles to show
  
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

  // Zoom and navigation controls
  const handleZoomIn = () => {
    const newZoom = Math.max(10, Math.floor(zoomLevel * 0.7));
    setZoomLevel(newZoom);
    setViewRange(prev => ({ 
      start: prev.start, 
      end: Math.min(prev.start + newZoom, historicalData.length) 
    }));
  };

  const handleZoomOut = () => {
    const newZoom = Math.min(historicalData.length, Math.floor(zoomLevel * 1.4));
    setZoomLevel(newZoom);
    setViewRange(prev => ({ 
      start: prev.start, 
      end: Math.min(prev.start + newZoom, historicalData.length) 
    }));
  };

  const handleReset = () => {
    setZoomLevel(100);
    setViewRange({ start: 0, end: Math.min(100, historicalData.length) });
  };

  const handlePanLeft = () => {
    const step = Math.floor(zoomLevel * 0.2);
    setViewRange(prev => ({
      start: Math.max(0, prev.start - step),
      end: Math.max(step, prev.end - step)
    }));
  };

  const handlePanRight = () => {
    const step = Math.floor(zoomLevel * 0.2);
    setViewRange(prev => ({
      start: Math.min(historicalData.length - zoomLevel, prev.start + step),
      end: Math.min(historicalData.length, prev.end + step)
    }));
  };

  // Get data for current view
  const viewData = historicalData.slice(viewRange.start, viewRange.end);
  const recentData = viewData.slice(0, 10);
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

      {/* Chart Controls */}
      <div className="flex items-center justify-between p-4 bg-navy-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePanLeft} disabled={viewRange.start <= 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePanRight} disabled={viewRange.end >= historicalData.length}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-gray-600 mx-2" />
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-400">
          Showing {viewRange.start + 1}-{viewRange.end} of {historicalData.length} candles (Zoom: {zoomLevel})
        </div>
      </div>

      {/* Chart Display */}
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
              <h5 className="text-gray-400 text-sm font-medium">
                Current View Data ({viewData.length} candles):
              </h5>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {recentData.map((candle, index) => {
                  const candleIndex = viewRange.start + index;
                  return (
                    <div key={candle.id} className="flex justify-between text-xs">
                      <span className="text-gray-400">#{candleIndex} {new Date(candle.timestamp).toLocaleTimeString()}</span>
                      <span className="text-white">${parseFloat(candle.close).toFixed(2)}</span>
                      <span className="text-gray-400">{candle.volume.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Navigation info */}
              <div className="mt-4 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  <div>Pan: Use arrow buttons to navigate through history</div>
                  <div>Zoom: + to see fewer candles in detail, - to see more candles</div>
                  <div>Reset: Return to default 100-candle view</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}