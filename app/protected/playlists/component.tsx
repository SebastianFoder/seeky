'use client';

import PlaylistList from "@/components/playlist-list";
import PlaylistListSkeleton from "@/components/playlist-card-skeleton";
import { accountService } from "@/services/accountService";
import { playlistService } from "@/services/playlistService";
import { Account } from "@/types/account";
import { Playlist } from "@/types/playlist";
import { createClient } from "@/utils/supabase/client";
import { Plus } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

export default function PlaylistComponent() {
    const supabase = createClient();
    const [account, setAccount] = useState<Account | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: {session} } = await supabase.auth.getSession();
            if(session?.user){
                const account = await accountService.getAccountByUid(supabase, session.user.id);
                setAccount(account);
            }
        };
        fetchUser();
    }, []);

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [pageNum, setPageNum] = useState<number>(1);
    const [initialLoad, setInitialLoad] = useState<boolean>(true);

    const loadMore = async () => {
        console.log('loadMore', pageNum);
        if(!account || !hasMore) return;
        console.log("loading more");
        const response = await playlistService.getPlaylistsByUserFromUserId(supabase, account.uid, {
            page: pageNum,
            limit: 12
        });
        setPlaylists(response.data);
        setTotalCount(response.count);
        setHasMore(response.count > playlists.length);
        setPageNum(pageNum + 1);
        if(!initialLoad) {
            setInitialLoad(false);
        }
    }

    useEffect(() => {
        if(initialLoad) {
            loadMore();
        }
    }, [account]);


    return (
        <div>
            <div className="playlists-header">
                <h1>Playlists</h1>
                <a href="/playlists/create" className="btn btn-primary">        
                    <Plus />
                    <span> Create Playlist</span>
                </a>
            </div>
            <Suspense fallback={<PlaylistListSkeleton />}>
                <PlaylistList 
                    playlists={playlists}
                    totalCount={totalCount}
                    hasMore={hasMore}
                    loadMore={loadMore}
                />
            </Suspense>
        </div>
    );
}