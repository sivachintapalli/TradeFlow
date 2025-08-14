import { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts";
import type { HistoricalData } from "@shared/schema";
import { useInfiniteHistoricalData } from "@/hooks/use-trading-data";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EnhancedCandlestickChartProps {
  symbol: string;
  timeframe: string;
  isHistorical?: boolean;
  className?: string;
}

export default function EnhancedCandlestickChart({ 
  symbol, 
  timeframe,
  isHistorical = true, 
  className = "" 
}: EnhancedCandlestickChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [showLoadMore, setShowLoadMore] = useState(true);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteHistoricalData(symbol, timeframe);

  // Flatten all pages of data
  const allData = useMemo(() => {
    return infiniteData?.pages.flat() || [];
  }, [infiniteData]);

  useEffect(() => {
    if (!chartRef.current || !allData || allData.length === 0) return;

    // Initialize chart if not exists
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstance.current;

    // Process data for ECharts candlestick format: [timestamp, open, close, low, high]
    const processedData = allData.map((item) => [
      new Date(item.timestamp).getTime(),
      parseFloat(item.open),
      parseFloat(item.close),
      parseFloat(item.low),
      parseFloat(item.high),
    ]);

    const dates = allData.map(item => new Date(item.timestamp).toLocaleString());

    const option = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 300,
      grid: [
        {
          left: '3%',
          right: '3%',
          top: '10%',
          height: '65%',
        },
        {
          left: '3%',
          right: '3%',
          top: '80%',
          height: '15%',
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderColor: 'rgba(132, 79, 193, 0.5)',
        textStyle: {
          color: '#ffffff',
          fontFamily: 'Roboto Mono, monospace',
        },
        formatter: function(params: any) {
          const seriesData = params[0]?.data || [];
          if (seriesData.length < 5) return '';
          
          const [timestamp, open, close, low, high] = seriesData;
          const dataIndex = params[0]?.dataIndex;
          const volume = dataIndex !== undefined && allData[dataIndex] ? parseFloat(allData[dataIndex].volume.toString()) : 0;
          const date = new Date(timestamp).toLocaleString();
          const change = ((close - open) / open * 100).toFixed(2);
          const changeColor = parseFloat(change) >= 0 ? '#38ce3c' : '#ef4444';
          
          return `
            <div style="font-family: 'Roboto Mono', monospace;">
              <div style="margin-bottom: 8px; font-weight: bold;">${symbol} - ${date}</div>
              <div style="display: grid; grid-template-columns: auto auto; gap: 8px 16px;">
                <span style="color: #94a3b8;">Open:</span><span>$${open.toFixed(2)}</span>
                <span style="color: #94a3b8;">High:</span><span style="color: #38ce3c;">$${high.toFixed(2)}</span>
                <span style="color: #94a3b8;">Low:</span><span style="color: #ef4444;">$${low.toFixed(2)}</span>
                <span style="color: #94a3b8;">Close:</span><span>$${close.toFixed(2)}</span>
                <span style="color: #94a3b8;">Change:</span><span style="color: ${changeColor};">${change}%</span>
                <span style="color: #94a3b8;">Volume:</span><span>${(volume / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          `;
        }
      },
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { 
            onZero: false,
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            color: '#94a3b8',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            rotate: 45,
          },
          splitLine: { 
            show: false 
          },
          axisTick: {
            show: false,
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          boundaryGap: false,
          axisLine: { 
            onZero: false,
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            show: false,
          },
          splitLine: { 
            show: false 
          },
          axisTick: {
            show: false,
          }
        }
      ],
      yAxis: [
        {
          scale: true,
          axisLine: { 
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            color: '#94a3b8',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 11,
            formatter: (value: number) => `$${value.toFixed(2)}`
          },
          splitLine: {
            lineStyle: {
              color: '#334155',
              opacity: 0.5
            }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          axisLine: { 
            lineStyle: { color: '#475569' }
          },
          axisLabel: {
            color: '#94a3b8',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 10,
            formatter: (value: number) => `${(value / 1000000).toFixed(0)}M`
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: symbol,
          type: 'candlestick',
          data: processedData,
          itemStyle: {
            color: '#38ce3c', // Bullish green
            color0: '#ef4444', // Bearish red
            borderColor: '#38ce3c',
            borderColor0: '#ef4444',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2,
            }
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: allData.map(item => parseFloat(item.volume.toString())),
          itemStyle: {
            color: function(params: any) {
              const dataIndex = params.dataIndex;
              if (dataIndex >= allData.length) return '#475569';
              const item = allData[dataIndex];
              const open = parseFloat(item.open);
              const close = parseFloat(item.close);
              return close >= open ? 'rgba(56, 206, 60, 0.3)' : 'rgba(239, 68, 68, 0.3)';
            }
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: isHistorical ? 70 : 90,
          end: 100,
        },
        {
          show: isHistorical,
          xAxisIndex: [0, 1],
          type: 'slider',
          bottom: '5%',
          start: isHistorical ? 70 : 90,
          end: 100,
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          dataBackground: {
            lineStyle: {
              color: '#844fc1',
            },
            areaStyle: {
              color: 'rgba(132, 79, 193, 0.2)',
            }
          },
          fillerColor: 'rgba(132, 79, 193, 0.1)',
          handleStyle: {
            color: '#844fc1',
          },
          textStyle: {
            color: '#94a3b8'
          }
        }
      ]
    };

    chart.setOption(option, true);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [allData, symbol, isHistorical]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`} data-testid="chart-loading">
        <Loader2 className="h-8 w-8 animate-spin text-purple-primary" />
        <span className="ml-2">Loading chart data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`} data-testid="chart-error">
        <div className="text-center">
          <p className="text-red-400 mb-2">Chart Data Unavailable</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div ref={chartRef} className="h-96 w-full" data-testid="enhanced-candlestick-chart" />
      
      {hasNextPage && isHistorical && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-purple-primary hover:bg-purple-secondary px-6 py-2"
            data-testid="button-load-more-data"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading More...
              </>
            ) : (
              'Load More Data'
            )}
          </Button>
        </div>
      )}
      
      <div className="text-center text-sm text-gray-400">
        Showing {allData.length} data points
        {hasNextPage && ' • Click "Load More Data" to see historical data'}
      </div>
    </div>
  );
}