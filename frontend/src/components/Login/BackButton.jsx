import React from 'react';

const BackButton = ({ onBack }) => (
    <div className="mb-4">
        <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại Editor
        </button>
    </div>
);

export default BackButton;