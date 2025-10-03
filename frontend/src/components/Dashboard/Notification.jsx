import React from 'react';

const Notification = ({ show, message, type }) => {
    if (!show) return null;
    return (
        <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 ${
                type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white font-medium`}
        >
            {message}
        </div>
    );
};

export default Notification;