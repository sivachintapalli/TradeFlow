import { useState } from "react";
import AdvancedHistoricalChart from "@/components/charts/advanced-historical-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoricalAnalysis() {
  const [symbol, setSymbol] = useState("SPY");
  const [period, setPeriod] = useState("1Y");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), period })
      });
      
      if (response.ok) {
        console.log(`Data download started for ${symbol} - ${period}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
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
        </CardContent>
      </Card>

      {/* Chart */}
      <AdvancedHistoricalChart symbol={symbol} />
    </div>
  );
}