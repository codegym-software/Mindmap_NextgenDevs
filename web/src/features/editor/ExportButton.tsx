import React, { useState } from 'react';
import { Download } from 'lucide-react';
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

  const handleExport = (format: 'text' | 'pdf' | 'png') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${mindmapName}_${timestamp}`;

    try {
      switch (format) {
        case 'text':
          downloadAsText(nodes, edges, `${filename}.txt`);
          break;
        case 'pdf':
          if (stageRef?.current) {
            downloadAsPDF(stageRef, `${filename}.pdf`);
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
    }
  };

  return (
    <>
      <button
        onClick={() => setIsExportModalOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Xuất Mindmap"
      >
        <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />
    </>
  );
}
