import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { Search, Download, Loader2, AlertCircle } from "lucide-react";
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

interface TickerStatus {
  symbol: string;
  hasData: boolean;
  latestTimestamp: string | null;
  needsSync: boolean;
  isMarketOpen: boolean;
  mostRecentClose: string;
}

interface DownloadProgress {
  progress: number;
  year?: number;
  completed?: boolean;
  error?: boolean;
  message?: string;
}

interface AdvancedHistoricalChartProps {
  symbol?: string;
  timeframe?: string;
}

export default function AdvancedHistoricalChart({ symbol = "SPY", timeframe = "1M" }: AdvancedHistoricalChartProps) {
  const [tickerInput, setTickerInput] = useState("");
  const [currentSymbol, setCurrentSymbol] = useState<string | null>("SPY"); // Fixed initial value
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [showNewTickerUI, setShowNewTickerUI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    progress: number;
    message?: string;
    year?: number;
    completed?: boolean;
    error?: boolean;
  } | null>(null);
  
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch ticker status
  const { data: tickerStatus } = useQuery<TickerStatus>({
    queryKey: ['/api/ticker-status', currentSymbol],
    enabled: !!currentSymbol,
  });

  // Fetch initial 1 year of data, then load more on scroll
  const { data: historicalData, isLoading: isLoadingData, refetch: refetchHistoricalData } = useQuery({
    queryKey: ['/api/historical-data', currentSymbol, timeframe],
    enabled: !!currentSymbol && !isDownloading && tickerStatus?.hasData,
    queryFn: async (): Promise<HistoricalDataPoint[]> => {
      // Calculate 1 year limit based on timeframe
      const getInitialLimit = (tf: string) => {
        switch(tf) {
          case '1M': return 365 * 24 * 60; // 1 year of 1-minute bars
          case '5M': return 365 * 24 * 12; // 1 year of 5-minute bars
          case '15M': return 365 * 24 * 4; // 1 year of 15-minute bars
          case '30M': return 365 * 24 * 2; // 1 year of 30-minute bars
          case '1H': return 365 * 24; // 1 year of 1-hour bars
          case '1D': return 365; // 1 year of daily bars
          default: return 50000; // Default fallback
        }
      };
      
      const limit = getInitialLimit(timeframe);
      console.log(`[AdvancedHistoricalChart] Loading initial ${limit.toLocaleString()} bars for ${timeframe} timeframe`);
      
      const response = await fetch(`/api/historical-data/${currentSymbol}?timeframe=${timeframe}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      return response.json();
    },
  });

  // Sync ticker mutation with status tracking
  const syncTickerMutation = useMutation({
    mutationFn: async (symbol: string) => {
      setIsDownloading(true);
      setDownloadProgress({ progress: 0, message: `Starting data sync for ${symbol}...` });
      
      const response = await fetch(`/api/sync-ticker/${symbol}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sync ticker');
      const result = await response.json();
      
      setDownloadProgress({ progress: 100, completed: true, message: `Sync completed for ${symbol}` });
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(null);
      }, 1000);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/historical-data', currentSymbol] });
      queryClient.invalidateQueries({ queryKey: ['/api/ticker-status', currentSymbol] });
      queryClient.invalidateQueries({ queryKey: ['/api/market-data', currentSymbol] });
    },
    onError: (error: any) => {
      setDownloadProgress({ progress: 0, error: true, message: error.message || 'Sync failed' });
      setIsDownloading(false);
      setError(error.message || 'Failed to sync ticker data');
    }
  });

  const handleLoadTicker = async () => {
    if (!tickerInput.trim()) return;
    
    const symbol = tickerInput.toUpperCase().trim();
    setCurrentSymbol(symbol);
    setError(null);
    setShowNewTickerUI(false);
    
    // First check if ticker exists in database
    try {
      const response = await fetch(`/api/ticker-status/${symbol}`);
      if (!response.ok) throw new Error('Failed to check ticker status');
      const status: TickerStatus = await response.json();
      
      if (!status.hasData) {
        // New ticker - show download UI
        setShowNewTickerUI(true);
        return;
      }
      
      // Existing ticker - check if sync is needed
      if (status.needsSync) {
        console.log('[AdvancedHistoricalChart] Starting background sync for', symbol);
        syncTickerMutation.mutate(symbol);
      }
      
    } catch (error: any) {
      setError(error.message || 'Failed to check ticker status');
    }
  };

  const handleDownloadTicker = async () => {
    if (!currentSymbol || !selectedPeriod) return;
    
    setIsDownloading(true);
    setDownloadProgress({ progress: 0 });
    setError(null);
    
    try {
      const response = await fetch('/api/download-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: currentSymbol, 
          period: selectedPeriod,
          timeframe: selectedTimeframe 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start download');
      }

      // Handle SSE response for progress tracking
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: DownloadProgress = JSON.parse(line.slice(6));
              setDownloadProgress(data);
              
              if (data.completed) {
                setIsDownloading(false);
                setShowNewTickerUI(false);
                // Refetch data after successful download
                refetchHistoricalData();
                queryClient.invalidateQueries({ queryKey: ['/api/ticker-status', currentSymbol] });
                return;
              } else if (data.error) {
                setIsDownloading(false);
                setError(data.message || 'Download failed');
                return;
              }
            } catch (e) {
              // Ignore parsing errors for malformed lines
            }
          }
        }
      }

    } catch (error: any) {
      setIsDownloading(false);
      setError(error.message || 'Failed to download data');
    }
  };

  const handleCancelDownload = () => {
    eventSourceRef.current?.close();
    setIsDownloading(false);
    setDownloadProgress(null);
    setShowNewTickerUI(true);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === document.querySelector('[data-testid="input-ticker"]')) {
        handleLoadTicker();
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [tickerInput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Render authentic data only - no mock data ever displayed
  const renderCandlestickChart = () => {
    // Show loading state while fetching data
    if (isLoadingData && currentSymbol) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-400" />
            <div className="space-y-2">
              <p className="font-semibold text-white">Loading {currentSymbol} Data</p>
              <p className="text-sm">Fetching market data from database...</p>
              <p className="text-xs text-gray-500">Authentic data only - no mock or synthetic data</p>
            </div>
          </div>
        </div>
      );
    }

    if (!historicalData || historicalData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <div className="space-y-2">
              <p className="font-semibold">No Market Data Available</p>
              <p className="text-sm">Enter a ticker symbol above to download real market data from Polygon API</p>
              <p className="text-xs text-gray-500">This system only displays authentic financial data - no mock or sample data</p>
            </div>
          </div>
        </div>
      );
    }

    // Display authentic market data from Polygon API with actual candlestick chart
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-white font-semibold text-lg">
              {currentSymbol} - {historicalData?.length?.toLocaleString() || '0'} candles loaded
            </h3>
            <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
              AUTHENTIC DATA
            </div>
            {syncTickerMutation.isPending && (
              <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded flex items-center space-x-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>SYNCING</span>
              </div>
            )}
          </div>
          <div className="text-right text-sm text-gray-400">
            <div>Latest: {historicalData[0]?.timestamp ? new Date(historicalData[0].timestamp).toLocaleString() : 'N/A'}</div>
            <div>Price Range: ${Math.min(...historicalData.map(d => parseFloat(d.low))).toFixed(2)} - ${Math.max(...historicalData.map(d => parseFloat(d.high))).toFixed(2)}</div>
          </div>
        </div>

        
        {/* ECharts Candlestick Chart */}
        <CandlestickChart 
          data={historicalData || []}
          symbol={currentSymbol || 'Unknown'}
          isHistorical={true}
          className="h-96 w-full bg-navy-800 rounded-lg"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="advanced-historical-chart">
      {/* Ticker Input Section */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter Ticker Symbol
            </label>
            <div className="flex items-center space-x-3">
              <Input
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL, TSLA, SPY"
                className="bg-navy-800 border border-white/20 rounded-lg px-4 py-3 font-mono font-semibold text-white text-lg focus:border-purple-primary focus:ring-1 focus:ring-purple-primary"
                data-testid="input-ticker"
              />
              <Button
                onClick={handleLoadTicker}
                disabled={!tickerInput.trim() || syncTickerMutation.isPending}
                className="bg-gradient-to-r from-purple-primary to-purple-600 hover:from-purple-600 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-200 glow-purple"
                data-testid="button-search"
              >
                {syncTickerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-2">Load</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* New Ticker Download UI */}
      {showNewTickerUI && !isDownloading && (
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            New Ticker: {currentSymbol}
          </h3>
          <p className="text-gray-300 mb-6">
            This ticker is not in our database. Select how much historical data to download:
          </p>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select History Period
              </label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger 
                  className="bg-navy-800 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-primary"
                  data-testid="select-history-period"
                >
                  <SelectValue placeholder="Choose period..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="5Y">5 Years</SelectItem>
                  <SelectItem value="10Y">10 Years</SelectItem>
                  <SelectItem value="MAX">Max Available</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handleDownloadTicker}
              disabled={!selectedPeriod}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
              data-testid="button-download-data"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Data
            </Button>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && downloadProgress && (
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">
              Downloading {currentSymbol} Data
            </h3>
            <Button
              onClick={handleCancelDownload}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              data-testid="button-cancel-download"
            >
              Cancel
            </Button>
          </div>
          
          <div className="space-y-4">
            <Progress value={downloadProgress.progress} className="h-3" />
            <div className="text-center">
              <p className="text-white font-medium">
                {downloadProgress.year ? `Fetching ${downloadProgress.year} data...` : 'Processing...'}
              </p>
              <p className="text-gray-400">{Math.round(downloadProgress.progress)}% Complete</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar for Active Downloads */}
      {isDownloading && downloadProgress && (
        <div className="glass-panel rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm">
                  {downloadProgress.message || `Syncing ${currentSymbol} market data...`}
                </span>
                <span className="text-blue-400 text-xs font-medium">
                  {downloadProgress.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Display - Only show when data is available and not downloading */}
      {currentSymbol && !showNewTickerUI && !isDownloading && tickerStatus?.hasData && (
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {currentSymbol} Historical Analysis
            </h2>
            {tickerStatus?.needsSync && (
              <div className="text-sm text-yellow-400">
                Data sync in progress...
              </div>
            )}
          </div>
          
          <div ref={chartRef} className="relative">
            {isLoadingData ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-purple-primary" />
              </div>
            ) : (
              renderCandlestickChart()
            )}
          </div>
        </div>
      )}
    </div>
  );
}