import { SupabaseClient } from '@supabase/supabase-js';
import { videoService } from '@/services/videoService';

interface UploadOptions {
    title: string;
    description: string;
    tags: string[];
    userId: string;
    visibility: 'public' | 'private' | 'unlisted';
}

interface UploadCallbacks {
    onProgress: (progress: number) => void;
    onSuccess: (videoId: string) => void;
    onError: (error: string) => void;
}

export async function uploadVideo(
    supabase: SupabaseClient,
    videoFile: File,
    thumbnailFile: File,
    options: UploadOptions,
    callbacks: UploadCallbacks
): Promise<void> {
    const { title, description, tags, userId, visibility } = options;
    const { onProgress, onSuccess, onError } = callbacks;

    if (!videoFile || !thumbnailFile) {
        onError("Please select both video and thumbnail files.");
        return;
    }

    if (title.length < 3) {
        onError("Title must be at least 3 characters long.");
        return;
    }

    try {
        const video = await videoService.uploadVideo(
            supabase,
            videoFile,
            thumbnailFile,
            {
                title,
                description,
                tags,
                userId,
                visibility
            },
            onProgress
        );

        onSuccess(video.id);
    } catch (error: any) {
        console.error('Upload failed:', error);
        onError('Failed to upload video. Please try again.');
    }
}