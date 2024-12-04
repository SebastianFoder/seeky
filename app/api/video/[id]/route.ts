import { Video } from "@/types/video";
import { createClient } from "@/utils/supabase/server";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const id = (await params).id;

		const supabase = await createClient();

		const { data: videoData, error: videoError } = await supabase.from('videos').select('*').eq('id', id).single();
		const video = videoData as Video;

		if (videoError || !video) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}
		const deletePromises: Promise<any>[] = [
			deleteVideoProcessingTicketsFromSupabase(id, supabase),
			deleteCommentsFromSupabase(id, supabase),
			deleteReactionsFromSupabase(id, supabase),
			deleteVideoProcessingFromApi(id),
			deletePreviewFromApi(video),
			deleteThumbnailFromApi(video)
		];

		await Promise.all(deletePromises);

		await deleteVideoFromSupabase(id, supabase);

		return NextResponse.json({ message: "Video deleted successfully", video });
	} catch (error) {
		console.error("Error deleting video versions:", error);
		return NextResponse.json(
			{ error: "Error deleting video versions" },
			{ status: 500 }
		);
	}
}

async function deleteVideoFromSupabase(id: string, supabase: any) {
    await supabase.from('videos').delete().eq('id', id);
}

async function deleteVideoProcessingTicketsFromSupabase(id: string, supabase: any) {
    await supabase.from('video_processing_tickets').delete().eq('video_id', id);
}

async function deleteCommentsFromSupabase(id: string, supabase: any) {
    await supabase.from('comments').delete().eq('video_id', id);
}

async function deleteReactionsFromSupabase(id: string, supabase: any) {
    await supabase.from('reactions').delete().eq('video_id', id);
}

async function deleteVideoProcessingFromApi(id: string) {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/videoprocessing/${id}`);
}

async function deletePreviewFromApi(video: Video) {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/preview/${video.metadata?.previewGifURL?.split('/').pop()}`);
}

async function deleteThumbnailFromApi(video: Video) {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/thumbnail/${video.thumbnail_url?.split('/').pop()}`);
}
