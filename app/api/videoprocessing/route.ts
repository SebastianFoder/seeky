import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getVideoInfo, TranscodeConfig, transcodeVideo } from '@/lib/transcodeVideo';
import { SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const TRANSCODE_CONFIGS: TranscodeConfig[] = [
    {
        resolution: '480p',
        width: 854,
        height: 480,
        bitrate: '1000k',
        crf: 31
    },
    {
        resolution: '720p',
        width: 1280,
        height: 720,
        bitrate: '2500k',
        crf: 28
    },
    {
        resolution: '1080p',
        width: 1920,
        height: 1080,
        bitrate: '5000k',
        crf: 25
    }
];

/**
 * Creates and validates the temporary directory for video processing
 * @param tempDir - Path to the temporary directory
 */
async function setupTempDirectory(tempDir: string) {
    console.log(`Using temp directory: ${tempDir}`);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`Created temp directory: ${tempDir}`);
    }
}

/**
 * Extracts and validates form data from the request
 * @param request - The incoming Next.js request
 * @returns Object containing file, videoId, and test mode flag
 * @throws Error if file or videoId is missing
 */
async function handleFormData(request: NextRequest) {
    const formData = await request.formData();
    console.log('Received form data');
    
    const file = formData.get("file") as File;
    const videoId = formData.get("videoId") as string;
    const isTest = formData.get("test") === "true";
    const processingId = formData.get("processingId") as string;

    console.log(`Processing video ID: ${videoId}, Test mode: ${isTest}`);
    console.log(`Input file name: ${file.name}, size: ${file.size} bytes`);

    if (!file || !videoId) {
        throw new Error("Missing file or videoId");
    }

    return { file, videoId, isTest, processingId };
}

/**
 * Saves the uploaded file to the temporary directory
 * @param file - The uploaded file
 * @param tempDir - Path to the temporary directory
 * @param videoId - The ID of the video
 * @returns Path to the saved file
 */
async function saveUploadedFile(file: File, tempDir: string, videoId: string) {
    console.log('Saving uploaded file to temp directory...');
    const buffer = Buffer.from(await file.arrayBuffer());
    const inputPath = path.join(tempDir, `input-${videoId}${path.extname(file.name)}`);
    fs.writeFileSync(inputPath, buffer);
    console.log(`File saved to: ${inputPath}`);
    return inputPath;
}

/**
 * Validates the video codec of the uploaded file
 * @param inputPath - Path to the uploaded file
 * @returns Object containing video information and codec name
 * @throws Error if the video codec is not supported
 */
async function validateVideoCodec(inputPath: string) {
    console.log('Getting video information...');
    const videoInfo = await getVideoInfo(inputPath);
    const videoCodec = videoInfo.streams[0].codec_name?.toLowerCase();

    if (videoCodec !== 'h264' && videoCodec !== 'h265' && videoCodec !== 'hevc') {
        fs.unlinkSync(inputPath);
        throw new Error(`Only H.264, H.265, and HEVC videos are supported. Uploaded video uses ${videoCodec}`);
    }

    return { videoInfo, videoCodec };
}

/**
 * Sets up the test directory for video processing
 * @param isTest - Flag indicating if the process is in test mode
 * @param tempDir - Path to the temporary directory
 * @param videoId - The ID of the video
 * @returns Path to the test directory
 */
async function setupTestDirectory(isTest: boolean, tempDir: string, videoId: string) {
    const testOutputDir = isTest 
        ? path.join(os.tmpdir(), 'video-processing-test-outputs', videoId)
        : path.join(tempDir, 'test-outputs');
    
    if (isTest && !fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
    }

    return testOutputDir;
}

/**
 * Processes a single video version
 * @param config - The transcode configuration
 * @param inputPath - Path to the uploaded file
 * @param outputPath - Path to the output file
 * @param isTest - Flag indicating if the process is in test mode
 * @param videoId - The ID of the video
 * @param versions - Record of existing versions
 * @param supabase - Supabase client
 * @param eligibleConfigs - Array of eligible transcode configurations
 */
