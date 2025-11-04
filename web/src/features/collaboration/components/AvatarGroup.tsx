/**
 * Hiển thị nhóm avatar xếp chồng (User Story #22).
 * Dùng trong Header Editor.
 */
import React from 'react';
import UserAvatar from '../../shared/components/UserAvatar';
import { Collaborator } from '../../../core/types';

interface AvatarGroupProps {
    collaborators: Collaborator[];
    max?: number;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ collaborators = [], max = 4 }) => {
    const visibleUsers = collaborators.slice(0, max);
    const hiddenCount = Math.max(0, collaborators.length - max);

    return (
        <div className="flex items-center -space-x-2">
            {visibleUsers.map((user, index) => (
                <UserAvatar
                    key={user.userId || index}
                    src={user.avatarUrl}
                    name={user.displayName}
                    size="md"
                    className="ring-2 ring-gray-900"
                    title={user.displayName || user.email}
                />
            ))}
            {hiddenCount > 0 && (
                <div
                    className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 text-xs font-medium flex items-center justify-center ring-2 ring-gray-900 z-10"
                    title={`${hiddenCount} người khác`}
                >
                    +{hiddenCount}
                </div>
            )}
        </div>
    );
};

export default AvatarGroup;