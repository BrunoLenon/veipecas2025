import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, storage } from '../lib/supabase';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  X,
  Camera
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import type { Product } from '../types/product';
import CanAccess from '../components/CanAccess';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    brand: '',
    description: '',
    barcode: '',
    stock: '',
    price: '',
    image_url: ''
  });

  const canManageProducts = user?.role === 'master' || user?.role === 'admin';

  useEffect(() => {
    fetchProducts();
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

  const downloadTemplate = () => {
    const template = [{
      nome: 'Produto Exemplo',
      descricao: 'Descrição',
      codigo: 'PRD001',
      codigo_barras: '1234567890123',
      marca: 'Marca X',
      estoque: 10,
      preco: 99.99
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('products').insert([{
        ...formData,
        stock: formData.stock ? parseInt(formData.stock) : null,
        price: formData.price ? parseFloat(formData.price) : null
      }]);
      if (error) throw error;
      toast.success('Produto cadastrado com sucesso');
      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        brand: '',
        description: '',
        barcode: '',
        stock: '',
        price: '',
        image_url: ''
      });
      fetchProducts();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data, error } = await storage
      .from('products')
      .upload(`product_${Date.now()}`, file);

    if (error) {
      toast.error('Erro ao fazer upload da imagem');
      return;
    }

    const publicUrl = supabase.storage.from('products').getPublicUrl(data.path).publicUrl;
    setFormData({ ...formData, image_url: publicUrl });
    toast.success('Imagem enviada com sucesso');
  };

  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term) ||
      product.brand.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Produtos</h2>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 border rounded text-sm bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" /> Modelo Excel
          </button>

          <CanAccess roles={['master', 'admin']}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </button>
          </CanAccess>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-2 border rounded w-full"
            placeholder="Buscar por nome, código, marca, descrição..."
          />
        </div>
      </div>

      <div className="bg-white shadow rounded">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Carregando...</div>
        ) : (
          <ul>
            {filteredProducts.map(product => (
              <li key={product.id} className="flex justify-between items-center p-4 border-b hover:bg-gray-50">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.code} • {product.brand}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">R$ {product.price?.toFixed(2) || '0,00'}</span>
                  <button className="text-indigo-600 hover:text-indigo-900">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Cadastrar Produto</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded p-2"
              />
              <input
                type="text"
                placeholder="Código"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full border rounded p-2"
              />
              <input
                type="text"
                placeholder="Marca"
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full border rounded p-2"
              />
              <input
                type="text"
                placeholder="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded p-2"
              />
              <input
                type="text"
                placeholder="Código de Barras"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full border rounded p-2"
              />
              <input
                type="number"
                placeholder="Estoque"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full border rounded p-2"
              />
              <input
                type="number"
                placeholder="Preço"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border rounded p-2"
              />
              <div>
                <label className="block text-sm mb-1">Imagem do Produto</label>
                <input type="file" onChange={handleUploadImage} />
                {formData.image_url && (
                  <img src={formData.image_url} alt="Imagem do produto" className="mt-2 w-20 h-20 object-cover rounded" />
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded text-sm bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
