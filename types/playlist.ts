import { Video, VideoVisibility } from "@/types/video";

export interface Playlist {
    id: string;
    created_at: string;
    title: string;
    thumbnail_url: string;
    visibility: VideoVisibility;
    videos: Video[];
}