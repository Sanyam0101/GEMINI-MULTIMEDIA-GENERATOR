export enum AspectRatio {
    LANDSCAPE = '16:9',
    PORTRAIT = '9:16',
}

export type TranscriptEntry = {
    source: 'user' | 'model';
    text: string;
};

// FIX: Centralized window.aistudio type declaration to avoid conflicts.
declare global {
    interface Window {
        aistudio?: {
            hasSelectedApiKey: () => Promise<boolean>;
            openSelectKey: () => Promise<void>;
        };
    }
}