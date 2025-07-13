
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';

interface VoiceMessage {
  id: string;
  text?: string;
  isUser: boolean;
  isAudio?: boolean;
  audioData?: string; // base64 PCM
}

const WS_URL = `ws://${window.location.hostname}:8000/api/ai/voice/ws/user_123`;

export default function LiveAIVoiceChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

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


  // Audio chunk buffer for smoother playback
  const audioChunkBuffer = useRef<string[]>([]);
  const isPlayingAudio = useRef(false);

  // Play buffered PCM audio chunks
  async function playBufferedAudio() {
    if (isPlayingAudio.current) return;
    isPlayingAudio.current = true;
    // Use 24kHz for playback (AI audio responses)
    const audioCtx = audioContextRef.current || new window.AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioCtx;
    while (audioChunkBuffer.current.length > 0) {
      // Concatenate up to 5 chunks for smoother playback
      const chunks = audioChunkBuffer.current.splice(0, 5);
      // Decode and merge all chunks
      let totalLength = 0;
      const pcmArrays = chunks.map(base64 => {
        const buffer = base64ToArrayBuffer(base64);
        const pcm = new Int16Array(buffer);
        totalLength += pcm.length;
        return pcm;
      });
      const mergedPcm = new Int16Array(totalLength);
      let offset = 0;
      for (const arr of pcmArrays) {
        mergedPcm.set(arr, offset);
        offset += arr.length;
      }
      // Convert Int16 PCM to Float32 [-1, 1]
      const float32 = new Float32Array(mergedPcm.length);
      for (let i = 0; i < mergedPcm.length; i++) {
      float32[i] = mergedPcm[i] / 32768;
    }
    // Use 24kHz for playback buffer
    const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
      // Wait for this chunk to finish before playing the next
      await new Promise(res => {
        source.onended = res;
      });
    }
    isPlayingAudio.current = false;
  }

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onopen = () => {
      setMessages([]);
    };
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.mime_type === 'audio/pcm' && msg.data) {
        audioChunkBuffer.current.push(msg.data);
        playBufferedAudio();
        setMessages(prev => [...prev, { id: Date.now().toString(), isUser: false, isAudio: true, audioData: msg.data }]);
      } else if (msg.mime_type === 'text/plain' && msg.data) {
        setTranscript(msg.data);
        setMessages(prev => [...prev, { id: Date.now().toString(), isUser: false, text: msg.data }]);
      }
    };
    ws.current.onerror = (e) => {
      // handle error
    };
    ws.current.onclose = () => {
      // handle close
    };
    return () => {
      ws.current?.close();
    };
  }, []);

  // Start microphone and stream PCM to backend
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Convert Float32 [-1,1] to Int16 PCM
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 32768 : s * 32767;
        }
        const pcmBuffer = pcm.buffer;
        const base64 = arrayBufferToBase64(pcmBuffer);
        ws.current?.send(JSON.stringify({ mime_type: 'audio/pcm', data: base64 }));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;
      setIsRecording(true);
    } catch (err) {
      // handle error
    }
  };

  // Stop microphone
  const stopRecording = () => {
    setIsRecording(false);
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live AI Voice Chat</Text>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageContainer, msg.isUser ? styles.userMessage : styles.aiMessage]}>
            {msg.isAudio ? (
              <Text style={styles.audioText}>[AI Voice Message]</Text>
            ) : (
              <Text style={styles.messageText}>{msg.text}</Text>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.micText}>{isRecording ? 'Stop' : 'Start'} Mic</Text>
        </TouchableOpacity>
      </View>
      {transcript ? <Text style={styles.transcript}>Transcript: {transcript}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[900] },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[700] },
  backButton: { marginRight: 12 },
  backText: { color: colors.primary[600], fontSize: 16 },
  title: { fontSize: 20, color: colors.neutral[100], fontWeight: 'bold' },
  messagesContainer: { flex: 1, padding: 16 },
  messageContainer: { marginVertical: 8 },
  userMessage: { alignItems: 'flex-end' },
  aiMessage: { alignItems: 'flex-start' },
  messageText: { color: colors.neutral[100], fontSize: 16 },
  audioText: { color: colors.primary[600], fontSize: 16 },
  controls: { flexDirection: 'row', justifyContent: 'center', padding: 16 },
  micButton: { backgroundColor: colors.primary[600], padding: 16, borderRadius: 24 },
  micButtonActive: { backgroundColor: colors.primary[800] },
  micText: { color: colors.neutral[100], fontSize: 16 },
  transcript: { color: colors.neutral[200], padding: 16, fontStyle: 'italic' },
});
