import { bucket } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Upload a single file to Firebase Storage
 * @param {Object} file - The file object from multer (needs memoryStorage)
 * @param {String} folder - The folder in Firebase Storage
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
export const uploadToFirebase = async (file, folder = 'uploads') => {
  if (!file) return null;

  const uniqueName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
  const blob = bucket.file(uniqueName);

  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      try {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      } catch (error) {
        // If makePublic fails (e.g. uniform bucket-level access), we can construct the URL directly for Firebase
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(blob.name)}?alt=media`;
        resolve(publicUrl);
      }
    });

    blobStream.end(file.buffer);
  });
};

/**
 * Upload multiple files to Firebase Storage
 * @param {Array} files - The array of file objects from multer
 * @param {String} folder - The folder in Firebase Storage
 * @returns {Promise<Array<String>>} - Array of public URLs
 */
export const uploadMultipleToFirebase = async (files, folder = 'uploads') => {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map(file => uploadToFirebase(file, folder));
  return Promise.all(uploadPromises);
};

/**
 * Upload a raw buffer to Firebase Storage
 * @param {Buffer} buffer - The file buffer
 * @param {String} originalName - The original file name (used for extension)
 * @param {String} mimetype - The file MIME type
 * @param {String} folder - The folder in Firebase Storage
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
export const uploadBufferToFirebase = async (buffer, originalName, mimetype, folder = 'uploads') => {
  if (!buffer) return null;

  const uniqueName = `${folder}/${uuidv4()}${path.extname(originalName)}`;
  const blob = bucket.file(uniqueName);

  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      try {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      } catch (error) {
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(blob.name)}?alt=media`;
        resolve(publicUrl);
      }
    });

    blobStream.end(buffer);
  });
};
