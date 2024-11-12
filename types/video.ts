import { Account } from "@/types/account";

export interface Video {
    id: string;
    title: string;
    user: Account;
    description: string | null;
    url: string;
    thumbnail_url: string | null;
    duration: number | null;
    views: number;
    status: 'processing' | 'published' | 'failed';
    visibility: 'private' | 'unlisted' | 'public';
    tags: string[];
    user_id: string;
    created_at: string;
    updated_at: string;
    metadata: Record<string, any>;
}

export interface VideoReaction {
    id: string;
    video_id: string;
    user_id: string;
    reaction_type: 'like' | 'dislike';
    created_at: string;
}

export interface VideoComment {
    id: string;
    video_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
}