import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, storage } from '../lib/supabase';
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Upload, 
  Download, 
  Camera, 
  Sparkles,
  AlertCircle,
  ShoppingCart,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploader from '../components/ImageUploader';
import type { Product } from '../types/product';
import type { Category } from '../types/category';
import * as XLSX from 'xlsx';
import CanAccess from '../components/CanAccess';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    barcode: '',
    brand: '',
    stock: 0,
    price: '',
    category_id: '',
    image_url: '',
    is_new: false,
  });

  const canManageProducts = user?.role === 'master' || user?.role === 'admin';

  useEffect(() => {
    fetchCategories().then(fetchProducts);
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(formData.price) < 0) {
      toast.error('Preço não pode ser negativo');
      return;
    }

    try {
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('code', formData.code)
        .eq('brand', formData.brand)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingProduct && existingProduct.id !== selectedProduct?.id) {
        toast.error('Já existe um produto com este código e marca');
        return;
      }

      const productData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : 0,
      };

      let error;
      if (selectedProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', selectedProduct.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        selectedProduct ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!'
      );
      setIsModalOpen(false);
      setSelectedProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      barcode: '',
      brand: '',
      stock: 0,
      price: '',
      category_id: '',
      image_url: '',
      is_new: false,
    });
  };

  const filteredProducts = products.filter(product => {
    if (!searchTerm.trim()) return true;
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
    const combined = `${product.name} ${product.brand} ${product.code} ${product.barcode || ''} ${product.description || ''}`.toLowerCase();
    return searchTerms.every(term => combined.includes(term));
  });

  return (
    <div>
      {/* Aqui virão as renderizações de tabela e modais conforme necessário */}
    </div>
  );
}
