/**
 * Image picker utility — expo-image-picker 16.1.4 / SDK 53
 *
 * Key fix: `ImagePicker.MediaType` is a TS type, NOT a runtime object.
 * Accessing `ImagePicker.MediaType.Images` throws undefined.Images → crash.
 * Solution: pass the string literal 'images' directly.
 *
 * Secondary fix: allowsEditing:true triggers the deprecated UIImagePickerController
 * on iOS which crashes in SDK 53 dev builds. Keep it false.
 */
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const openSettings = () => Linking.openSettings().catch(() => {});

const denied = (type) =>
  Alert.alert(
    `${type} Access Required`,
    `Please enable ${type.toLowerCase()} access in Settings to continue.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: openSettings },
    ]
  );

const PICKER_OPTIONS = {
  mediaTypes: 'images',   // string literal — NOT ImagePicker.MediaType.Images
  allowsEditing: false,   // true = UIImagePickerController = crash on iOS SDK 53
  quality: 0.85,
  exif: false,
  base64: false,
};

export const pickImageFromLibrary = async () => {
  try {
    console.log('[pickImage] step 1 — requesting library permission');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('[pickImage] step 2 — permission status:', status);
    if (status !== 'granted' && status !== 'limited') {
      denied('Photo Library');
      return null;
    }
    console.log('[pickImage] step 3 — launching library picker');
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    console.log('[pickImage] step 4 — picker result:', result?.canceled, result?.assets?.length);
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri ?? null;
  } catch (err) {
    console.error('[pickImage] library:', err);
    Alert.alert('Could not open photos', 'Please try again.');
    return null;
  }
};

export const pickImageFromCamera = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      denied('Camera');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri ?? null;
  } catch (err) {
    console.error('[pickImage] camera:', err);
    Alert.alert('Could not open camera', 'Please try again.');
    return null;
  }
};

// Backwards compatibility
export const requestPhotoLibraryPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted' || status === 'limited';
};

export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};
