import React from 'react';
import VideoList from '@/components/video-list';
import { createClient } from '@/utils/supabase/server';
import { playlistService } from '@/services/playlistService';

export default async function Index() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div>Please login to view your playlists.</div>;
    }
    // const showData = await playlistService.getPlaylistById(supabase, '6d091444-dbfa-4718-94e7-3d4f466716cd', user.id);
    const showData = await playlistService.getPlaylistsByUserFromUserId(supabase, user.id);
    // const showData = await playlistService.test(supabase);

    return (
        <div>
            <pre>{JSON.stringify(showData, null, 2)}</pre>
            <h1>Video Gallery</h1>
            {/* <VideoList
                searchTerm="" 
                filterTags={[]} 
            /> */}

        </div>
    );
}
