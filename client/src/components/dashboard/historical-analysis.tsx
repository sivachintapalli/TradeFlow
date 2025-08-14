import { useState } from "react";
import AdvancedHistoricalChart from "@/components/charts/advanced-historical-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function HistoricalAnalysis() {
  const [symbol, setSymbol] = useState("SPY");
  const [period, setPeriod] = useState("1Y");
  const [timeframe, setTimeframe] = useState("1M");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("");

  const handleDownloadData = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    // Display user-friendly timeframe (1M -> 1m for minute) 
    const displayTimeframe = timeframe === '1M' ? '1m' : timeframe;
    setDownloadStatus(`Preparing to download ${period} of ${displayTimeframe} data for ${symbol}...`);
    
    try {
      const response = await fetch('/api/download-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: symbol.toUpperCase(), 
          period,
          timeframe
        })
      });
      
      if (response.ok) {
        // Handle Server-Sent Events for real-time progress
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    setDownloadProgress(data.progress || 0);
                    setDownloadStatus(data.message || 'Processing...');
                    
                    if (data.completed) {
                      setIsDownloading(false);
                      setDownloadStatus('Download completed successfully!');
                      setTimeout(() => setDownloadStatus(''), 3000);
                      return;
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE data:', line);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Stream reading error:', e);
          } finally {
            reader.releaseLock();
          }
        }
        
        setIsDownloading(false);
      } else {
        const error = await response.json();
        setDownloadStatus(`Download failed: ${error.message}`);
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus('Download failed: Network error');
      setIsDownloading(false);
    }
  };

  const pollDownloadProgress = async (sym: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/download-progress/${sym}`);
        const progress = await response.json();
        
        setDownloadProgress(progress.percentage || 0);
        setDownloadStatus(progress.status || 'Downloading...');
        
        if (progress.completed || progress.error) {
          clearInterval(interval);
          setIsDownloading(false);
          if (progress.error) {
            setDownloadStatus(`Error: ${progress.error}`);
          } else {
            setDownloadStatus('Download completed successfully!');
            setTimeout(() => setDownloadStatus(''), 3000);
          }
        }
      } catch (error) {
        console.error('Progress polling failed:', error);
        clearInterval(interval);
        setIsDownloading(false);
        setDownloadStatus('Progress tracking failed');
      }
    }, 1000);
  };

  return (
    <div className="space-y-6" data-testid="historical-analysis">
      {/* Data Controls */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Historical Data Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Symbol</label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Enter symbol (e.g., SPY, AAPL)"
                className="w-full"
                data-testid="input-symbol"
              />
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger data-testid="select-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="2Y">2 Years</SelectItem>
                  <SelectItem value="5Y">5 Years</SelectItem>
                  <SelectItem value="10Y">10 Years</SelectItem>
                  <SelectItem value="MAX">Maximum Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger data-testid="select-timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">1 Minute (1m)</SelectItem>
                  <SelectItem value="5M">5 Minutes (5m)</SelectItem>
                  <SelectItem value="15M">15 Minutes (15m)</SelectItem>
                  <SelectItem value="30M">30 Minutes (30m)</SelectItem>
                  <SelectItem value="1H">1 Hour</SelectItem>
                  <SelectItem value="1D">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={handleDownloadData}
                disabled={isDownloading}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                data-testid="button-download-data"
              >
                {isDownloading ? 'Downloading...' : 'Download Data'}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isDownloading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Download Progress</span>
                <span className="text-blue-400">{downloadProgress.toFixed(1)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-sm text-slate-400">{downloadStatus}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {!isDownloading ? (
        <AdvancedHistoricalChart 
          key={`${symbol}-${timeframe}-${period}`}  
          symbol={symbol}
          timeframe={timeframe}
        />
      ) : (
        <Card className="glass-card">
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400">Chart will load after download completes...</p>
              <p className="text-sm text-slate-500">{downloadStatus}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}