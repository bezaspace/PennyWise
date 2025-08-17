
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import ReceiptUpload from './ReceiptUpload';
import { ChatDataWidget } from './ChatDataWidget';
import ProductAlternativesCarousel from './ProductAlternativesCarousel';
import ToolCallWidget from './ToolCallWidget';
import { parseAIResponseForToolData, parseToolResponse } from '@/utils/aiResponseParser';

interface VoiceMessage {
  id: string;
  text?: string;
  isUser: boolean;
  receiptData?: any;
  toolData?: {
  type: 'transactions' | 'budgets' | 'goals' | 'plan' | 'holdings' | 'trades' | 'watchlist' | 'quote' | 'portfolio_summary' | 'market_research' | 'product_alternatives';
    data: any[];
  };
  // Optional transient running-tool metadata
  isToolRunning?: boolean;
  toolName?: string;
  toolCallId?: string;
}

type ReceiptOrItemData =
  | {
      type?: undefined;
      merchant: string;
      amount: number;
      date: string;
      category: string;
      description: string;
      items: string[];
      confidence: string;
    }
  | {
      type: 'item';
      name: string;
      brand?: string;
      description: string;
      category: string;
      detected_price: number | null;
      price_found: boolean;
      confidence: string;
    };

const DEFAULT_WS_URL = `ws://${window.location.hostname}:8000/api/ai/unified/voice/ws/user_123`;

