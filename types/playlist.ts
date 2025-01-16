import { Video, VideoVisibility } from "@/types/video";
import { Account } from "@/types/account";

export interface Playlist {
    id: string;
    created_at: string;
    title: string;
    thumbnail_url: string;
    visibility: VideoVisibility;
    user_id: string;  // Added to match database structure
    account: Account;
    videos: {
        addedAt: string;
        video: Video;
    }[];
}