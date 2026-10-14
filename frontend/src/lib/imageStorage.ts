/**
 * Image Storage Utility
 * Manages profile images stored in localStorage per user email
 */

const PROFILE_IMAGES_KEY = "profile_images";

interface ProfileImageStore {
  [email: string]: string; // email -> base64 image data
}

/**
 * Get profile image for a user by email
 */
export const getProfileImageByEmail = (email: string): string | null => {
  try {
    const stored = localStorage.getItem(PROFILE_IMAGES_KEY);
    if (!stored) return null;

    const imageStore: ProfileImageStore = JSON.parse(stored);
    return imageStore[email] || null;
  } catch (err) {
    console.error("Error retrieving profile image from storage:", err);
    return null;
  }
};

/**
 * Store profile image for a user by email
 */
export const storeProfileImage = (email: string, imageData: string): void => {
  try {
    let imageStore: ProfileImageStore = {};
    
    const stored = localStorage.getItem(PROFILE_IMAGES_KEY);
    if (stored) {
      imageStore = JSON.parse(stored);
    }

    imageStore[email] = imageData;
    localStorage.setItem(PROFILE_IMAGES_KEY, JSON.stringify(imageStore));
  } catch (err) {
    console.error("Error storing profile image:", err);
  }
};

/**
 * Remove profile image for a user by email
 */
export const removeProfileImage = (email: string): void => {
  try {
    const stored = localStorage.getItem(PROFILE_IMAGES_KEY);
    if (!stored) return;

    const imageStore: ProfileImageStore = JSON.parse(stored);
    delete imageStore[email];
    localStorage.setItem(PROFILE_IMAGES_KEY, JSON.stringify(imageStore));
  } catch (err) {
    console.error("Error removing profile image:", err);
  }
};

/**
 * Clear all profile images from storage
 */
export const clearAllProfileImages = (): void => {
  try {
    localStorage.removeItem(PROFILE_IMAGES_KEY);
  } catch (err) {
    console.error("Error clearing profile images:", err);
  }
};
