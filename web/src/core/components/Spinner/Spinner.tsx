// Tái cấu trúc từ file cũ
export default function Spinner({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-spin w-5 h-5 border-2 border-current border-opacity-30 border-t-white rounded-full ${className}`}
            role="status"
            aria-label="Đang tải..."
        />
    );
}
