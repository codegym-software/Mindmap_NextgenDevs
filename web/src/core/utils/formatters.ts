/**
 * Các hàm tiện ích để định dạng dữ liệu (ngày, giờ, text).
 * (File này trước đó trống)
 */

/**
 * Định dạng ngày ISO 8601 (từ BE) thành chuỗi thân thiện.
 * e.g., "vài giây trước", "5 phút trước", "hôm qua lúc 10:30", "20/10/2025"
 */
export function formatRelativeDate(isoDate: string | Date): string {
    try {
        const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        const diffMinutes = Math.round(diffSeconds / 60);
        const diffHours = Math.round(diffMinutes / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffSeconds < 60) return "vài giây trước";
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays === 1) return `hôm qua, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        if (diffDays <= 7) return `${diffDays} ngày trước`;
        
        // Cũ hơn 7 ngày
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (e) {
        console.error("formatRelativeDate error:", e);
        return "không rõ";
    }
}

/**
 * Tạo một file text và trigger download (User Story #35)
 */
export function downloadTextFile(filename: string, text: string): void {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${filename}.txt`;
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
}

/**
 * Rút gọn text (truncate)
 */
export function truncateText(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}
