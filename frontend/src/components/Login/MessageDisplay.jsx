import React from 'react';

const MessageDisplay = ({ infoMessage, errorMessage }) => (
    <>
        {infoMessage && (
            <p className="text-green-400 text-sm mb-4 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {infoMessage}
            </p>
        )}
        {errorMessage && (
            <p className="text-red-400 text-sm mb-4 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errorMessage}
            </p>
        )}
    </>
);

export default MessageDisplay;