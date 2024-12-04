import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

ffmpeg.setFfmpegPath('C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin\\ffprobe.exe');

export interface TranscodeConfig {
    resolution: string;
    width: number;
    height: number;
    bitrate: string;
    crf: number;
}

export async function getVideoInfo(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
        });
    });
}

export async function transcodeVideo(
    inputPath: string, 
    outputPath: string, 
    config: TranscodeConfig
): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Starting transcode for ${config.resolution}...`);

        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const inputBitrate = metadata.format.bit_rate ? metadata.format.bit_rate / 1000 : 0;
            const targetBitrate = parseInt(config.bitrate);
            const inputHeight = metadata.streams[0].height || 0;
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const inputCodec = videoStream?.codec_name?.toLowerCase();

            // Determine if any changes are needed
            const needsResolutionChange = inputHeight > config.height;
            const needsBitrateChange = inputBitrate > targetBitrate;
            const needsCodecChange = inputCodec !== 'h264';

            console.log(`Input analysis:
                - Resolution change needed: ${needsResolutionChange} (${inputHeight}p -> ${config.height}p)
                - Bitrate change needed: ${needsBitrateChange} (${inputBitrate}k -> ${targetBitrate}k)
                - Codec change needed: ${needsCodecChange} (${inputCodec} -> h264)`);

            // If no changes needed, just copy the file
            if (!needsResolutionChange && !needsBitrateChange && !needsCodecChange) {
                console.log(`No changes needed for ${config.resolution}, copying file...`);
                fs.copyFile(inputPath, outputPath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Finished copying file for ${config.resolution}`);
                        resolve();
                    }
                });
                return;
            }

            // Setup CUDA decoder if available
            const inputOptions = ["-y"];
            let decoder =  '';
            if(inputCodec === 'h264') {
                decoder = 'h264_cuvid';
            } else if(inputCodec === 'hevc') {
                decoder = 'hevc_cuvid';
            } else if(inputCodec === 'h265') {
                decoder = 'hevc_cuvid';
            }

            const supportsCuda = !!decoder;

            if (supportsCuda) {
                inputOptions.push(
                    `-hwaccel cuda`,
                    `-c:v ${decoder}`
                );
            }

            // Build output options based on what needs to change
            const outputOptions = [
                `-c:v h264_nvenc`,
                `-preset p4`,
                `-profile:v high`,
                `-rc:v vbr`,
                `-c:a copy`,
                `-crf ${config.crf}`
            ];

            if (needsBitrateChange) {
                outputOptions.push(
                    `-b:v ${targetBitrate}k`,
                    `-maxrate ${targetBitrate}k`,
                    `-bufsize ${targetBitrate * 2}k`
                );
            } else {
                outputOptions.push(
                    `-b:v ${inputBitrate}k`,
                    `-maxrate ${inputBitrate}k`,
                    `-bufsize ${inputBitrate * 2}k`
                );
            }

            if (needsResolutionChange) {
                const width = Math.floor(config.width / 2) * 2;
                const height = Math.floor(config.height / 2) * 2;
                outputOptions.push(
                    `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`
                );
            } else if (needsCodecChange) {
                outputOptions.push(`-vf format=yuv420p`);
            }

            console.log(`Transcoding with options:`, outputOptions);

            ffmpeg(inputPath)
                .inputOptions(inputOptions)
                .outputOptions(outputOptions)
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log(`Spawned FFmpeg with command: ${commandLine}`);
                })
                .on('progress', (progress) => {
                    console.log(`[${config.resolution}] Processing: ${progress.percent?.toFixed(1)}% done`);
                    console.log(`Frame: ${progress.frames}, FPS: ${progress.currentFps}, Time: ${progress.timemark}`);
                })
                .on('end', () => {
                    console.log(`Finished transcoding ${config.resolution}`);
                    console.log(`Output file size: ${fs.statSync(outputPath).size} bytes`);
                    console.log(`Output file placement: ${outputPath}`);
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    console.error(`Error transcoding ${config.resolution}:`, err);
                    console.error('FFmpeg stderr:', stderr);
                    reject(err);
                })
                .run();
        });
    });
}