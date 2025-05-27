// Speech utilities for text-to-speech and speech-to-text

/**
 * Speaks the provided text using the browser's speech synthesis
 * @param text The text to speak
 * @param options Speech synthesis options
 */
export function speakText(text: string, options?: SpeechSynthesisUtteranceOptions): void {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
    return;
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  if (options) {
    if (options.voice) utterance.voice = options.voice;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.rate) utterance.rate = options.rate;
    if (options.volume) utterance.volume = options.volume;
    if (options.lang) utterance.lang = options.lang;
  } else {
    // Default to a slightly slower rate for better comprehension
    utterance.rate = 0.9;
  }
  
  window.speechSynthesis.speak(utterance);
}

/**
 * Stops all speech synthesis
 */
export function stopSpeaking(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Gets available voices for speech synthesis
 * @param preferredLang Optional preferred language code (e.g., 'en-US')
 */
export async function getAvailableVoices(preferredLang?: string): Promise<SpeechSynthesisVoice[]> {
  if (!window.speechSynthesis) {
    return [];
  }
  
  // Wait for voices to load if needed
  if (window.speechSynthesis.getVoices().length === 0) {
    await new Promise<void>(resolve => {
      const checkVoices = () => {
        if (window.speechSynthesis.getVoices().length > 0) {
          resolve();
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      checkVoices();
    });
  }
  
  const voices = window.speechSynthesis.getVoices();
  
  if (preferredLang) {
    return voices.filter(voice => voice.lang.includes(preferredLang));
  }
  
  return voices;
}

// Type definition for SpeechSynthesisUtterance options
interface SpeechSynthesisUtteranceOptions {
  voice?: SpeechSynthesisVoice;
  pitch?: number; // 0 to 2
  rate?: number; // 0.1 to 10
  volume?: number; // 0 to 1
  lang?: string; // BCP 47 language tag
}
