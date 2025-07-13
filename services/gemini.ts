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
}

export const geminiService = new GeminiService();
