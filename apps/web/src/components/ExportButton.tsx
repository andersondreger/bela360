'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { ExportFormat } from '@/lib/export';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ExportButton({ onExport, disabled, loading }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formats: { format: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { format: 'xlsx', label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { format: 'csv', label: 'CSV', icon: <FileText className="h-4 w-4" /> },
    { format: 'pdf', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
  ];

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-input border-t-primary" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>Exportar</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {formats.map(({ format, label, icon }) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Simple export button without dropdown
export function SimpleExportButton({
  format,
  label,
  onExport,
  disabled,
  loading,
}: {
  format: ExportFormat;
  label: string;
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const icons: Record<ExportFormat, React.ReactNode> = {
    xlsx: <FileSpreadsheet className="h-4 w-4" />,
    csv: <FileText className="h-4 w-4" />,
    pdf: <FileText className="h-4 w-4" />,
  };

  return (
    <button
      onClick={() => onExport(format)}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-input border-t-primary" />
      ) : (
        icons[format]
      )}
      <span>{label}</span>
    </button>
  );
}
