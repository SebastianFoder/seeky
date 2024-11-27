import axios from 'axios';
import { Video, VideoComment, VideoReaction } from '@/types/video';
import { SupabaseClient } from '@supabase/supabase-js';

interface UploadStep {
    execute: () => Promise<any>;
    cleanup: () => Promise<void>;
}

interface UploadState {
    videoUrl: string | null;
    thumbnailUrl: string | null;
    videoRecord: Video | null;
}

interface PaginationParams {
    page: number;
    limit: number;
}

interface PaginatedResponse<T> {
    data: T[];
    count: number;
}

interface CommentPaginationParams {
    page?: number;
    limit?: number;
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
            videoRecord: null
        };

        const steps: UploadStep[] = [
            {
                execute: async () => {
                    const videoFormData = new FormData();
                    videoFormData.append('file', videoFile);
                    
                    const response = await axios.post('/api/video', videoFormData);
                    state.videoUrl = response.data.url;
                    onProgress?.(Math.floor(Math.random() * 23) + 11);
                },
                cleanup: async () => {
                    if (state.videoUrl) {
                        await axios.delete(`/api/video/${state.videoUrl.split('/').pop()}`);
                    }
                }
            },
            {
                execute: async () => {
                    const thumbnailFormData = new FormData();
                    thumbnailFormData.append('file', thumbnailFile);
                    
                    const response = await axios.post('/api/thumbnail', thumbnailFormData);
                    state.thumbnailUrl = response.data.url;
                    onProgress?.(Math.floor(Math.random() * 23) + 44);
                },
                cleanup: async () => {
                    if (state.thumbnailUrl) {
                        await axios.delete(`/api/thumbnail/${state.thumbnailUrl.split('/').pop()}`);
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
                            visibility: metadata.visibility
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
            }
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
                .select('*')
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
                data: data.map(item => ({
                    ...item,
                    user: item.account
                })) as Video[],
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
     * @param supabase - Supabase client instance
     * @param videoId - ID of the video to delete
     */
    async deleteVideo(supabase: SupabaseClient, videoId: string): Promise<void> {
        try {
            // First, get the video URLs
            const { data: video, error: fetchError } = await supabase
                .from('videos')
                .select('url, thumbnail_url')
                .eq('id', videoId)
                .single();

            if (fetchError) throw fetchError;

            if (!video) throw new Error('Video not found');

            if (!video.url || !video.thumbnail_url) throw new Error('Video or thumbnail URL not found');
            
            if(typeof video.url !== 'string' || typeof video.thumbnail_url !== 'string') throw new Error('Video or thumbnail URL is not a string');

            // Extract filenames from URLs
            const videoFilename = video.url.split('/').pop();
            const thumbnailFilename = video.thumbnail_url.split('/').pop();

            console.log(videoFilename, thumbnailFilename);

            // Delete from database first
            const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (deleteError) throw deleteError;

            // Delete video and thumbnail from S3
            try {
                await Promise.all([
                    axios.delete(`/api/video/${videoFilename}`),
                    axios.delete(`/api/thumbnail/${thumbnailFilename}`)
                ]);
            } catch (s3Error) {
                console.error('Error deleting files from S3:', s3Error);
                // Consider if you want to revert the database deletion here
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
     * @returns An array of Video objects with account information.
     */
    async fetchPublicVideosWithAccount(
        supabase: SupabaseClient,
        { page = 1, limit = 12 }: PaginationParams
    ): Promise<PaginatedResponse<Video>> {
        try {
            // First get the total count
            const { count } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('visibility', 'public');

            // If count is 0 or page is beyond available data, return empty result
            if (!count || (page - 1) * limit >= count) {
                return {
                    data: [],
                    count: count || 0
                };
            }

            const start = (page - 1) * limit;
            const end = Math.min(start + limit - 1, count - 1);

            // Get data for valid range
            const { data, error } = await supabase
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
                .eq('visibility', 'public')
                .order('views', { ascending: false })
                .range(start, end);

            if (error) throw error;

            return {
                data: data.map(item => ({
                    ...item,
                    user: item.account
                })) as Video[],
                count: count
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
            const page = options?.page || 1;
            const limit = options?.limit || 12;

            // Build base query for count
            let countQuery = supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');

            // Add conditions to count query
            if (options?.includeUnlisted) {
                countQuery = countQuery.or('visibility.eq.unlisted');
            }

            if (options?.userId) {
                countQuery = countQuery.or(`visibility.eq.private,user_id.eq.${options.userId}`);
            }

            if (options?.tags?.length) {
                countQuery = countQuery.contains('tags', options.tags);
            }

            // Get total count
            const { count } = await countQuery;

            // If count is 0 or page is beyond available data, return empty result
            if (!count || (page - 1) * limit >= count) {
                return {
                    data: [],
                    count: count || 0
                };
            }

            const start = (page - 1) * limit;
            const end = Math.min(start + limit - 1, count - 1);

            // Build data query
            let dataQuery = supabase
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
                .order('views', { ascending: false })
                .range(start, end);

            // Add same conditions to data query
            if (options?.includeUnlisted) {
                dataQuery = dataQuery.or('visibility.eq.unlisted');
            }

            if (options?.userId) {
                dataQuery = dataQuery.or(`visibility.eq.private,user_id.eq.${options.userId}`);
            }

            if (options?.tags?.length) {
                dataQuery = dataQuery.contains('tags', options.tags);
            }

            // Execute data query
            const { data, error } = await dataQuery;

            if (error) throw error;

            return {
                data: data.map(item => ({
                    ...item,
                    user: item.account
                })) as Video[],
                count: count
            };
        } catch (error) {
            console.error('Error in getVideosWithAccount:', error);
            throw error;
        }
    },

    async getVideosWithSearch(
        supabase: SupabaseClient,
        searchTerm: string,
        { page = 1, limit = 12 }: PaginationParams
    ): Promise<PaginatedResponse<Video>> {
        try {
            // Clean and prepare the search term
            const cleanTerm = searchTerm.trim().replace(/[%_]/g, '\\$&'); // Escape special SQL characters

            // First get the total count
            const { count } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .or(
                    `title.ilike.%${cleanTerm}%,` +
                    `description.ilike.%${cleanTerm}%,` +
                    `tags.cs.{${cleanTerm}}`
                )
                .eq('visibility', 'public')
                .eq('status', 'published');

            // If count is 0 or page is beyond available data, return empty result
            if (!count || (page - 1) * limit >= count) {
                return {
                    data: [],
                    count: count || 0
                };
            }

            const start = (page - 1) * limit;
            const end = Math.min(start + limit - 1, count - 1);

            // Get data for valid range
            const { data, error } = await supabase
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
                .or(
                    `title.ilike.%${cleanTerm}%,` +
                    `description.ilike.%${cleanTerm}%,` +
                    `tags.cs.{${cleanTerm}}`
                )
                .eq('visibility', 'public')
                .eq('status', 'published')
                .order('views', { ascending: false })
                .range(start, end);

            if (error) throw error;

            return {
                data: data.map(item => ({
                    ...item,
                    user: item.account
                })) as Video[],
                count: count
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

            return {
                ...data,
                user: data.account
            } as Video;
        } catch (error) {
            console.error('Error in getVideoByIdWithAccount:', error);
            return null;
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
        { page = 1, limit = 10 }: CommentPaginationParams = {}
    ): Promise<PaginatedResponse<VideoComment>> {
        try {
            const start = (page - 1) * limit;
            const end = start + limit - 1;

            const { data, error, count } = await supabase
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
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) {
                console.error('Error fetching comments:', error);
                throw error;
            }

            // Transform the data to match VideoComment type
            const comments = data.map(comment => ({
                ...comment,
                user: comment.user
            })) as VideoComment[];

            return {
                data: comments,
                count: count || 0
            };
        } catch (error) {
            console.error('Error in getComments:', error);
            throw error;
        }
    }
};