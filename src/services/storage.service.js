import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'products';

/**
 * Завантажує файл у бакет та повертає публічний URL.
 * @param {File} file - Файл для завантаження
 * @param {string} path - Шлях у бакеті (наприклад, '{group_id}/image_1.jpg')
 * @returns {Promise<string>} - Публічний URL завантаженого файлу
 */
export async function uploadProductImage(file, path) {
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Помилка завантаження фото ${path}: ${error.message}`);
  }

  const { data: publicUrlData } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}

/**
 * Видаляє файл з бакету за його шляхом.
 * @param {string} path - Шлях файлу у бакеті
 */
export async function deleteProductImage(path) {
  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error(`Помилка видалення фото ${path}:`, error.message);
    throw error;
  }
}
