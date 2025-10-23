
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, encode, createPcmBlob } from '../utils/audioUtils';
import { MicIcon, StopIcon, UserIcon, BotIcon } from './icons';
import { TranscriptEntry } from '../types';

const LiveConversation: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const currentInputTranscriptionRef = useRef<string>('');
    const currentOutputTranscriptionRef = useRef<string>('');
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcripts]);

    const handleStart = useCallback(async () => {
        if (isRecording) return;
        
        setTranscripts([]);
        setStatus('connecting');
        setError(null);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('connected');
                        setIsRecording(true);
                        
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createPcmBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        handleServerMessage(message);
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError('A connection error occurred. Please try again.');
                        handleStop();
                    },
                    onclose: (e: CloseEvent) => {
                       handleStop();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: 'You are a friendly and helpful conversational AI assistant.',
                },
            });
            
            sessionRef.current = await sessionPromise;
            
        } catch (err) {
            console.error('Failed to start conversation:', err);
            setError('Could not access microphone. Please grant permission and try again.');
            setStatus('error');
        }
    }, [isRecording]);

    const [error, setError] = useState<string | null>(null);

    const handleServerMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
        }
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
        }

        if (message.serverContent?.turnComplete) {
            const userInput = currentInputTranscriptionRef.current.trim();
            const modelOutput = currentOutputTranscriptionRef.current.trim();
            
            setTranscripts(prev => {
                const newTranscripts = [...prev];
                if(userInput) newTranscripts.push({ source: 'user', text: userInput });
                if(modelOutput) newTranscripts.push({ source: 'model', text: modelOutput });
                return newTranscripts;
            });

            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            const outputAudioContext = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1
            );

            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
            });
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }

        if(message.serverContent?.interrupted){
             for (const source of audioSourcesRef.current.values()) {
                source.stop();
             }
             audioSourcesRef.current.clear();
             nextStartTimeRef.current = 0;
        }
    };
    
    const handleStop = useCallback(() => {
        if (!isRecording && status === 'idle') return;

        setIsRecording(false);
        setStatus('idle');
        
        sessionRef.current?.close();
        sessionRef.current = null;
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

    }, [isRecording, status]);

    const getStatusIndicator = () => {
        switch (status) {
            case 'idle':
                return <span className="text-gray-400">Idle</span>;
            case 'connecting':
                return <span className="text-yellow-400 animate-pulse">Connecting...</span>;
            case 'connected':
                return <span className="text-green-400 animate-pulse">Connected & Listening...</span>;
            case 'error':
                return <span className="text-red-400">Error</span>;
        }
    };

    return (
        <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 flex flex-col" style={{height: '60vh'}}>
             <h2 className="text-2xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400">Live Conversation with Gemini</h2>
             <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-medium">{getStatusIndicator()}</div>
                <div className="flex space-x-4">
                    <button onClick={handleStart} disabled={isRecording} className="p-3 bg-green-600 rounded-full text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-green-700 transition shadow-lg">
                        <MicIcon />
                    </button>
                    <button onClick={handleStop} disabled={!isRecording} className="p-3 bg-red-600 rounded-full text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-red-700 transition shadow-lg">
                        <StopIcon />
                    </button>
                </div>
             </div>

             {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-sm">
                    {error}
                </div>
            )}
            
            <div ref={transcriptContainerRef} className="flex-grow bg-gray-900 rounded-lg p-4 overflow-y-auto space-y-4 border border-gray-700">
                {transcripts.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Press the start button to begin the conversation.</p>
                    </div>
                )}
                {transcripts.map((entry, index) => (
                    <div key={index} className={`flex items-start gap-3 animate-fadeIn ${entry.source === 'user' ? 'justify-end' : ''}`}>
                        {entry.source === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center"><BotIcon /></div>}
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl ${entry.source === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                            <p className="text-sm">{entry.text}</p>
                        </div>
                         {entry.source === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><UserIcon /></div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveConversation;