async function processVideoVersion(
    config: TranscodeConfig,
    inputPath: string,
    outputPath: string,
    isTest: boolean,
    videoId: string,
    versions: Record<string, string>,
    supabase: SupabaseClient | null,
    eligibleConfigs: TranscodeConfig[]
) {
    await transcodeVideo(inputPath, outputPath, config);

    if (isTest) {
        const stats = fs.statSync(outputPath);
        return {
            size: stats.size,
            resolution: `${config.width}x${config.height}`,
            bitrate: config.bitrate,
            crf: config.crf
        };
    }

    console.log(`Uploading ${config.resolution} to S3...`);
    const fileContent = fs.readFileSync(outputPath);
    const fileName = `${videoId}_${config.resolution}_${uuidv4()}.mp4`;
    
    await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_VIDEO_BUCKET_NAME!,
        Key: fileName,
        Body: fileContent,
        ContentType: 'video/mp4',
    }));
    
    versions[config.resolution] = 
        `https://${process.env.S3_VIDEO_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    
    if (!supabase) {
        supabase = await createClient();
    }

    await updateSupabase(supabase, videoId, versions, config === eligibleConfigs[eligibleConfigs.length - 1]);
    
    if (!isTest) {
        fs.unlinkSync(outputPath);
    }

    return null;
}

/**
 * Updates the Supabase database with the latest version information
 * @param supabase - Supabase client
 * @param videoId - The ID of the video
 * @param versions - Record of existing versions
 * @param isLastVersion - Flag indicating if the current version is the last one
 */
async function updateSupabase(supabase: any, videoId: string, versions: Record<string, string>, isLastVersion: boolean) {
    const { data: existingVideo, error: fetchError } = await supabase
        .from('videos')
        .select('metadata')
        .eq('id', videoId)
        .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
        .from('videos')
        .update({
            url: versions[Object.keys(versions)[Object.keys(versions).length - 1]],
            metadata: {
                ...existingVideo.metadata,
                versions,
                codec: 'h264',
                container: 'mp4'
            },
            status: isLastVersion ? 'published' : 'processing'
        })
        .eq('id', videoId);

    if (updateError) throw updateError;
    console.log(`Updated database with version information`);
}

/**
 * Cleans up the temporary directory after processing
 * @param tempDir - Path to the temporary directory
 * @param isTest - Flag indicating if the process is in test mode
 */
async function cleanup(tempDir: string, isTest: boolean) {
    if (!isTest) {
        console.log('Cleaning up temporary directory...');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        console.log('Cleanup completed');
    } else {
        console.log('Test mode: Skipping cleanup of temporary directory');
    }
}

/**
 * Processes video transcoding in the background.
 * 
 * This function handles the transcoding of a video file based on the provided configurations.
 * It processes each eligible configuration, uploads the transcoded videos to S3, and updates
 * the Supabase database with the new version information. It also manages temporary files and
 * directories, ensuring cleanup after processing.
 * 
 * @param inputPath - The path to the uploaded video file that needs to be transcoded.
 * @param videoId - The unique identifier for the video being processed.
 * @param videoInfo - Metadata about the video, including its height and codec information.
 * @param isTest - A flag indicating whether the processing is in test mode, affecting output paths.
 * @param tempDir - The path to the temporary directory used for storing intermediate files.
 * 
 * @returns {Promise<void>} A promise that resolves when the processing is complete.
 * 
 * @throws {Error} Throws an error if the background processing fails at any point.
 */
async function processVideoInBackground(
    inputPath: string,
    videoId: string,
    videoInfo: any,
    isTest: boolean,
    supabase: SupabaseClient | null,
    tempDir: string
) {
    try {
        const versions: Record<string, string> = {};
        const testData: Record<string, any> = {};

        const videoHeight = videoInfo.streams[0].height;
        const eligibleConfigs = TRANSCODE_CONFIGS.filter(config => config.height <= videoHeight);
        const testOutputDir = await setupTestDirectory(isTest, tempDir, videoId);

        for (const config of eligibleConfigs) {
            try {
                const outputPath = isTest 
                    ? path.join(testOutputDir, `output-${videoId}-${config.resolution}.mp4`)
                    : path.join(tempDir, `output-${videoId}-${config.resolution}.mp4`);
                
                await processVideoVersion(
                    config, 
                    inputPath, 
                    outputPath, 
                    isTest, 
                    videoId, 
                    versions, 
                    supabase,
                    eligibleConfigs
                );
            } catch (error) {
                console.error(`Error processing ${config.resolution}:`, error);
                continue;
            }
        }

        fs.unlinkSync(inputPath);
    } catch (error) {
        console.error('Background processing failed:', error);
        await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/video/${videoId}`);
    } finally {
        await cleanup(tempDir, isTest);
    }
}

/**
 * Main function to handle the video processing request
 * 
 * This function processes the incoming video upload request, validates the uploaded file,
 * saves it to a temporary directory, and initiates background processing for transcoding.
 * It also handles CORS preflight requests and returns appropriate responses based on the
 * success or failure of the operations.
 * 
 * @param request - The incoming Next.js request containing the video file and metadata.
 * @returns Next.js response with the status of the video processing request.
 */
export async function POST(request: NextRequest) {
    console.log('Starting video processing request...');
    const tempDir = path.join(os.tmpdir(), 'video-processing');
    let isTest = false;
    
    const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { headers });
    }

    try {
        await setupTempDirectory(tempDir);
        const { file, videoId, isTest: testMode, processingId } = await handleFormData(request);
        isTest = testMode;

        let supabase: SupabaseClient | null = null;

        if(!isTest) {
            supabase = await createClient();

            const { data: processingTicket, error: fetchError } = await supabase
                .from('video_processing_tickets')
                .select('*')
                .eq('processing_id', processingId)
                .eq('used', false)
                .maybeSingle();
        
            if (!processingTicket) {
                return NextResponse.json(
                    { error: "Processing ticket not found or invalid" },
                    { status: 404, headers }
                );
            }

            await supabase
                .from('video_processing_tickets')
                .update({ used: true })
                .eq('processing_id', processingId);
        }

        const inputPath = await saveUploadedFile(file, tempDir, videoId);
        const { videoInfo } = await validateVideoCodec(inputPath);        

        // Start background processing
        processVideoInBackground(inputPath, videoId, videoInfo, isTest, supabase, tempDir);

        // Return early with success response
        return NextResponse.json({ 
            success: true,
            message: 'Video upload successful, processing started',
            videoId 
        }, { headers });

    } catch (error: any) {
        console.error('Video validation failed:', error);
        return NextResponse.json(
            { error: "Validation failed", details: error.message || error },
            { status: 500, headers }
        );
    }
}

// Increase timeout for long-running transcoding
export const maxDuration = 300; // 5 minutes
