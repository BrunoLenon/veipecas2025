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
  Download
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
            <label className="flex items-center px-4 py-2 border rounded text-sm bg-white hover:bg-gray-50 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" /> Importar Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" />
            </label>
          </CanAccess>

          <button className="flex items-center px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Novo Produto
          </button>
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
    </div>
  );
}