export default function LiveAIVoiceChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [transcript, setTranscript] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptOrItemData | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const audioChunkBuffer = useRef<string[]>([]);
  const isPlayingAudio = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Helper: detect duplicate tool data to avoid rendering duplicate widgets
  const isDuplicateToolData = (prevMessages: VoiceMessage[], toolDataObj?: { type: string; data: any[] } | null) => {
    if (!toolDataObj) return false;
    try {
      const key = JSON.stringify({ t: toolDataObj.type, d: toolDataObj.data });
      const recent = prevMessages.slice(-6); // look back a few messages
      for (const m of recent) {
        if (m.toolData) {
          const otherKey = JSON.stringify({ t: m.toolData.type, d: m.toolData.data });
          if (otherKey === key) return true;
        }
      }
    } catch (e) {
      // If serialization fails, fall back to no duplicate detection
      return false;
    }
    return false;
  };

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
  const handleReceiptProcessed = (receiptData: ReceiptOrItemData) => {
    console.log('LiveAIVoiceChat: Receipt processed:', receiptData);
    
    // Store the receipt data
    setCurrentReceipt(receiptData);
    
    // Add user message showing receipt was uploaded
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      text:
        'type' in receiptData && receiptData.type === 'item'
          ? `Item photo uploaded: ${receiptData.name}${receiptData.brand ? ' (' + receiptData.brand + ')' : ''}${
              receiptData.price_found && typeof receiptData.detected_price === 'number'
                ? ` - $${receiptData.detected_price.toFixed(2)}`
                : ''
            }`
          : `Receipt uploaded: ${receiptData.merchant} - $${(receiptData as any).amount?.toFixed?.(2) ?? ''}`,
      isUser: true,
      receiptData,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send context to AI via WebSocket (receipt or item)
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const dataStr =
        'type' in receiptData && receiptData.type === 'item'
          ? `I've taken a photo of an item while shopping. Here are the details I see:
Item: ${receiptData.name}${receiptData.brand ? ` (Brand: ${receiptData.brand})` : ''}
Description: ${receiptData.description}
Category: ${receiptData.category}
PriceDetected: ${receiptData.price_found ? `$${receiptData.detected_price?.toFixed(2)}` : 'No'}
Confidence: ${receiptData.confidence}

If the price is not detected above, please ask me for the price first. After I tell you the price, advise me whether buying this is a good idea considering my budgets, recent spending, and goals. If I still choose to buy it, add it as a transaction.`
          : `I've received a receipt with the following details:
Merchant: ${(receiptData as any).merchant}
Amount: $${(receiptData as any).amount?.toFixed?.(2) ?? ''}
Date: ${(receiptData as any).date}
Category: ${(receiptData as any).category}
Description: ${(receiptData as any).description}
Items: ${((receiptData as any).items || []).join(', ')}
Confidence: ${(receiptData as any).confidence}

Please acknowledge that you've received this receipt information and ask if I'd like you to add it as a transaction to my records.`;

      const message = { mime_type: 'text/plain', data: dataStr };
      
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
    const wsUrl = DEFAULT_WS_URL;
    ws.current = new WebSocket(wsUrl);
    
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
          // Don't add audio messages to the chat - just play them
        } else if (msg.mime_type === 'tool/call' && msg.tool_name) {
          // Handle tool call - create a transient running-tool message
          console.log(`AI is calling tool: ${msg.tool_name}`);
          const callId = msg.function_call_event_id || msg.tool_call_id || null;
          const toolMessage: VoiceMessage = {
            id: (callId ? String(callId) : Date.now().toString()),
            isUser: false,
            isToolRunning: true,
            toolName: msg.tool_name,
            toolCallId: callId || undefined,
          };
          setMessages(prev => [...prev, toolMessage]);
        } else if (msg.mime_type === 'tool/response' && msg.tool_name && msg.tool_response) {
          // Handle tool response - show the data as widgets
          console.log(`Tool ${msg.tool_name} responded with:`, msg.tool_response);
          // Remove transient running-tool message for this call (by id preferred)
          const callId = msg.function_call_event_id || msg.tool_call_id || null;
          setMessages(prev => {
            if (callId) {
              return prev.filter(m => !(m.isToolRunning && m.toolCallId && String(m.toolCallId) === String(callId)));
            }
            // Fallback: remove the first running message matching the tool name
            let removed = false;
            return prev.filter(m => {
              if (!removed && m.isToolRunning && m.toolName === msg.tool_name) { removed = true; return false; }
              return true;
            });
          });

          const toolData = parseToolResponse(msg.tool_name, msg.tool_response);
          if (toolData.hasToolData) {
            const toolResponseMessage: VoiceMessage = {
              id: Date.now().toString(),
              isUser: false,
              text: `📊 Here's your ${msg.tool_name.replace('get_', '').replace('_', ' ')} data:`,
              toolData: {
                type: toolData.type!,
                data: toolData.data
              }
            };

            // For plan previews/finalized plans, replace any existing plan widget
            if (toolData.type === 'plan') {
              setMessages(prev => {
                const withoutExistingPlan = prev.filter(m => !(m.toolData && m.toolData.type === 'plan'));
                return [...withoutExistingPlan, toolResponseMessage];
              });
            } else {
              setMessages(prev => {
                if (isDuplicateToolData(prev, toolResponseMessage.toolData)) return prev;
                return [...prev, toolResponseMessage];
              });
            }
          }
        } else if (msg.mime_type === 'text/plain' && msg.data) {
          setTranscript(msg.data);

          // For final responses, we still parse for tool data as backup
          const toolData = parseAIResponseForToolData(msg.data);

          const newMessage: VoiceMessage = {
            id: Date.now().toString(),
            isUser: false,
            text: msg.data
          };

          // Add tool data if detected (backup method)
          if (toolData.hasToolData) {
            newMessage.toolData = {
              type: toolData.type!,
              data: toolData.data
            };
          }

          // If this text contains an implicit terminal for a running tool, remove the transient widget
          const possibleCallId = msg.function_call_event_id || msg.tool_call_id || null;
          if (possibleCallId) {
            setMessages(prev => prev.filter(m => !(m.isToolRunning && m.toolCallId && String(m.toolCallId) === String(possibleCallId))));
          } else if (toolData.hasToolData && toolData.type) {
            // Remove one running message matching the detected tool type/name
            setMessages(prev => {
              let removed = false;
              return prev.filter(m => {
                if (!removed && m.isToolRunning && m.toolName === toolData.type) { removed = true; return false; }
                return true;
              });
            });
          }

          // If this ever contains a plan (future-proof), replace any existing plan widget
          if (newMessage.toolData && newMessage.toolData.type === 'plan') {
            setMessages(prev => {
              const withoutExistingPlan = prev.filter(m => !(m.toolData && m.toolData.type === 'plan'));
              return [...withoutExistingPlan, newMessage];
            });
          } else {
            setMessages(prev => {
              if (isDuplicateToolData(prev, newMessage.toolData)) return prev;
              return [...prev, newMessage];
            });
          }
        } else if (msg.interrupted) {
          console.log('AI interrupted');
          // Handle AI interruption
          audioChunkBuffer.current = [];
          isPlayingAudio.current = false;
          // Clear any running tool messages (interruption implies end)
          setMessages(prev => prev.filter(m => !m.isToolRunning));
        } else if (msg.turn_complete) {
          console.log('AI turn complete');
          // Handle turn completion
          setTranscript('');
          // Clear running tool messages at end of turn
          setMessages(prev => prev.filter(m => !m.isToolRunning));
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
            {msg.isToolRunning ? (
              <ToolCallWidget toolName={msg.toolName || 'Running tool...'} />
            ) : (
              msg.text && (
                <Text style={styles.messageText}>{msg.text}</Text>
              )
            )}
            {msg.toolData && (
              <View style={styles.toolDataContainer}>
                {msg.toolData.type === 'product_alternatives' ? (
                  <ProductAlternativesCarousel data={msg.toolData.data} />
                ) : (
                  <ChatDataWidget 
                    type={msg.toolData.type}
                    data={msg.toolData.data}
                    compact={true}
                  />
                )}
              </View>
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
  padding: 8 
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
  padding: 8,
    borderRadius: 12,
    maxWidth: '80%'
  },
  toolDataContainer: {
  marginTop: 4,
    width: '100%',
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
