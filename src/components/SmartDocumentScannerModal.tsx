import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, X, Sparkles, ArrowRight } from 'lucide-react';

interface SmartDocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string;
  onApplyExtractedData: (type: string, data: any) => void;
}

export const SmartDocumentScannerModal: React.FC<SmartDocumentScannerModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  onApplyExtractedData,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setScanResult(null);
      setScanError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!selectedImage) return;
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/ai/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      });

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Failed to analyze document');
      }
      setScanResult(resJson.data);
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'Error communicating with document scanner');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = () => {
    if (!scanResult) return;
    onApplyExtractedData(scanResult.documentType, scanResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Smart Photo & Bill Scanner</h2>
              <p className="text-xs text-slate-500">Scan any receipt, DEWA bill, loan paper, or expense to automatically apply values</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Area */}
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/30 text-center"
            >
              <Upload className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Click to upload or take a photo</p>
              <p className="text-xs text-slate-500 max-w-sm">Supports camera photos, PDF receipts, utility bills (DEWA), credit card statements, and loan agreements</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-h-56 flex items-center justify-center">
                <img src={selectedImage} alt="Uploaded document" className="max-h-56 object-contain" />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setScanResult(null);
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium bg-slate-900/80 text-white rounded-md hover:bg-slate-900 cursor-pointer"
                >
                  Change Image
                </button>
              </div>

              {!scanResult && (
                <div className="flex justify-end">
                  <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing with Gemini AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze & Extract Numbers
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {scanError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Results Display */}
          {scanResult && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully Parsed Document
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Category: <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{scanResult.documentType.replace('_', ' ')}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Vendor / Lender</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{scanResult.detectedVendorOrLender || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Extracted Total (AED)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    AED {Number(scanResult.totalAmountAED || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Detected Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{scanResult.detectedDate || currentMonth}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Target Category</span>
                  <span className="text-slate-700 dark:text-slate-300">{scanResult.category || 'General'}</span>
                </div>
              </div>

              {scanResult.notesAndContext && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block mb-0.5">Notes:</span>
                  {scanResult.notesAndContext}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {scanResult && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Applying to: <strong className="text-slate-700 dark:text-slate-300">{currentMonth}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Apply to {scanResult.documentType.replace('_', ' ')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
