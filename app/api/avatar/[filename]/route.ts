import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { filename: string } }
) {
	try {
		const filename = (await params).filename;

		const command = new DeleteObjectCommand({
			Bucket: process.env.S3_AVATARS_BUCKET_NAME!,
			Key: `avatars/${filename}`,
		});

		await s3.send(command);

		return NextResponse.json({ message: "Avatar deleted successfully" });
	} catch (error) {
		console.error("Error deleting avatar:", error);
		return NextResponse.json(
			{ error: "Error deleting avatar" },
			{ status: 500 }
		);
	}
}