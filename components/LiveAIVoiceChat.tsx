
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import ReceiptUpload from './ReceiptUpload';

interface VoiceMessage {
  id: string;
  text?: string;
  isUser: boolean;
  isAudio?: boolean;
  audioData?: string;
  receiptData?: any;
}

interface ReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  items: string[];
  confidence: string;
}

const WS_URL = `ws://${window.location.hostname}:8000/api/ai/voice/ws/user_123`;

export default function LiveAIVoiceChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [transcript, setTranscript] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const audioChunkBuffer = useRef<string[]>([]);
  const isPlayingAudio = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Helper: encode PCM to base64
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Helper: decode base64 to ArrayBuffer
  function base64ToArrayBuffer(base64: string) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Receipt handling functions
  const handleReceiptProcessed = (receiptData: ReceiptData) => {
    console.log('LiveAIVoiceChat: Receipt processed:', receiptData);
    
    // Store the receipt data
    setCurrentReceipt(receiptData);
    
    // Add user message showing receipt was uploaded
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      text: `Receipt uploaded: ${receiptData.merchant} - $${receiptData.amount.toFixed(2)}`,
      isUser: true,
      receiptData,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send receipt context to AI via WebSocket
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const receiptContext = `I've received a receipt with the following details:
Merchant: ${receiptData.merchant}
Amount: $${receiptData.amount.toFixed(2)}
Date: ${receiptData.date}
Category: ${receiptData.category}
Description: ${receiptData.description}
Items: ${receiptData.items.join(', ')}
Confidence: ${receiptData.confidence}

Please acknowledge that you've received this receipt information and ask if I'd like you to add it as a transaction to my records.`;

      const message = {
        mime_type: "text/plain",
        data: receiptContext
      };
      
      ws.current.send(JSON.stringify(message));
      console.log('LiveAIVoiceChat: Sent receipt context to AI');
    }
  };

  const handleReceiptError = (error: string) => {
    console.error('LiveAIVoiceChat: Receipt error:', error);
    const errorMessage: VoiceMessage = {
      id: Date.now().toString(),
      text: `Receipt processing failed: ${error}`,
      isUser: false,
    };
    setMessages(prev => [...prev, errorMessage]);
  };

  // Play buffered PCM audio chunks
  async function playBufferedAudio() {
    if (isPlayingAudio.current || audioChunkBuffer.current.length === 0) return;
    
    isPlayingAudio.current = true;
    const audioCtx = audioContextRef.current || new window.AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioCtx;

    try {
      while (audioChunkBuffer.current.length > 0) {
        const chunks = audioChunkBuffer.current.splice(0, 3); // Process smaller chunks for responsiveness
        let totalLength = 0;
        const pcmArrays = chunks.map(base64 => {
          const buffer = base64ToArrayBuffer(base64);
          const pcm = new Int16Array(buffer);
          totalLength += pcm.length;
          return pcm;
        });

        if (totalLength === 0) continue;

        const mergedPcm = new Int16Array(totalLength);
        let offset = 0;
        for (const arr of pcmArrays) {
          mergedPcm.set(arr, offset);
          offset += arr.length;
        }

        const float32 = new Float32Array(mergedPcm.length);
        for (let i = 0; i < mergedPcm.length; i++) {
          float32[i] = mergedPcm[i] / 32768;
        }

        const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        currentAudioSource.current = source;
        
        source.start();
        await new Promise(resolve => {
          source.onended = resolve;
        });
        currentAudioSource.current = null;
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    } finally {
      isPlayingAudio.current = false;
    }
  }

  // Start continuous audio streaming
  const startContinuousRecording = async () => {
    try {
      console.log('Starting continuous recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaStreamRef.current = stream;
      
      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1); // Smaller buffer for lower latency
      processorRef.current = processor;

      let frameCount = 0;
      processor.onaudioprocess = (e) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 32768 : s * 32767;
        }
        
        const base64 = arrayBufferToBase64(pcm.buffer);
        
        // Send audio more frequently but log less frequently
        ws.current.send(JSON.stringify({ 
          mime_type: 'audio/pcm', 
          data: base64 
        }));
        
        // Log every 100 frames (~2 seconds) to avoid spam
        frameCount++;
        if (frameCount % 100 === 0) {
          console.log(`Audio frames sent: ${frameCount}`);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsRecording(true);
      console.log('Recording started successfully');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Stop audio streaming
  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsRecording(false);
  };

  // Stop current AI audio and interrupt
  const interruptAI = () => {
    // Stop current audio playback
    if (currentAudioSource.current) {
      try {
        currentAudioSource.current.stop();
        currentAudioSource.current.disconnect();
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
      currentAudioSource.current = null;
    }
    
    // Clear audio buffer
    audioChunkBuffer.current = [];
    isPlayingAudio.current = false;
    
    // Send interrupt signal
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'interrupt' }));
    }
  };

  // Initialize WebSocket connection
  const connectWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    
    console.log('Connecting to WebSocket...');
    setConnectionStatus('connecting');
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      setMessages([]);
      startContinuousRecording();
    };
    
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('Received message:', msg);
        
        if (msg.mime_type === 'audio/pcm' && msg.data) {
          audioChunkBuffer.current.push(msg.data);
          playBufferedAudio();
          setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            isUser: false, 
            isAudio: true, 
            audioData: msg.data 
          }]);
        } else if (msg.mime_type === 'text/plain' && msg.data) {
          setTranscript(msg.data);
          setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            isUser: false, 
            text: msg.data 
          }]);
        } else if (msg.interrupted) {
          console.log('AI interrupted');
          // Handle AI interruption
          audioChunkBuffer.current = [];
          isPlayingAudio.current = false;
        } else if (msg.turn_complete) {
          console.log('AI turn complete');
          // Handle turn completion
          setTranscript('');
        } else if (msg.error) {
          console.error('WebSocket error message:', msg.message);
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
    
    ws.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setConnectionStatus('disconnected');
      stopRecording();
      
      // Auto-reconnect after 3 seconds unless it was a manual close
      if (event.code !== 1000) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      }
    };
  };

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopRecording();
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleManualInterrupt = () => {
    interruptAI();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10b981'; // green-500
      case 'connecting': return '#f59e0b'; // yellow-500  
      case 'disconnected': return '#ef4444'; // red-500
      default: return colors.neutral[500];
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live AI Voice Chat</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageContainer, msg.isUser ? styles.userMessage : styles.aiMessage]}>
            {msg.isAudio ? (
              <Text style={styles.audioText}>🔊 AI Voice Response</Text>
            ) : (
              <Text style={styles.messageText}>{msg.text}</Text>
            )}
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.controls}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 
              (isRecording ? 'Listening...' : 'Connected') : 
              connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'
            }
          </Text>
          {isRecording && (
            <View style={styles.recordingIndicator} />
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <ReceiptUpload 
            onReceiptProcessed={handleReceiptProcessed}
            onError={handleReceiptError}
          />
          
          {connectionStatus === 'connected' && (
            <TouchableOpacity 
              onPress={handleManualInterrupt} 
              style={styles.interruptButton}
            >
              <Text style={styles.interruptText}>Stop AI</Text>
            </TouchableOpacity>
          )}
          
          {connectionStatus === 'disconnected' && (
            <TouchableOpacity 
              onPress={connectWebSocket} 
              style={styles.reconnectButton}
            >
              <Text style={styles.reconnectText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {transcript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>Live Transcript:</Text>
          <Text style={styles.transcript}>{transcript}</Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.neutral[900] 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.neutral[700] 
  },
  backButton: { 
    marginRight: 12 
  },
  backText: { 
    color: colors.primary[600], 
    fontSize: 16 
  },
  title: { 
    fontSize: 20, 
    color: colors.neutral[100], 
    fontWeight: 'bold',
    flex: 1
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8
  },
  messagesContainer: { 
    flex: 1, 
    padding: 16 
  },
  messageContainer: { 
    marginVertical: 8 
  },
  userMessage: { 
    alignItems: 'flex-end' 
  },
  aiMessage: { 
    alignItems: 'flex-start' 
  },
  messageText: { 
    color: colors.neutral[100], 
    fontSize: 16,
    backgroundColor: colors.neutral[800],
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%'
  },
  audioText: { 
    color: colors.primary[600], 
    fontSize: 16,
    backgroundColor: colors.neutral[800],
    padding: 12,
    borderRadius: 12,
    fontStyle: 'italic'
  },
  controls: { 
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[700]
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  statusText: {
    color: colors.neutral[200],
    fontSize: 14,
    marginRight: 8
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[600],
    opacity: 0.8
  },
  interruptButton: {
    backgroundColor: colors.secondary[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  interruptText: {
    color: colors.neutral[100],
    fontSize: 14,
    fontWeight: '600'
  },
  reconnectButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  reconnectText: {
    color: colors.neutral[100],
    fontSize: 14,
    fontWeight: '600'
  },
  transcriptContainer: {
    backgroundColor: colors.neutral[800],
    padding: 16,
    margin: 16,
    borderRadius: 8
  },
  transcriptLabel: {
    color: colors.neutral[400],
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600'
  },
  transcript: { 
    color: colors.neutral[200], 
    fontSize: 14,
    fontStyle: 'italic' 
  },
});