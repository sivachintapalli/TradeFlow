import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { HistoricalData } from "@shared/schema";

interface CandlestickChartProps {
  data: HistoricalData[];
  symbol: string;
  isHistorical?: boolean;
  className?: string;
}

export default function CandlestickChart({ 
  data, 
  symbol, 
  isHistorical = true, 
  className = "" 
}: CandlestickChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) {
      console.log('CandlestickChart: Missing data or ref', { chartRef: !!chartRef.current, dataLength: data?.length });
      return;
    }

    // Initialize chart if not exists
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstance.current;

    console.log('CandlestickChart: Processing', data.length, 'data points for', symbol);

    // Process data for ECharts candlestick format: [timestamp, open, close, low, high]
    const processedData = data.map((item, index) => {
      const result = [
        new Date(item.timestamp).getTime(),
        parseFloat(item.open),
        parseFloat(item.close),
        parseFloat(item.low),
        parseFloat(item.high),
      ];
      if (index < 3) console.log('Processing data point:', item, '-> ', result);
      return result;
    });

    const dates = data.map(item => new Date(item.timestamp).toLocaleDateString());

    const option = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 1000,
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
          const volume = dataIndex !== undefined && data[dataIndex] ? parseFloat(data[dataIndex].volume.toString()) : 0;
          const date = new Date(timestamp).toLocaleDateString();
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
          data: data.map(item => parseFloat(item.volume.toString())),
          itemStyle: {
            color: function(params: any) {
              const dataIndex = params.dataIndex;
              if (dataIndex >= data.length) return '#475569';
              const item = data[dataIndex];
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
  }, [data, symbol, isHistorical]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={chartRef} 
      className={`w-full h-full ${className}`}
      data-testid="candlestick-chart"
      style={{ minHeight: '300px' }}
    />
  );
}