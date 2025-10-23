import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { AspectRatio } from '../types';

// FIX: Removed duplicate global declaration for window.aistudio. It is now centralized in types.ts.
export const generateVideoFromImage = async (
    prompt: string,
    imageBase64: string,
    mimeType: string,
    aspectRatio: AspectRatio,
): Promise<string> => {
    // A new instance is created to ensure the latest API key from the dialog is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let operation: GenerateVideosOperation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: imageBase64,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });

    while (!operation.done) {
        // Poll every 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error('Video generation failed to produce a download link.');
    }

    return downloadLink;
};