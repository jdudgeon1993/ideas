/* ---------------------------------------------------
   STORAGE MODULE
   Handles Supabase Storage operations for recipe photos
--------------------------------------------------- */

/**
 * Compress an image file to reduce size
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width in pixels (default 1200)
 * @param {number} quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<Blob>} Compressed image blob
 */
async function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a recipe photo to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} recipeId - The recipe ID for naming
 * @returns {Promise<string|null>} Public URL of uploaded image or null on error
 */
async function uploadRecipePhoto(file, recipeId) {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.error('User not authenticated');
    return null;
  }

  const householdId = window.auth.getCurrentHouseholdId();
  if (!householdId) {
    console.error('No household ID found');
    return null;
  }

  try {
    // Compress the image first
    console.log(`📦 Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    const compressedBlob = await compressImage(file);
    console.log(`✅ Compressed to ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${householdId}/${recipeId}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await window.supabaseClient.storage
      .from('recipe-photos')
      .upload(fileName, compressedBlob, {
        cacheControl: '3600',
        upsert: true // Replace if exists
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = window.supabaseClient.storage
      .from('recipe-photos')
      .getPublicUrl(fileName);

    console.log('✅ Uploaded recipe photo:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (err) {
    console.error('Error uploading recipe photo:', err);
    return null;
  }
}

/**
 * Delete a recipe photo from Supabase Storage
 * @param {string} photoUrl - The public URL of the photo to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteRecipePhoto(photoUrl) {
  if (!photoUrl || !photoUrl.includes('recipe-photos')) {
    return true; // Not a storage URL, nothing to delete
  }

  try {
    // Extract file path from URL
    const urlParts = photoUrl.split('/recipe-photos/');
    if (urlParts.length < 2) {
      console.warn('Invalid storage URL format');
      return false;
    }

    const filePath = urlParts[1].split('?')[0]; // Remove query params

    const { error } = await window.supabaseClient.storage
      .from('recipe-photos')
      .remove([filePath]);

    if (error) throw error;

    console.log('✅ Deleted recipe photo:', filePath);
    return true;

  } catch (err) {
    console.error('Error deleting recipe photo:', err);
    return false;
  }
}

// Export functions
window.storage = {
  uploadRecipePhoto,
  deleteRecipePhoto,
  compressImage
};
