const API_BASE = 'http://localhost:8081/api/mindmaps';

export const fetchMindmaps = async (setLoading, setMindmaps, showNotificationMessage) => {
    const token = localStorage.getItem('cognito_token');
    if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
    }
    try {
        setLoading(true);
        const response = await fetch(API_BASE, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch mindmaps');
        }
        const data = await response.json();
        const formattedData = data.map(mindmap => ({
            ...mindmap,
            updated: mindmap.updatedAt
                ? new Date(mindmap.updatedAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            color: mindmap.color || 'from-indigo-500 to-purple-600',
        }));
        setMindmaps(formattedData);
    } catch (error) {
        console.error('Error fetching mindmaps:', error);
        showNotificationMessage(error.message || 'Lỗi khi tải mindmap!', 'error');
    } finally {
        setLoading(false);
    }
};

export const createMindmap = async (name, setMindmaps, setCurrentMindmap, setShowCreateModal, setNewMindmapName, showNotificationMessage) => {
    if (!name.trim()) {
        showNotificationMessage('Vui lòng nhập tên mindmap!', 'error');
        return;
    }
    const token = localStorage.getItem('cognito_token');
    if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
    }
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to create mindmap');
        }
        const createdData = await response.json();
        const newMindmap = {
            id: createdData.id,
            name: createdData.name,
            updated: new Date().toISOString().split('T')[0],
            color: 'from-indigo-500 to-purple-600',
            rootNodeId: createdData.rootNodeId,
        };
        setMindmaps(prev => [newMindmap, ...prev]);
        setCurrentMindmap(newMindmap);
        setShowCreateModal(false);
        setNewMindmapName('');
        showNotificationMessage('Mindmap đã được tạo thành công!', 'success');
    } catch (error) {
        console.error('Error creating mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi tạo mindmap!', 'error');
    }
};

export const renameMindmap = async (mindmapId, newName, setMindmaps, setCurrentMindmap, showNotificationMessage) => {
    if (!newName.trim()) {
        showNotificationMessage('Vui lòng nhập tên mindmap!', 'error');
        return;
    }
    const token = localStorage.getItem('cognito_token');
    if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/${mindmapId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to rename mindmap');
        }
        const updatedData = await response.json();
        setMindmaps(prev => prev.map(m =>
            m.id === mindmapId
                ? {
                    ...m,
                    name: updatedData.name,
                    updated: updatedData.updatedAt
                        ? new Date(updatedData.updatedAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0],
                }
                : m
        ));
        setCurrentMindmap(prev => prev && prev.id === mindmapId ? { ...prev, name: newName.trim() } : prev);
        showNotificationMessage('Đã đổi tên thành công!', 'success');
    } catch (error) {
        console.error('Error renaming mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi đổi tên!', 'error');
    }
};

export const saveMindmap = async (mindmapId, name, setMindmaps, showNotificationMessage) => {
    const token = localStorage.getItem('cognito_token');
    if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/${mindmapId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save mindmap');
        }
        const updatedData = await response.json();
        setMindmaps(prev => prev.map(m =>
            m.id === mindmapId
                ? {
                    ...m,
                    updated: updatedData.updatedAt
                        ? new Date(updatedData.updatedAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0],
                }
                : m
        ));
        showNotificationMessage('Đã lưu thành công!', 'success');
    } catch (error) {
        console.error('Error saving mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi lưu mindmap!', 'error');
    }
};

export const deleteMindmap = async (mindmapId, setMindmaps, setCurrentMindmap, showNotificationMessage) => {
    const token = localStorage.getItem('cognito_token');
    if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/${mindmapId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete mindmap');
        }
        await response.json();
        setMindmaps(prev => prev.filter(m => m.id !== mindmapId));
        setCurrentMindmap(prev => (prev && prev.id === mindmapId ? null : prev));
        showNotificationMessage('Mindmap đã được xóa!', 'success');
    } catch (error) {
        console.error('Error deleting mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi xóa mindmap!', 'error');
    }
};