/**
 * Hiển thị một nhóm các avatar xếp chồng lên nhau.
 * Dùng trong Header của Editor (User Story #22).
 */
import React from 'react';
import UserAvatar from '../../shared/components/UserAvatar';
import { UserProfile } from '../../../core/types';

interface AvatarGroupProps {
    users: Partial<UserProfile>[];
    max?: number;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ users = [], max = 4 }) => {
    const visibleUsers = users.slice(0, max);
    const hiddenCount = Math.max(0, users.length - max);

    return (
        <div className="flex items-center -space-x-2 pr-1">
            {visibleUsers.map((user, index) => (
                <UserAvatar
                    key={user.id || user.email || index}
                    src={user.picture}
                    name={user.name || user.email}
                    size="md"
                    className="ring-2 ring-gray-900"
                    title={user.name || user.email}
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
