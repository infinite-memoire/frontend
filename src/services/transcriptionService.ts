import { pipeline } from '@huggingface/transformers';

// Service de transcription audio avec Whisper
export class TranscriptionService {
  private static transcriber: any = null;
  private static isInitializing = false;

  // Initialiser le modèle Whisper
  static async initializeTranscriber() {
    if (this.transcriber || this.isInitializing) {
      return this.transcriber;
    }

    this.isInitializing = true;
    console.log('🎤 Initializing Whisper transcriber...');

    try {
      // Utiliser Whisper tiny pour de meilleures performances
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { 
          device: 'webgpu',
          // Fallback vers CPU si WebGPU n'est pas disponible
          dtype: 'fp32'
        }
      );
      
      console.log('✅ Whisper transcriber initialized');
      return this.transcriber;
    } catch (error) {
      console.warn('⚠️ WebGPU not available, falling back to CPU...');
      try {
        this.transcriber = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en'
        );
        console.log('✅ Whisper transcriber initialized on CPU');
        return this.transcriber;
      } catch (cpuError) {
        console.error('❌ Failed to initialize Whisper:', cpuError);
        throw cpuError;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  // Transcrire un fichier audio
  static async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('🎤 Transcribing audio with Whisper...');
      console.log('📁 Audio size:', audioBlob.size, 'bytes');
      console.log('📁 Audio type:', audioBlob.type);

      // Initialiser le transcripteur si nécessaire
      const transcriber = await this.initializeTranscriber();
      if (!transcriber) {
        throw new Error('Impossible d\'initialiser le transcripteur');
      }

      // Convertir le blob en URL pour Whisper
      const audioUrl = URL.createObjectURL(audioBlob);
      
      try {
        // Transcrire l'audio
        const result = await transcriber(audioUrl);
        
        // Nettoyer l'URL temporaire
        URL.revokeObjectURL(audioUrl);
        
        console.log('✅ Transcription completed');
        console.log('📝 Result:', result.text.substring(0, 100) + '...');
        
        return result.text || '';
        
      } catch (transcriptionError) {
        URL.revokeObjectURL(audioUrl);
        throw transcriptionError;
      }
      
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      throw new Error(`Échec de la transcription: ${error.message}`);
    }
  }

  // Transcrire plusieurs fichiers audio
  static async transcribeMultipleAudios(audioUrls: string[]): Promise<string[]> {
    const transcriptions: string[] = [];
    
    for (let i = 0; i < audioUrls.length; i++) {
      console.log(`🎤 Transcribing audio ${i + 1}/${audioUrls.length}`);
      
      try {
        // Télécharger l'audio
        const response = await fetch(audioUrls[i]);
        if (!response.ok) {
          throw new Error(`Impossible de télécharger l'audio ${i + 1}`);
        }
        
        const audioBlob = await response.blob();
        
        // Transcrire
        const transcription = await this.transcribeAudio(audioBlob);
        transcriptions.push(transcription);
        
      } catch (error) {
        console.error(`❌ Error transcribing audio ${i + 1}:`, error);
        // Ajouter une transcription d'erreur pour continuer le processus
        transcriptions.push(`[Erreur de transcription pour l'audio ${i + 1}: ${error.message}]`);
      }
    }
    
    return transcriptions;
  }
}

export default TranscriptionService;