import { apiService } from './api';

class GeminiService {
  /**
   * Generate financial advice based on user prompt
   */
  async generateFinancialAdvice(prompt: string): Promise<string> {
    try {
      return await apiService.getFinancialAdvice(prompt);
    } catch (error) {
      console.error('Error generating financial advice:', error);
      return 'Unable to generate advice at this time. Please try again later.';
    }
  }

  /**
   * Stream financial advice from the AI backend.
   * Returns an async generator yielding text chunks.
   */
  streamFinancialAdvice(prompt: string): AsyncGenerator<string, void, unknown> {
    return apiService.streamFinancialAdvice(prompt);
  }

  /**
   * Upload and process a receipt image
   */
  async processReceipt(imageUri: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    message: string;
  }> {
    try {
      return await apiService.uploadReceipt(imageUri);
    } catch (error) {
      console.error('Error processing receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Unable to process receipt at this time. Please try again later.'
      };
    }
  }
}

export const geminiService = new GeminiService();
