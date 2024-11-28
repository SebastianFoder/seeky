import { Account } from "@/types/account";

// Enum types to match database
export type VideoStatus = 'processing' | 'published' | 'failed';
export type VideoVisibility = 'private' | 'unlisted' | 'public';

export interface Video {
    // Primary key
    id: string;  // UUID

    // Basic info
    title: string;
    description: string | null;
    url: string;
    thumbnail_url: string | null;
    preview_url?: string | null;  // If you add this column later

    // Metrics
    duration: number | null;  // Integer
    views: number;  // Integer, defaults to 0, must be >= 0

    // Status and visibility
    status: VideoStatus;  // Defaults to 'processing'
    visibility: VideoVisibility;  // Defaults to 'private'

    // Metadata
    tags: string[];  // Text array, defaults to empty array
    metadata: Record<string, any> | null;  // JSONB

    // Relations
    user_id: string;  // UUID, foreign key to accounts.uid
    user: Account;   // Virtual field from join

    // Timestamps
    created_at: string;  // Timestamp with timezone
    updated_at: string;  // Timestamp with timezone
}

export interface VideoReaction {
    id: string;  // UUID
    video_id: string;  // UUID
    user_id: string;  // UUID
    reaction_type: 'like' | 'dislike';
    created_at: string;  // Timestamp with timezone
}

export interface VideoComment {
    id: string;  // UUID
    video_id: string;  // UUID
    user_id: string;  // UUID
    user: Account;  // Virtual field from join
    content: string;
    created_at: string;  // Timestamp with timezone
    updated_at: string;  // Timestamp with timezone
}