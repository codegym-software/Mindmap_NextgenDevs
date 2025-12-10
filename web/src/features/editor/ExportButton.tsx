import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import ExportModal from './ExportModal';
import { downloadAsText, downloadAsImagePNG, downloadAsPDF } from '../../services/exportService';
import { NodeData, EdgeData } from '../../app/store/useEditorStore';

interface ExportButtonProps {
  nodes: NodeData[];
  edges: EdgeData[];
  stageRef?: React.RefObject<any>;
  mindmapName?: string;
}

export default function ExportButton({ nodes, edges, stageRef, mindmapName = 'mindmap' }: ExportButtonProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState<{ active: boolean; label: string } | null>(null);

  const handleExport = (format: 'text' | 'pdf' | 'png') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${mindmapName}_${timestamp}`;

    const label =
      format === 'pdf' ? 'Đang xuất PDF…' : format === 'png' ? 'Đang xuất PNG…' : 'Đang xuất Text…';
    setExporting({ active: true, label });

    try {
      switch (format) {
        case 'text':
          downloadAsText(nodes, edges, `${filename}.txt`);
          break;
        case 'pdf':
          if (stageRef?.current) {
            downloadAsPDF(stageRef, nodes, `${filename}.pdf`);
          } else {
            console.error('Stage reference not available for PDF export');
            alert('Không thể xuất PDF - tham chiếu Stage không khả dụng');
          }
          break;
        case 'png':
          if (stageRef?.current) {
            downloadAsImagePNG(stageRef, `${filename}.png`);
          } else {
            console.error('Stage reference not available for PNG export');
            alert('Không thể xuất PNG - tham chiếu Stage không khả dụng');
          }
          break;
      }
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      alert(`Lỗi khi xuất ${format}: ${error}`);
    } finally {
      // Giữ overlay một chút cho cảm giác phản hồi
      setTimeout(() => setExporting(null), 450);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsExportModalOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Xuất Mindmap"
      >
        <Upload className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />

      {exporting?.active && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 w-full max-w-md flex gap-4 items-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-50 mb-1">{exporting.label}</p>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className="absolute left-[-40%] top-0 h-full w-1/2 bg-blue-500 opacity-90"
                  style={{ animation: 'progress-move 1.2s ease-in-out infinite' }}
                />
              </div>
            </div>
          </div>
          <style>{`
            @keyframes progress-move {
              0% { transform: translateX(0); }
              50% { transform: translateX(120%); }
              100% { transform: translateX(240%); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
