import { useState, useEffect, useCallback } from 'react';

// FIX: Removed duplicate global declaration for window.aistudio. It is now centralized in types.ts.
export const useApiKey = (onKeyError: () => void) => {
    const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true);

    const checkKey = useCallback(async () => {
        setIsChecking(true);
        try {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeySelected(hasKey);
            } else {
                 setIsKeySelected(false);
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            setIsKeySelected(false);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        checkKey();
    }, [checkKey]);
    
    const selectKey = useCallback(async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                // Assume key selection is successful to avoid race condition
                // and provide immediate UI feedback.
                setIsKeySelected(true);
            } catch (error) {
                console.error("Error opening API key selection:", error);
                setIsKeySelected(false);
            }
        }
    }, []);
    
    // Allow parent component to reset key status on API failure
    const resetKeyStatus = useCallback(() => {
        setIsKeySelected(false);
        onKeyError();
    }, [onKeyError]);


    return { isKeySelected, selectKey, isChecking, checkKey: resetKeyStatus };
};