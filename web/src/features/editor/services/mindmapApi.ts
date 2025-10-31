import api from '../../../lib/axios'; // Use central axios instance
import { NodeData, EdgeData } from '../store/useEditorStore'; // Import FE types

// --- Type Definitions matching Backend DTOs ---

// Matches BE's MindmapContent structure (with nodes as List)
export type MindmapContentPayload = {
    nodes: NodeData[]; // Send as List
    edges: EdgeData[];
    theme?: { background?: string; connectionType?: string }; // Optional theme part
};

// Matches BE's MindmapDetailResponse
export type MindmapDetailResponse = {
    id: string;
    name: string;
    ownerId: string;
    content: {
        nodes: NodeData[]; // Expect List from BE
        edges: EdgeData[];
        theme?: { background?: string; connectionType?: string };
    };
    updatedAt: string; // ISO String
    createdAt: string; // ISO String
    tags?: string[];
    accessSettings: { isPublic: boolean; publicAccessLevel: string };
    collaborators?: Array<{ // Optional collaborators info
        userId: string;
        displayName?: string;
        avatarUrl?: string;
        permission: 'OWNER' | 'EDITOR' | 'VIEWER';
        // Add status, invitedBy if needed later
    }>;
    workspaceId?: string | null; // Nullable as per BE
    lastEditedBy?: string;
    version?: number; // For optimistic locking
};

// Matches BE's MindmapUpdateRequest payload
type MindmapUpdatePayload = {
    name?: string; // Optional name update
    content?: MindmapContentPayload; // Optional content update
    // Add version for optimistic locking
    version?: number;
};


// --- API Client for Editor ---
export const mindmapsApi = {
    /**
     * Fetches the detailed data for a specific mindmap.
     */
    get: async (id: string): Promise<MindmapDetailResponse> => {
        const response = await api.get<MindmapDetailResponse>(`/mindmaps/${id}`);
        // Add transformation if needed (e.g., convert node object to array if BE hasn't updated)
         if (response.data.content && typeof response.data.content.nodes === 'object' && !Array.isArray(response.data.content.nodes)) {
             console.warn("BE returned nodes as object, converting to array for FE.");
             response.data.content.nodes = Object.values(response.data.content.nodes || {});
         } else if (!response.data.content?.nodes) {
             console.warn("BE returned no nodes, initializing empty array.");
             if(response.data.content) response.data.content.nodes = [];
             else response.data.content = { nodes: [], edges: []}; // Ensure content object exists
         }
        return response.data;
    },

    /**
     * Updates a mindmap (name and/or content).
     * Includes optimistic locking via the 'version' field.
     */
    update: async (id: string, payload: MindmapUpdatePayload): Promise<MindmapDetailResponse> => {
         // Optionally include the current version if available in the store/state
         // const currentVersion = useEditorStore.getState().version; // Need to add version to store
         // if (currentVersion) payload.version = currentVersion;

        const response = await api.put<MindmapDetailResponse>(`/mindmaps/${id}`, payload);
         // Handle potential version mismatch errors (409 Conflict) from BE if implemented
         // Add transformation like in get() if needed
         if (response.data.content && typeof response.data.content.nodes === 'object' && !Array.isArray(response.data.content.nodes)) {
             response.data.content.nodes = Object.values(response.data.content.nodes || {});
         } else if (!response.data.content?.nodes) {
            if(response.data.content) response.data.content.nodes = [];
            else response.data.content = { nodes: [], edges: []};
         }
        return response.data;
    },

    // Add other editor-specific API calls if needed:
    // - Export text: GET /api/mindmaps/{id}/export/text
    // - Generate embed code: GET /api/mindmaps/{id}/embed
    // - Link to SaaS item: (Requires specific endpoint)
};
