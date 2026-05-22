/**
 * Cloudinary Configuration
 * Sets up Cloudinary SDK and exports an upload helper
 * for handling resume PDF uploads.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {Object} options - Upload options
 * @param {string} [options.folder='intervuai/resumes'] - Cloudinary folder
 * @param {string} [options.resourceType='raw'] - Resource type (raw for PDFs)
 * @param {string} [options.publicId] - Custom public ID
 * @returns {Promise<Object>} Cloudinary upload result with secure_url, public_id, etc.
 */
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  const {
    folder = 'intervuai/resumes',
    resourceType = 'raw',
    publicId,
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      ...(publicId && { public_id: publicId }),
    };

    // Use upload_stream for buffer uploads
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by public ID.
 * @param {string} publicId - The public ID of the file to delete
 * @param {string} [resourceType='raw'] - Resource type
 * @returns {Promise<Object>} Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary deletion failed: ${error.message}`);
  }
};

export default cloudinary;
