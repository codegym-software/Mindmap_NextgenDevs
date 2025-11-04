/**
 * Placeholder cho GenAI Panel.
 * (Tuân thủ User Story #37*)
 */
import React from 'react';
import Button from '../../../core/components/Button/Button';
import { Sparkles } from 'lucide-react';

const GenAiPanel: React.FC = () => {
    const isLoading = false;

    const handleGenerate = () => {};

    return (
        <div className="p-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                Gợi ý AI (User Story #37)
            </h4>
            <Button variant="outline" size="sm" className="w-full" onClick={handleGenerate} isLoading={isLoading} disabled={true}>
                Gợi ý Node con
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">Tính năng đang phát triển.</p>
        </div>
    );
};

export default GenAiPanel;