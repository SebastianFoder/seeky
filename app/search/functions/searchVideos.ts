import { SupabaseClient } from '@supabase/supabase-js';
import { Video } from '@/types/video';
import { videoService } from '@/services/videoService';

interface SearchOptions {
    query: string;
    page: number;
    limit?: number;
    isInitial?: boolean;
}

interface SearchCallbacks {
    onStart: () => void;
    onSuccess: (data: {
        videos: Video[];
        totalResults: number;
        hasMore: boolean;
    }) => void;
    onError: (error: string) => void;
    onComplete: () => void;
}

export async function searchVideos(
    supabase: SupabaseClient,
    options: SearchOptions,
    callbacks: SearchCallbacks,
    currentVideos: Video[] = []
): Promise<void> {
    const { query, page, limit = 12, isInitial = false } = options;
    const { onStart, onSuccess, onError, onComplete } = callbacks;

    try {
        if (!query.trim()) {
            onSuccess({
                videos: [],
                totalResults: 0,
                hasMore: false
            });
            return;
        }

        onStart();

        const response = await videoService.getVideosWithSearch(
            supabase,
            query,
            { page, limit }
        );

        const updatedVideos = isInitial 
            ? response.data 
            : [...currentVideos, ...response.data];

        onSuccess({
            videos: updatedVideos,
            totalResults: response.count,
            hasMore: updatedVideos.length < response.count
        });

    } catch (error) {
        console.error('Error fetching search results:', error);
        onError('Failed to fetch search results');
    } finally {
        onComplete();
    }
}