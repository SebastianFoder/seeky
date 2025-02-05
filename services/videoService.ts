import axios from 'axios';
import { Video, VideoComment, VideoReaction } from '@/types/video';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateVideoPreview } from '@/lib/generateVideoPreview';

interface UploadStep {
    execute: () => Promise<any>;
    cleanup: () => Promise<void>;
}

interface UploadState {
    videoUrl: string | null;
    thumbnailUrl: string | null;
    previewUrl: string | null;
    videoRecord: Video | null;
}

interface PaginationParams {
    page?: number;
    limit?: number;
}

interface PaginatedResponse<T> {
    data: T[];
    count: number;
}

export const videoService = {
    /**
     * Upload a new video with visibility using S3
     * @param supabase - Supabase client instance
     * @param videoFile - Video file to upload
     * @param thumbnailFile - Thumbnail image file to upload
     * @param metadata - Metadata for the video
     * @returns The uploaded Video object
     */
    async uploadVideo(
        supabase: SupabaseClient,
        videoFile: File,
        thumbnailFile: File,
        metadata: {
            title: string;
            description?: string;
            tags?: string[];
            userId: string;
            visibility: 'private' | 'unlisted' | 'public';
        },
        onProgress?: (progress: number) => void
    ): Promise<Video> {
        const state: UploadState = {
            videoUrl: null,
            thumbnailUrl: null,
            previewUrl: null,
            videoRecord: null
        };

        const steps: UploadStep[] = [            
            {
                execute: async () => {
                    const thumbnailFormData = new FormData();
                    thumbnailFormData.append('file', thumbnailFile);
                    
                    const response = await axios.post('/api/thumbnail', thumbnailFormData);
                    state.thumbnailUrl = response.data.url;
                    onProgress?.(Math.floor(Math.random() * 15) + 30);
                },
                cleanup: async () => {
                    if (state.thumbnailUrl) {
                        await axios.delete(`/api/thumbnail/${state.thumbnailUrl.split('/').pop()}`);
                    }
                }
            },
            {
                execute: async () => {
                    console.log('Generating preview GIF');
                    // Generate preview GIF
                    const previewBlob = await generateVideoPreview(videoFile, {
                        duration: 10,
                        width: 480,
                        height: 270,
                        fps: 10
                    });

                    console.log('Uploading preview GIF');
                    
                    const previewFormData = new FormData();
                    previewFormData.append('file', previewBlob, 'preview.gif');
                    
                    const response = await axios.post('/api/preview', previewFormData);
                    state.previewUrl = response.data.url;
                    onProgress?.(Math.floor(Math.random() * 15) + 60);
                    console.log('Preview GIF uploaded');
                },
                cleanup: async () => {
                    if (state.previewUrl) {
                        await axios.delete(`/api/preview/${state.previewUrl.split('/').pop()}`);
                    }
                }
            },
            {
                execute: async () => {
                    const { data, error } = await supabase
                        .from('videos')
                        .insert({
                            title: metadata.title,
                            description: metadata.description || null,
                            url: state.videoUrl,
                            thumbnail_url: state.thumbnailUrl,
                            user_id: metadata.userId,
                            tags: metadata.tags || [],
                            visibility: metadata.visibility,
                            status: 'processing',
                            metadata: {
                                previewGifURL: state.previewUrl
                            }
                        })
                        .select()
                        .single();

                    if (error) throw error;
                    state.videoRecord = data as Video;
                    onProgress?.(100);
                    return state.videoRecord;
                },
                cleanup: async () => {
                    if (state.videoRecord?.id) {
                        await supabase
                            .from('videos')
                            .delete()
                            .eq('id', state.videoRecord.id);
                    }
                }
            },
            {
                execute: async () => {
                    const videoFormData = new FormData();
                    videoFormData.append('file', videoFile);
                    videoFormData.append('videoId', state.videoRecord?.id || '');
                    videoFormData.append('userId', metadata.userId);
                    
                    const response = await axios.post('/api/video', videoFormData);
                    state.videoUrl = response.data.url;
                    onProgress?.(Math.floor(Math.random() * 15) + 10);
                    return state.videoRecord;
                },
                cleanup: async () => {
                    if (state.videoUrl) {
                        await axios.delete(`/api/video/${state.videoRecord?.id}`);
                    }
                }
            },
        ];

        // Execute steps with cleanup on failure
        for (let i = 0; i < steps.length; i++) {
            try {
                const result = await steps[i].execute();
                if (i === steps.length - 1) return result;
            } catch (error) {
                console.error(`Step ${i + 1} failed:`, error);

                // Cleanup in reverse order up to the failed step
                for (let j = i; j >= 0; j--) {
                    try {
                        await steps[j].cleanup();
                    } catch (cleanupError) {
                        console.error(`Cleanup step ${j + 1} failed:`, cleanupError);
                    }
                }

                throw new Error(`Upload failed at step ${i + 1}: ${(error as Error).message}`);
            }
        }

        throw new Error('Upload failed: Unknown error');
    },

    /**
     * Fetch videos with visibility and optional tag filtering
     * @param supabase - Supabase client instance
     * @param options - Optional filters for tags, visibility, and user ID
     * @returns An array of Video objects
     */
    async getVideos(
        supabase: SupabaseClient,
        options?: { tags?: string[]; includeUnlisted?: boolean; userId?: string }
    ): Promise<Video[]> {
        try {
            let query = supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url,
                        bio
                    )
                `)
                .eq('status', 'published')
                .order('views', { ascending: false });

            const conditions = [];

            // Include unlisted videos
            if (options?.includeUnlisted) {
                conditions.push(`visibility.eq.unlisted`);
            }

            // Include private videos for the specific user
            if (options?.userId) {
                conditions.push(`visibility.eq.private,user_id.eq.${options.userId}`);
            }

            if (conditions.length > 0) {
                query = query.or(conditions.join(','));
            }

            // Filter by tags if provided
            if (options?.tags?.length) {
                query = query.contains('tags', options.tags);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Video[];
        } catch (error) {
            console.error('Error fetching videos:', error);
            throw error;
        }
    },

    /**
     * Search videos by title and tags
     * @param supabase - Supabase client instance
     * @param searchTerm - Term to search in title and tags
     * @returns An array of Video objects matching the search criteria
     */
    async searchVideos(
        supabase: SupabaseClient, 
        searchTerm: string,
        { page = 1, limit = 12 }: PaginationParams
    ): Promise<PaginatedResponse<Video>> {
        try {
            const start = (page - 1) * limit;
            const end = start + limit - 1;

            // Single query for both count and data
            const { data, error, count } = await supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url,
                        bio
                    )
                `, { count: 'exact' })
                .textSearch('title', searchTerm)
                .eq('visibility', 'public')  // Ensure only public videos are searchable
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;

            return {
                data: data as Video[],
                count: count || 0
            };
        } catch (error) {
            console.error('Error in searchVideos:', error);
            throw error;
        }
    },

    /**
     * Update video tags and visibility
     * @param supabase - Supabase client instance
     * @param videoId - ID of the video to update
     * @param updates - Fields to update
     * @returns The updated Video object
     */
    async updateVideo(
        supabase: SupabaseClient,
        videoId: string,
        updates: Partial<{
            tags: string[];
            visibility: 'private' | 'unlisted' | 'public';
            title: string;
            description: string;
        }>
    ): Promise<Video> {
        try {
            const { data, error } = await supabase
                .from('videos')
                .update(updates)
                .eq('id', videoId)
                .select()
                .single();

            if (error) throw error;
            return data as Video;
        } catch (error) {
            console.error('Error updating video:', error);
            throw error;
        }
    },

    /**
     * Increment the view count for a video
     * @param supabase - Supabase client instance
     * @param videoId - The ID of the video to increment views for
     * @returns The updated view count
     */
    async incrementViews(supabase: SupabaseClient, videoId: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .rpc('increment', {
                    row_id: videoId  // Match the parameter name in the Supabase function
                });

            if (error) {
                console.error('Error incrementing views:', error);
                throw error;
            }

            return data as number;
        } catch (error) {
            console.error('Error in incrementViews:', error);
            throw error;
        }
    },

    /**
     * Delete video and associated files
     * @param videoId - ID of the video to delete
     */
    async deleteVideo(videoId: string): Promise<void> {
        try {
            try {
                await axios.delete(`/api/video/${videoId}`);
            } catch (s3Error) {
                console.error('Error deleting files from S3:', s3Error);
                throw new Error('Failed to delete files from storage');
            }
        } catch (error) {
            console.error('Error in deleteVideo:', error);
            throw error;
        }
    },

    /**
     * Fetch public videos along with associated account data.
     * @param supabase - Supabase client instance.
     * @param pagination - Optional pagination parameters
     * @returns Paginated response of Video objects with account information.
     */
    async fetchPublicVideosWithAccount(
        supabase: SupabaseClient,
        pagination?: PaginationParams
    ): Promise<PaginatedResponse<Video>> {
        try {
            let query = supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url,
                        bio
                    )
                `, { count: 'exact' })
                .eq('visibility', 'public')
                .order('views', { ascending: false });

            // Apply pagination only if both page and limit are provided
            if (pagination?.page && pagination?.limit) {
                const start = (pagination.page - 1) * pagination.limit;
                const end = start + pagination.limit - 1;
                query = query.range(start, end);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            return {
                data: data as Video[],
                count: count || 0
            };
        } catch (error) {
            console.error('Error in fetchPublicVideosWithAccount:', error);
            throw error;
        }
    },

    /**
     * Fetch videos based on given options along with associated account data.
     * @param supabase - Supabase client instance.
     * @param options - Optional filters for tags, visibility, and user ID.
     * @returns An array of Video objects matching the criteria with account information.
     */
    async getVideosWithAccount(
        supabase: SupabaseClient,
        options?: { 
            tags?: string[]; 
            includeUnlisted?: boolean; 
            userId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<Video>> {
        try {
            let query = supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url,
                        bio
                    )
                `, { count: 'exact' })
                .eq('status', 'published')
                .order('views', { ascending: false });

            // Add conditions
            if (options?.includeUnlisted) {
                query = query.or('visibility.eq.unlisted');
            }

            if (options?.userId) {
                query = query.or(`visibility.eq.private,user_id.eq.${options.userId}`);
            }

            if (options?.tags?.length) {
                query = query.contains('tags', options.tags);
            }

            // Apply pagination only if both page and limit are provided
            if (options?.page && options?.limit) {
                const start = (options.page - 1) * options.limit;
                const end = start + options.limit - 1;
                query = query.range(start, end);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            return {
                data: data as Video[],
                count: count || 0
            };
        } catch (error) {
            console.error('Error in getVideosWithAccount:', error);
            throw error;
        }
    },

    async getVideosWithSearch(
        supabase: SupabaseClient,
        searchTerm: string,
        pagination?: PaginationParams
    ): Promise<PaginatedResponse<Video>> {
        try {
            const cleanTerm = searchTerm.trim().replace(/[%_]/g, '\\$&');

            let query = supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url,
                        bio
                    )
                `, { count: 'exact' })
                .or(
                    `title.ilike.%${cleanTerm}%,` +
                    `description.ilike.%${cleanTerm}%,` +
                    `tags.cs.{${cleanTerm}}`
                )
                .eq('visibility', 'public')
                .eq('status', 'published')
                .order('views', { ascending: false });

            // Apply pagination only if both page and limit are provided
            if (pagination?.page && pagination?.limit) {
                const start = (pagination.page - 1) * pagination.limit;
                const end = start + pagination.limit - 1;
                query = query.range(start, end);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            return {
                data: data as Video[],
                count: count || 0
            };
        } catch (error) {
            console.error('Error in getVideosWithSearch:', error);
            throw error;
        }
    },

    /**
     * Fetch a single video by its ID along with associated account data.
     * @param supabase - Supabase client instance.
     * @param videoId - The ID of the video to retrieve.
     * @returns A Video object with account information or null if not found.
     */
    async getVideoByIdWithAccount(supabase: SupabaseClient, videoId: string): Promise<Video | null> {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        email,
                        display_name,
                        avatar_url,
                        bio,
                        role,
                        status,
                        created_at,
                        updated_at
                    )
                `)
                .eq('id', videoId)
                .single();

            if (error) {
                console.error(`Error fetching video with ID ${videoId}:`, error);
                return null;
            }

            return data as Video;
        } catch (error) {
            console.error('Error in getVideoByIdWithAccount:', error);
            return null;
        }
    },

    /**
     * Fetch videos associated with a specific account along with account data.
     * @param supabase - Supabase client instance.
     * @param accountId - The ID of the account to fetch videos for.
     * @param pagination - Optional pagination parameters to limit the results.
     * @returns A paginated response containing an array of Video objects and the total count.
     */
    async getVideosByAccountWithAccountId(
        supabase: SupabaseClient, 
        accountId: string, 
        pagination?: PaginationParams
    ): Promise<PaginatedResponse<Video>> {
        try {
            let query = supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        email,
                        display_name,
                        avatar_url,
                        bio,
                        role,
                        status,
                        created_at,
                        updated_at
                    )
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .eq('user_id', accountId);

            // Apply pagination only if both page and limit are provided
            if (pagination?.page && pagination?.limit) {
                const start = (pagination.page - 1) * pagination.limit;
                const end = start + pagination.limit - 1;
                query = query.range(start, end);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            return {
                data: data as Video[],
                count: count || 0
            };
        } catch (error) {
            console.error('Error in getVideosByAccountWithAccount:', error);
            throw error;
        }
    },

    /**
     * Get likes and dislikes for a video
     * @param supabase - Supabase client instance
     * @param videoId - The ID of the video to get likes and dislikes for
     * @returns An object containing the number of likes and dislikes
     */
    async getLikesAndDislikes(
        supabase: SupabaseClient, 
        videoId: string
    ): Promise<{ likes: number, dislikes: number }> {
        try {
            const { data, error } = await supabase
                .from('reactions')
                .select('reaction_type', { count: 'exact' })
                .eq('video_id', videoId);

            if (error) {
                console.error('Error fetching reactions:', error);
                throw error;
            }

            // Count likes and dislikes from the reactions
            const likes = data.filter(reaction => reaction.reaction_type === 'like').length;
            const dislikes = data.filter(reaction => reaction.reaction_type === 'dislike').length;

            return { likes, dislikes };
        } catch (error) {
            console.error('Error in getLikesAndDislikes:', error);
            return { likes: 0, dislikes: 0 }; // Return default values on error
        }
    },

    /**
     * Get a user's reaction to a video
     * @param supabase - Supabase client instance
     * @param videoId - The ID of the video to get the user's reaction for
     * @param userId - The ID of the user to get the reaction for
     * @returns The user's reaction to the video or null if not found
     */
    async getUsersReactionToVideo(supabase: SupabaseClient, videoId: string, userId: string): Promise<VideoReaction | null> {
        try {
            const { data, error } = await supabase
                .from('reactions')
                .select('*')
                .eq('video_id', videoId)
                .eq('user_id', userId)
                .maybeSingle(); // Use maybeSingle() instead of single()

            // If there's a real error (not just "not found")
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user reaction:', error);
                return null;
            }

            return data as VideoReaction | null;
        } catch (error) {
            console.error('Error in getUsersReactionToVideo:', error);
            return null;
        }
    },

    /**
     * Get paginated comments for a video
     * @param supabase - Supabase client instance
     * @param videoId - ID of the video to get comments for
     * @param pagination - Pagination parameters
     * @returns Paginated comments with total count
     */
    async getComments(
        supabase: SupabaseClient, 
        videoId: string,
        pagination?: PaginationParams
    ): Promise<PaginatedResponse<VideoComment>> {
        try {
            let query = supabase
                .from('comments')
                .select(`
                    *,
                    user:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url
                    )
                `, { count: 'exact' })
                .eq('video_id', videoId)
                .order('created_at', { ascending: false });

            // Apply pagination only if both page and limit are provided
            if (pagination?.page && pagination?.limit) {
                const start = (pagination.page - 1) * pagination.limit;
                const end = start + pagination.limit - 1;
                query = query.range(start, end);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            return {
                data: data as VideoComment[],
                count: count || 0
            };
        } catch (error) {
            console.error('Error in getComments:', error);
            throw error;
        }
    }
};