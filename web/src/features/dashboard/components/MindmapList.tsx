/**
 * Component Grid hiển thị danh sách MindmapCards.
 * Đây là component "câm" (dumb), nhận logic từ DashboardPage.
 */
import React from 'react';
import { MindmapSummary } from '../store/useMindmapsStore';
import MindmapCard from './MindmapCard';

interface Props {
    items: MindmapSummary[];
    onRename: (id: string, currentName: string) => void;
    onDelete: (id: string) => void;
    onShare: (id: string) => void;
    onDuplicate: (id: string) => void;
}

const MindmapList: React.FC<Props> = ({ items, onRename, onDelete, onShare, onDuplicate }) => {
    
    // Sắp xếp theo ngày cập nhật mới nhất (User Story #2)
    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => 
            new Date(b.updatedAt || b.createdAt).getTime() - 
            new Date(a.updatedAt || a.createdAt).getTime()
        );
    }, [items]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedItems.map(item => (
                <MindmapCard
                    key={item.id}
                    item={item}
                    onRename={(id, name) => onRename(id, name)} // User Story #1
                    onDelete={() => onDelete(item.id)} // User Story #2
                    onShare={() => onShare(item.id)} // User Story #18
                    onDuplicate={() => onDuplicate(item.id)} // User Story #5
                />
            ))}
        </div>
    );
};

export default MindmapList;
