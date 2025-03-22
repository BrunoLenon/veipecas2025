import { supabase } from './supabase';

const BUCKET_NAME = 'images'; // Altere se o bucket do seu Supabase tiver outro nome

export const storage = {
  buckets: {
    images: BUCKET_NAME,
  },

  async upload(bucket: string, file: File) {
    const filePath = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);

    if (error) throw error;

    const { publicURL } = supabase.storage.from(bucket).getPublicUrl(filePath).data;
    return publicURL;
  },

  async remove(bucket: string, filePath: string) {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) throw error;
  },
};
