import React, { useState, useRef } from 'react';
import LiveAIVoiceChat from '@/components/LiveAIVoiceChat';
import ReceiptUpload from '@/components/ReceiptUpload';
import { ChatDataWidget } from '@/components/ChatDataWidget';
import { parseAIResponseForToolData } from '@/utils/aiResponseParser';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Send } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { geminiService } from '@/services/gemini';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  receiptData?: any;
  toolData?: {
    type: 'transactions' | 'budgets' | 'goals' | 'plan' | 'holdings' | 'trades' | 'watchlist' | 'quote' | 'portfolio_summary' | 'market_research';
    data: any[];
  };
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

export default function AIChatScreen() {
  const [voiceMode, setVoiceMode] = useState(false);
  const [plannerMode, setPlannerMode] = useState(false);
  const [investMode, setInvestMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI financial advisor. Ask me anything about personal finance, or upload a receipt to automatically extract transaction details.",
      isUser: false,
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    let aiMessageText = '';

    // Add a placeholder AI message for streaming
    setMessages(prev => [
      ...prev,
      {
        id: aiMessageId,
        text: '',
        isUser: false,
      },
    ]);

    try {
      const stream = geminiService.streamFinancialAdvice(inputText.trim());
      for await (const chunk of stream) {
        aiMessageText += chunk;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, text: aiMessageText }
              : msg
          )
        );
      }

      // After streaming is complete, parse for tool data
      const toolData = parseAIResponseForToolData(aiMessageText);
      if (toolData.hasToolData) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? { 
                  ...msg, 
                  toolData: {
                    type: toolData.type!,
                    data: toolData.data
                  }
                }
              : msg
          )
        );
      }
    } catch (error) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                text:
                  "I apologize, but I'm having trouble connecting right now. Please check your internet connection and try again.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptProcessed = (receiptData: ReceiptOrItemData) => {
    // Add user message showing receipt was uploaded
    const userMessage: Message = {
      id: Date.now().toString(),
      text: 'type' in receiptData && receiptData.type === 'item'
        ? `Item photo uploaded: ${receiptData.name}${receiptData.brand ? ' (' + receiptData.brand + ')' : ''}${
            receiptData.price_found && typeof receiptData.detected_price === 'number'
              ? ` - $${receiptData.detected_price.toFixed(2)}`
              : ''
          }`
        : `Receipt uploaded: ${(receiptData as any).merchant} - $${(receiptData as any).amount?.toFixed?.(2) ?? ''}`,
      isUser: true,
      receiptData,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add AI response with receipt details
    const aiMessageId = (Date.now() + 1).toString();
    const receiptSummary = 'type' in receiptData && receiptData.type === 'item'
      ? `I've processed your item photo! Here's what I found:

Item: ${receiptData.name}${receiptData.brand ? ` (Brand: ${receiptData.brand})` : ''}
Description: ${receiptData.description}
Category: ${receiptData.category}
Price Detected: ${receiptData.price_found ? `$${receiptData.detected_price?.toFixed(2)}` : 'No'}
Confidence: ${receiptData.confidence}

${receiptData.price_found ? 'Would you like me to analyze if this is a good purchase based on your budget and goals?' : 'Please let me know the price, and I can help you decide if this is a good purchase.'}`
      : `I've processed your receipt! Here's what I found:

Merchant: ${(receiptData as any).merchant}
Amount: $${(receiptData as any).amount?.toFixed?.(2) ?? ''}
Date: ${(receiptData as any).date}
Category: ${(receiptData as any).category}
Description: ${(receiptData as any).description}
${((receiptData as any).items || []).length > 0 ? `Items: ${((receiptData as any).items || []).join(', ')}` : ''}
Confidence: ${(receiptData as any).confidence}

Would you like me to add this as a transaction to your records? I can also help you modify any of the details if needed.`;

    setMessages(prev => [
      ...prev,
      {
        id: aiMessageId,
        text: receiptSummary,
        isUser: false,
        receiptData,
      },
    ]);

    setIsLoading(false);
  };

  const handleReceiptError = (error: string) => {
    const errorMessage: Message = {
      id: Date.now().toString(),
      text: `Receipt processing failed: ${error}`,
      isUser: false,
    };
    setMessages(prev => [...prev, errorMessage]);
  };

  if (voiceMode) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <LiveAIVoiceChat 
          onBack={() => {
            setVoiceMode(false);
            setPlannerMode(false);
            setInvestMode(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Chat</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={styles.voiceToggle} 
              onPress={() => { setPlannerMode(false); setVoiceMode(true); }}
            >
              <Text style={styles.voiceToggleText}>🎤 Live Voice Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.voiceToggle, { backgroundColor: colors.secondary?.[600] || colors.primary[700] }]}
              onPress={() => { setPlannerMode(true); setVoiceMode(true); }}
            >
              <Text style={styles.voiceToggleText}>🗂️ Live Planning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.voiceToggle, { backgroundColor: colors.success?.[600] || colors.primary[700] }]}
              onPress={() => { setPlannerMode(false); setInvestMode(true); setVoiceMode(true); }}
            >
              <Text style={styles.voiceToggleText}>📈 Live Investments</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage
              ]}
            >
              <View style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble
              ]}>
                <Text style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.aiMessageText
                ]}>
                  {message.text}
                </Text>
                {message.toolData && (
                  <View style={styles.toolDataContainer}>
                    <ChatDataWidget 
                      type={message.toolData.type}
                      data={message.toolData.data}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Text style={styles.aiMessageText}>Thinking...</Text>
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <ReceiptUpload 
              onReceiptProcessed={handleReceiptProcessed}
              onError={handleReceiptError}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.neutral[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Send size={20} color={colors.neutral[100]} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[700],
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
  },
  voiceToggle: {
    marginTop: 8,
    backgroundColor: colors.primary[600],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  voiceToggleText: {
    color: colors.neutral[100],
    fontSize: 14,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 8,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.neutral[800],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  userMessageText: {
    color: colors.neutral[100],
  },
  aiMessageText: {
    color: colors.neutral[200],
  },
  toolDataContainer: {
    marginTop: 12,
    width: '100%',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[700],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[800],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[100],
    maxHeight: 100,
    marginHorizontal: 12,
  },
  sendButton: {
    backgroundColor: colors.primary[600],
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[600],
  },
});