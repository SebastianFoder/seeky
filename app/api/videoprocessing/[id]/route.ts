import { createClient } from "@/utils/supabase/server";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

// Define the type for video versions
type VideoVersions = {
    [key: string]: string; // Assuming the values are URLs (strings)
};

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const id = (await params).id;

		const supabase = await createClient();

		const { data, error } = await supabase.from('videos').select('metadata').eq('id', id).single();

		if (error || !data) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}

		console.log(data);

		// Extract video versions URLs
		const versions: VideoVersions | null = data.metadata?.versions || null; // Explicitly define the type
		const deletePromises: Promise<any>[] = [];
		if (versions) {
			for (const quality of Object.keys(versions)) {
                console.log(quality);
                console.log(versions[quality].split('/').pop()!)
				deletePromises.push(s3.send(new DeleteObjectCommand({
					Bucket: process.env.S3_VIDEO_BUCKET_NAME!,
					Key: versions[quality].split('/').pop()!, // Extract the file name from the URL
				})));
			}
		}

		// Wait for all delete operations to complete
		await Promise.all(deletePromises);

		return NextResponse.json({ message: "Video versions deleted successfully" });
	} catch (error) {
		console.error("Error deleting video versions:", error);
		return NextResponse.json(
			{ error: "Error deleting video versions" },
			{ status: 500 }
		);
	}
}