import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Upload } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { geminiService } from '@/services/gemini';

interface ReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  items: string[];
  confidence: string;
}

interface ReceiptUploadProps {
  onReceiptProcessed: (data: ReceiptData) => void;
  onError?: (error: string) => void;
}

export default function ReceiptUpload({ onReceiptProcessed, onError }: ReceiptUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library to upload receipts.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permission to take photos of receipts.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const processReceiptImage = async (imageUri: string) => {
    console.log('ReceiptUpload: Processing image:', imageUri);
    setIsProcessing(true);
    
    try {
      const result = await geminiService.processReceipt(imageUri);
      console.log('ReceiptUpload: Processing result:', result);
      
      if (result.success && result.data) {
        onReceiptProcessed(result.data);
      } else {
        const errorMessage = result.error || result.message || 'Failed to process receipt';
        console.error('ReceiptUpload: Processing error:', errorMessage);
        onError?.(errorMessage);
        Alert.alert('Processing Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('ReceiptUpload: Exception:', error);
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const pickImageFromLibrary = async () => {
    console.log('ReceiptUpload: Picking image from library');
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('ReceiptUpload: Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('ReceiptUpload: Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  const takePhoto = async () => {
    console.log('ReceiptUpload: Taking photo');
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('ReceiptUpload: Camera result:', result);

      if (!result.canceled && result.assets[0]) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('ReceiptUpload: Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImagePickerOptions = () => {
    console.log('ReceiptUpload: Showing image picker options');
    
    // On web, camera access is limited, so just show library option
    if (Platform.OS === 'web') {
      Alert.alert(
        'Upload Receipt',
        'Choose an image file from your computer:',
        [
          {
            text: 'Choose File',
            onPress: () => {
              console.log('ReceiptUpload: Choose File selected (Web)');
              pickImageFromLibrary();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('ReceiptUpload: Cancelled'),
          },
        ]
      );
    } else {
      // Mobile options
      Alert.alert(
        'Upload Receipt',
        'Choose how you want to add your receipt:',
        [
          {
            text: 'Take Photo',
            onPress: () => {
              console.log('ReceiptUpload: Take Photo selected');
              takePhoto();
            },
          },
          {
            text: 'Choose from Library',
            onPress: () => {
              console.log('ReceiptUpload: Choose from Library selected');
              pickImageFromLibrary();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('ReceiptUpload: Cancelled'),
          },
        ]
      );
    }
  };

  const handleWebFileSelect = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      console.log('ReceiptUpload: Web file selected:', file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          processReceiptImage(result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      Alert.alert('Error', 'Please select a valid image file');
    }
  };

  const handleButtonPress = () => {
    console.log('ReceiptUpload: Button pressed!');
    if (isProcessing) {
      console.log('ReceiptUpload: Already processing, ignoring press');
      return;
    }
    
    if (Platform.OS === 'web') {
      // On web, trigger the hidden file input
      console.log('ReceiptUpload: Triggering web file input');
      fileInputRef.current?.click();
    } else {
      showImagePickerOptions();
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text style={styles.processingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <View>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileSelect}
        />
      )}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handleButtonPress}
        disabled={isProcessing}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Upload size={18} color={colors.primary[500]} />
        <Text style={styles.uploadText}>Receipt</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[700],
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 32,
  },
  uploadText: {
    color: colors.primary[500],
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[700],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  processingText: {
    color: colors.neutral[300],
    fontSize: 12,
    marginLeft: 6,
  },
});