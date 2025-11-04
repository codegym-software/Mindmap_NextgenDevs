/**
 * Định nghĩa các kiểu dữ liệu (types) liên quan đến API.
 * (File này trước đó trống)
 */
import { MindmapSummary, MindmapContent } from ".";

// --- API Error ---
export interface ApiErrorResponse {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
    timestamp: string;
    details?: Record<string, string>;
}

// --- API Payloads ---
export type MindmapCreatePayload = {
    name: string;
    content?: MindmapContent;
};

export type MindmapUpdatePayload = {
    name?: string;
    content?: MindmapContent;
    version?: number;
};

export type CollaborationInvitePayload = {
    email: string;
    permission: 'EDITOR' | 'VIEWER';
};

export type CollaborationUpdatePayload = {
    permission: 'EDITOR' | 'VIEWER';
};

export type ShareSettingsPayload = MindmapSummary['accessSettings'];

export type GuestSyncPayload = {
    name: string;
    content: MindmapContent;
    createdAt: string;
};

// --- API Responses ---
export type GuestSyncResponse = {
    createdMaps: MindmapSummary[];
};