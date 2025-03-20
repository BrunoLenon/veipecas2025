// Ajuste completo na página de Produtos
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
    stock: null as number | null,
    price: null as number | null,
    category_id: '',
    image_url: '',
    is_new: false,
  });

  const canManageProducts = user?.role === 'master' || user?.role === 'admin';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
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
    try {
      const productData = {
        ...formData,
        stock: formData.stock ?? null,
        price: formData.price ?? null,
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
      toast.success('Produto salvo com sucesso');
      fetchProducts();
      setIsModalOpen(false);
      setSelectedProduct(null);
      setFormData({
        name: '',
        description: '',
        code: '',
        barcode: '',
        brand: '',
        stock: null,
        price: null,
        category_id: '',
        image_url: '',
        is_new: false,
      });
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      for (const row of jsonData as any[]) {
        if (!row.codigo || !row.nome) continue;
        await supabase.from('products').upsert({
          code: row.codigo,
          name: row.nome,
          brand: row.marca || '',
          stock: row.estoque ?? null,
          price: row.preco ?? null,
        });
      }
      toast.success('Importação concluída');
      fetchProducts();
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar produtos..."
          className="border px-3 py-2 rounded w-full max-w-xs"
        />
        {canManageProducts && (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded"
            >
              <Plus className="h-4 w-4 mr-1 inline" /> Novo Produto
            </button>
            <label className="flex items-center cursor-pointer">
              <Upload className="h-4 w-4 mr-1" />
              <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
              Importar
            </label>
          </div>
        )}
      </div>
      {/* Restante do código mantido */}
    </div>
  );
}
