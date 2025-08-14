import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import WorkingCandlestickChart from "@/components/charts/working-candlestick-chart";

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

interface CleanHistoricalChartProps {
  symbol?: string;
  timeframe?: string;
}

export default function CleanHistoricalChart({ symbol = "SPY", timeframe = "1M" }: CleanHistoricalChartProps) {
  const [viewRange, setViewRange] = useState({ start: 0, end: 250 }); // Show first 250 candles by default
  const [zoomLevel, setZoomLevel] = useState(250); // Number of candles to show
  const [currentZoomStart, setCurrentZoomStart] = useState(0); // Track current zoom position
  const [allData, setAllData] = useState<HistoricalDataPoint[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Fetch initial 1 year of data
  const { data: historicalData = [], isLoading } = useQuery({
    queryKey: [`/api/historical-data/${symbol}?timeframe=${timeframe}&limit=50000`],
    enabled: !!symbol,
  });

  // Update allData when initial data loads
  useEffect(() => {
    if (Array.isArray(historicalData) && historicalData.length > 0) {
      setAllData(historicalData);
    }
  }, [historicalData]);

  // Load more historical data when needed
  const loadMoreData = useCallback(async (direction: 'older' | 'newer') => {
    if (isLoadingMore || allData.length === 0) return;
    
    setIsLoadingMore(true);
    try {
      const baseTimestamp = direction === 'older' 
        ? allData[allData.length - 1]?.timestamp 
        : allData[0]?.timestamp;
        
      if (!baseTimestamp) return;
      
      const response = await fetch(`/api/historical-data/${symbol}?timeframe=${timeframe}&limit=10000&${direction === 'older' ? 'before' : 'after'}=${baseTimestamp}`);
      const newData = await response.json();
      
      if (newData && newData.length > 0) {
        setAllData(prev => {
          if (direction === 'older') {
            return [...prev, ...newData];
          } else {
            return [...newData, ...prev];
          }
        });
      }
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [symbol, timeframe, allData, isLoadingMore]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-navy-800 rounded-lg">
        <div className="text-white">Loading chart data...</div>
      </div>
    );
  }

  if (!allData || allData.length === 0) {
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
      end: Math.min(prev.start + newZoom, allData.length) 
    }));
  };

  const handleZoomOut = () => {
    const newZoom = Math.min(allData.length, Math.floor(zoomLevel * 1.4));
    setZoomLevel(newZoom);
    setViewRange(prev => ({ 
      start: prev.start, 
      end: Math.min(prev.start + newZoom, allData.length) 
    }));
  };

  const handleReset = () => {
    setZoomLevel(250);
    setViewRange({ start: 0, end: Math.min(250, allData.length) });
  };

  const handleZoomChange = (startIndex: number, endIndex: number) => {
    setCurrentZoomStart(startIndex);
    const newZoomLevel = endIndex - startIndex;
    setZoomLevel(newZoomLevel);
    setViewRange({ start: startIndex, end: endIndex });
  };

  const handlePanLeft = async () => {
    const step = Math.floor(zoomLevel * 0.2); // Move by 20% of current zoom
    const newStart = Math.max(0, viewRange.start - step);
    
    // Check if we need to load more older data
    if (newStart < 100 && !isLoadingMore) {
      await loadMoreData('older');
    }
    
    setViewRange({
      start: newStart,
      end: Math.min(newStart + zoomLevel, allData.length)
    });
    setCurrentZoomStart(newStart);
  };

  const handlePanRight = async () => {
    const step = Math.floor(zoomLevel * 0.2); // Move by 20% of current zoom
    const newStart = Math.min(allData.length - zoomLevel, viewRange.start + step);
    
    // Check if we need to load more newer data  
    if (newStart + zoomLevel > allData.length - 100 && !isLoadingMore) {
      await loadMoreData('newer');
    }
    
    setViewRange({
      start: newStart,
      end: Math.min(newStart + zoomLevel, allData.length)
    });
    setCurrentZoomStart(newStart);
  };

  // Get data for current view
  const viewData = allData.slice(viewRange.start, viewRange.end);
  const latestPrice = allData[0] ? parseFloat(allData[0].close) : 0;
  const previousPrice = allData[1] ? parseFloat(allData[1].close) : 0;
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-white font-semibold text-lg">
            {symbol} - {allData.length.toLocaleString()} candles loaded
          </h3>
          <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
            AUTHENTIC DATA
          </div>
          {isLoadingMore && (
            <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
              LOADING MORE...
            </div>
          )}
        </div>
        <div className="text-right text-sm text-gray-400">
          <div>Latest: {allData[0]?.timestamp ? new Date(allData[0].timestamp).toLocaleString() : 'N/A'}</div>
          <div>Records: {allData.length.toLocaleString()}</div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex items-center justify-between p-4 bg-navy-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePanLeft} disabled={isLoadingMore}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePanRight} disabled={isLoadingMore}>
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
          Showing {viewRange.start + 1}-{viewRange.end} of {allData.length} candles (Zoom: {zoomLevel})
        </div>
      </div>

      {/* Actual Candlestick Chart */}
      <div className="bg-navy-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white text-xl font-bold">{symbol} Chart</h4>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">${latestPrice.toFixed(2)}</div>
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
        
        <WorkingCandlestickChart 
          data={viewData}
          symbol={symbol}
          height="450px"
          onZoomChange={handleZoomChange}
          onDataRangeChange={loadMoreData}
        />
        
        {/* Market Session Legend */}
        <div className="flex items-center justify-center space-x-6 mt-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 bg-opacity-20 border border-blue-500 rounded"></div>
            <span className="text-gray-400">Pre-Market (4:00-9:30 AM)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-600 border border-gray-500 rounded"></div>
            <span className="text-gray-400">Regular Market (9:30 AM-4:00 PM)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 bg-opacity-20 border border-purple-500 rounded"></div>
            <span className="text-gray-400">After-Hours (4:00-8:00 PM)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-px bg-gray-500"></div>
            <span className="text-gray-400">Day Dividers</span>
          </div>
        </div>
      </div>
    </div>
  );
}