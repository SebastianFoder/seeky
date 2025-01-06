import { Playlist } from "@/types/playlist";
import { SupabaseClient } from "@supabase/supabase-js";

export const playlistService = {
    async test(supabase: SupabaseClient) {
        const { data, error } = await supabase
            .from('playlists')
            .select('*');

        return data;
    },
    async getPlaylistsByUserFromUserId(supabase: SupabaseClient, userId: string) {
        const { data, error } = await supabase
            .from('playlists')
            .select(`
                id,
                created_at,
                title,
                thumbnail_url,
                visibility,
                playlists_videos_link!inner(
                    id,
                    created_at,
                    videos(
                        id,
                        title,
                        description,
                        url,
                        thumbnail_url,
                        duration,
                        views,
                        status,
                        visibility,
                        tags,
                        created_at,
                        updated_at,
                        account:accounts (
                            uid,
                            username,
                            display_name,
                            avatar_url,
                            bio
                        )
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(playlist => ({
            id: playlist.id,
            created_at: playlist.created_at,
            title: playlist.title,
            thumbnail_url: playlist.thumbnail_url,
            visibility: playlist.visibility,
            videos: playlist.playlists_videos_link
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(link => link.videos)
        })) as unknown as Playlist[];
    }
}