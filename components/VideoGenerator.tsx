import React, { useState, useCallback, useEffect } from 'react';
import { AspectRatio } from '../types';
import { useApiKey } from '../hooks/useApiKey';
import { generateVideoFromImage } from '../services/geminiService';
import { UploadIcon, SparklesIcon, AlertIcon } from './icons';

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Teaching photons how to dance...",
    "Rendering your masterpiece, frame by frame...",
    "This can take a few minutes, time for a coffee?",
    "The AI is hard at work, great things take time!",
];

const VideoGenerator: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resetApiKeyStatus = useCallback(() => {
        // This will be passed to the hook to reset key status on API failure
    }, []);

    const { isKeySelected, selectKey, checkKey } = useApiKey(resetApiKeyStatus);

    useEffect(() => {
        // FIX: Changed NodeJS.Timeout to ReturnType<typeof setInterval> for browser compatibility.
        let interval: ReturnType<typeof setInterval>;
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isLoading]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64((reader.result as string).split(',')[1]);
            };
            reader.readAsDataURL(file);
            setVideoUrl(null);
            setError(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!imageBase64 || !prompt || !isKeySelected) {
            setError('Please provide an image, a prompt, and ensure an API key is selected.');
            return;
        }

        setIsLoading(true);
        setVideoUrl(null);
        setError(null);
        setLoadingMessage(loadingMessages[0]);

        try {
            const videoUri = await generateVideoFromImage(prompt, imageBase64, imageFile!.type, aspectRatio);
            const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);
        } catch (e: any) {
            console.error(e);
            let errorMessage = e.message || 'An unknown error occurred.';
             if (e.message?.includes('Requested entity was not found')) {
                errorMessage = 'API Key validation failed. Please re-select your API key.';
                resetApiKeyStatus(); 
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const ImagePreview = () => (
        <div className="mt-4 w-full aspect-video bg-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-600">
            {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="max-h-full max-w-full object-contain" />
            ) : (
                <div className="text-center text-gray-400">
                    <UploadIcon className="mx-auto h-12 w-12" />
                    <p>Image preview will appear here</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400">Animate Your Image with Veo</h2>
            
            {!isKeySelected ? (
                 <div className="text-center p-6 bg-yellow-900/30 border border-yellow-500 rounded-lg">
                    <AlertIcon className="mx-auto h-10 w-10 text-yellow-400 mb-3" />
                    <h3 className="text-lg font-semibold text-yellow-300">API Key Required for Veo</h3>
                    <p className="text-yellow-400 mt-2">Video generation requires a Google AI Studio API key. Please select a key to proceed.</p>
                    <p className="text-sm mt-2 text-gray-400">
                       For more information on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI billing docs</a>.
                    </p>
                    <button onClick={selectKey} className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md">
                        Select API Key
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">1. Upload Starting Image</label>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700/50 hover:bg-gray-700 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadIcon className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">PNG, JPG, WEBP, etc.</p>
                                </div>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                        <ImagePreview />
                    </div>

                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Describe the Animation</label>
                        <textarea
                            id="prompt"
                            rows={3}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-500"
                            placeholder="e.g., A gentle breeze rustles the leaves, cinematic lighting"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    <div>
                        <h3 className="block text-sm font-medium text-gray-300 mb-2">3. Select Aspect Ratio</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* FIX: Used Object.keys to correctly iterate over enum keys instead of values. */}
                            {(Object.keys(AspectRatio) as Array<keyof typeof AspectRatio>).map(key => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setAspectRatio(AspectRatio[key])}
                                    className={`p-4 rounded-lg text-center font-semibold transition ${aspectRatio === AspectRatio[key] ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {AspectRatio[key]} ({key.toLowerCase()})
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isLoading || !prompt || !imageBase64} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-300">
                        <SparklesIcon />
                        {isLoading ? 'Generating Video...' : 'Generate Video'}
                    </button>
                </form>
            )}

            {isLoading && (
                <div className="mt-6 text-center p-6 bg-gray-700/50 rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold animate-pulse">{loadingMessage}</p>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg flex items-center gap-3">
                    <AlertIcon />
                    <span>{error}</span>
                </div>
            )}
            
            {videoUrl && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-center">Your Generated Video</h3>
                    <video controls autoPlay loop src={videoUrl} className="w-full rounded-lg shadow-2xl border border-gray-700" />
                </div>
            )}

        </div>
    );
};

export default VideoGenerator;