import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import ChartPanel from "./chart-panel";
import TechnicalIndicators from "./technical-indicators";
import { useMarketData, useTechnicalIndicators } from "@/hooks/use-trading-data";

const timeframes = ['1M', '5M', '15M', '1H', '1D'];
const periods = [
  { value: '1Y', label: '1 Year' },
  { value: '2Y', label: '2 Years' },
  { value: '5Y', label: '5 Years' },
  { value: '10Y', label: '10 Years' },
];

export default function HistoricalAnalysis() {
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState("2Y");
  const [activeTimeframe, setActiveTimeframe] = useState("1D");
  const [isLoading, setIsLoading] = useState(false);

  const { data: marketData } = useMarketData(symbol);
  const { data: indicators } = useTechnicalIndicators(symbol);

  const handleLoadData = async () => {
    setIsLoading(true);
    // Simulate data loading
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6" data-testid="historical-analysis">
      {/* Controls Bar */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Symbol Input */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-300">Symbol:</label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="bg-navy-800 border border-white/20 rounded-lg px-4 py-2 font-mono font-semibold text-white w-24 focus:border-purple-primary"
                data-testid="input-symbol"
              />
            </div>
            
            {/* Period Selection */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-300">Period:</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger 
                  className="bg-navy-800 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-purple-primary w-32"
                  data-testid="select-period"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Load Data Button */}
            <Button
              onClick={handleLoadData}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-primary to-purple-600 hover:from-purple-600 hover:to-purple-700 px-6 py-2 rounded-lg font-semibold transition-all duration-200 glow-purple"
              data-testid="button-load-data"
            >
              <Download className="w-4 h-4 mr-2" />
              {isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Loading...
                </span>
              ) : (
                'Load Data'
              )}
            </Button>
          </div>
          
          {/* Timeframe Buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 mr-3">Timeframe:</span>
            {timeframes.map((tf) => (
              <Button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeTimeframe === tf
                    ? 'bg-purple-primary text-white'
                    : 'bg-navy-700 hover:bg-navy-600 text-gray-300'
                }`}
                data-testid={`button-timeframe-${tf.toLowerCase()}`}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Chart and Indicators */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="col-span-9">
          <ChartPanel 
            symbol={symbol}
            marketData={marketData}
            isHistorical={true}
          />
        </div>
        
        {/* Technical Indicators */}
        <div className="col-span-3">
          <TechnicalIndicators 
            symbol={symbol}
            indicators={indicators}
          />
        </div>
      </div>
    </div>
  );
}
