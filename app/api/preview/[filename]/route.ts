import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function DELETE(request: NextRequest, { params }: { params: { filename: string } }) {
    try {
        const fileName = (await params).filename;

        if (!fileName) {
            return NextResponse.json(
                { error: "No filename provided" },
                { status: 400 }
            );
        }

        // Delete from S3
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_THUMBNAIL_BUCKET_NAME!,
            Key: `thumbnails/${fileName}`,
        });

        await s3.send(command);

        return NextResponse.json(
            { message: "Preview deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error deleting preview:", error);
        return NextResponse.json(
            { error: "Error deleting preview" },
            { status: 500 }
        );
    }
}
