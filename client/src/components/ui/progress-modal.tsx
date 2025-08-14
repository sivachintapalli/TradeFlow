import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  period: string;
  timeframe: string;
  progress: number;
  status: string;
  year?: number;
  onCancel?: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  onClose,
  symbol,
  period,
  timeframe,
  progress,
  status,
  year,
  onCancel
}) => {
  const displayTimeframe = timeframe.replace('M', 'm');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-navy-900 border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <Download className="w-5 h-5 text-blue-400" />
            <span>Downloading {symbol} Data</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Download Details */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Symbol:</span>
              <span className="text-white font-mono">{symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Period:</span>
              <span className="text-white">{period}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Timeframe:</span>
              <span className="text-white">{displayTimeframe}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm font-semibold text-blue-400">
                {Math.round(progress)}%
              </span>
            </div>
            
            <Progress 
              value={progress} 
              className="h-3 bg-navy-700"
              data-testid="progress-download"
            />
            
            <div className="text-center">
              <p className="text-white font-medium">
                {year ? `Processing ${year} data...` : status}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Fetching authentic market data from Polygon API
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {onCancel && progress < 100 && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                data-testid="button-cancel-download"
              >
                Cancel
              </Button>
            )}
            
            {progress >= 100 && (
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-close-download"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};