import { useState } from 'react';
import { storage } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  bucket: string;
  onUpload: (url: string) => void;
  className?: string;
}

export default function ImageUploader({ bucket, onUpload, className = '' }: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.');
        return;
      }

      // Validar tamanho (50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB em bytes
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 50MB');
        return;
      }

      setLoading(true);
      const publicUrl = await storage.upload(bucket, file);
      onUpload(publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />
      <button
        type="button"
        className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Upload className="h-5 w-5 mr-2" />
        {loading ? 'Carregando...' : 'Carregar Imagem'}
      </button>
    </div>
  );
}