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
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal de cadastro/edição
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // Modal de preview
  const [isZoomOpen, setIsZoomOpen] = useState(false); // Modal de zoom da imagem
  const [isCartModalOpen, setIsCartModalOpen] = useState(false); // Modal de quantidade no carrinho
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [cartProduct, setCartProduct] = useState<Product | null>(null); // Produto para adicionar ao carrinho
  const [quantity, setQuantity] = useState(1); // Quantidade selecionada
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    barcode: '',
    brand: '',
    stock: 0,
    price: '',
    category_id: '',
    tags: [] as string[],
    image_url: '',
    is_new: false,
  });

  const canManageProducts = user?.role === 'master' || user?.role === 'admin';
  const canAddToCart = user?.role === 'customer' || user?.role === 'seller';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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
      console.error('Erro ao buscar produtos:', error);
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
      console.error('Erro ao buscar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('code', formData.code)
        .eq('brand', formData.brand)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingProduct && existingProduct.id !== selectedProduct?.id) {
        toast.error('Já existe um produto com este código e marca');
        return;
      }

      const productData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : 0,
        tags: formData.tags,
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

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um produto com este código e marca');
          return;
        }
        throw error;
      }

      toast.success(
        selectedProduct
          ? 'Produto atualizado com sucesso!'
          : 'Produto cadastrado com sucesso!'
      );
      
      setIsModalOpen(false);
      setSelectedProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto');
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      code: product.code,
      barcode: product.barcode || '',
      brand: product.brand,
      stock: product.stock || 0,
      price: product.price?.toString() || '0',
      category_id: product.category_id || '',
      tags: product.tags || [],
      image_url: product.image_url || '',
      is_new: product.is_new || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Produto excluído com sucesso!');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const handleAddToCartClick = (product: Product) => {
    setCartProduct(product);
    setQuantity(1); // Resetar quantidade para 1
    setIsCartModalOpen(true); // Abrir modal de quantidade
  };

  const handleAddToCartConfirm = async () => {
    if (!user || !cartProduct) return;

    try {
      setAddingToCart(cartProduct.id);

      const { data, error } = await supabase
        .rpc('add_to_cart', {
          p_user_id: user.id,
          p_product_id: cartProduct.id,
          p_quantity: quantity
        });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success(`${quantity} ${quantity > 1 ? 'unidades' : 'unidade'} adicionada(s) ao carrinho!`);
      setIsCartModalOpen(false);
      setCartProduct(null);
    } catch (error: any) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast.error(error.message || 'Erro ao adicionar ao carrinho');
    } finally {
      setAddingToCart(null);
    }
  };

  const handlePreview = (product: Product) => {
    setPreviewProduct(product);
    setIsPreviewOpen(true);
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
      tags: [],
      image_url: '',
      is_new: false,
    });
  };

  const handleImageCapture = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Seu dispositivo não suporta captura de imagem');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve) => 
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg')
      );

      stream.getTracks().forEach(track => track.stop());

      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const publicUrl = await storage.upload(storage.buckets.images, file);
      
      setFormData({ ...formData, image_url: publicUrl });
      toast.success('Imagem capturada com sucesso!');
    } catch (error) {
      console.error('Erro ao capturar imagem:', error);
      toast.error('Erro ao capturar imagem');
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        nome: 'Exemplo Produto',
        descricao: 'Descrição do produto',
        codigo: 'PRD001',
        codigo_barras: '7891234567890',
        marca: 'Marca Exemplo',
        estoque: 10,
        preco: 99.99,
        categoria: 'Nome da Categoria',
        lancamento: true
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let created = 0;
          let updated = 0;
          let errors = [];

          for (const row of jsonData as any[]) {
            try {
              if (!row.codigo || !row.marca || !row.nome) {
                errors.push(`Linha com dados obrigatórios faltando (código, marca ou nome)`);
                continue;
              }

              const { data: existingProduct } = await supabase
                .from('products')
                .select('id')
                .eq('code', row.codigo)
                .eq('brand', row.marca)
                .single();

              const productData = {
                name: row.nome,
                description: row.descricao || null,
                code: row.codigo,
                barcode: row.codigo_barras || null,
                brand: row.marca,
                stock: parseInt(row.estoque) || 0,
                price: parseFloat(row.preco) || 0,
                category_id: categories.find(c => c.name === row.categoria)?.id || null,
                tags: [],
                is_new: row.lancamento || false,
              };

              let error;
              if (existingProduct) {
                const { error: updateError } = await supabase
                  .from('products')
                  .update(productData)
                  .eq('id', existingProduct.id);
                error = updateError;
                if (!error) updated++;
              } else {
                const { error: insertError } = await supabase
                  .from('products')
                  .insert([productData]);
                error = insertError;
                if (!error) created++;
              }

              if (error) {
                errors.push(`Erro ao processar produto ${row.codigo}: ${error.message}`);
              }
            } catch (error: any) {
              errors.push(`Erro ao processar linha: ${error.message}`);
            }
          }

          if (created > 0 || updated > 0) {
            toast.success(
              `Importação concluída!\n${created} produtos criados\n${updated} produtos atualizados`
            );
            fetchProducts();
          }

          if (errors.length > 0) {
            toast((t) => (
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-red-800">
                    Alguns itens não puderam ser processados:
                  </h4>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {errors.slice(0, 3).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 3 && (
                      <li>...e mais {errors.length - 3} erro(s)</li>
                    )}
                  </ul>
                </div>
              </div>
            ), {
              duration: 5000,
              style: {
                maxWidth: '500px',
                padding: '16px',
              },
            });
          }
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          toast.error('Erro ao processar arquivo. Verifique o formato dos dados.');
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar produtos');
    }

    e.target.value = '';
  };

  const filteredProducts = products.filter(product => {
    if (!searchTerm.trim()) return true;
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
    const combined = `${product.name} ${product.brand} ${product.code} ${product.barcode || ''} ${product.description || ''}`.toLowerCase();
    return searchTerms.every(term => combined.includes(term));
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Produtos
          </h2>
        </div>
        <CanAccess roles={['master', 'admin']}>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-5 w-5 mr-2" />
              Baixar Modelo
            </button>
            
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
              <Upload className="h-5 w-5 mr-2" />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                resetForm();
                setSelectedProduct(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Produto
            </button>
          </div>
        </CanAccess>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Buscar produtos..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredProducts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td 
                      className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-gray-50"
                      onClick={() => handlePreview(product)}
                    >
                      <div className="flex items-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {product.name}
                            </span>
                            {product.is_new && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Lançamento
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <div className="text-sm text-gray-500">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.code}
                      {product.barcode && (
                        <div className="text-xs text-gray-400">
                          EAN: {product.barcode}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.stock > 10
                          ? 'bg-green-100 text-green-800'
                          : product.stock > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock} un
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {canAddToCart && (
                          <button
                            onClick={() => handleAddToCartClick(product)}
                            disabled={addingToCart === product.id || product.stock === 0}
                            className={`text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                              addingToCart === product.id ? 'animate-pulse' : ''
                            }`}
                            title={product.stock === 0 ? 'Produto sem estoque' : 'Adicionar ao carrinho'}
                          >
                            {addingToCart === product.id ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <ShoppingCart className="h-5 w-5" />
                            )}
                          </button>
                        )}
                        <CanAccess roles={['master', 'admin']}>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar produto"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir produto"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </CanAccess>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Package className="h-12 w-12 mb-3" />
              <span className="text-lg">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </span>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? (
                  'Tente buscar com outros termos'
                ) : canManageProducts ? (
                  'Clique em "Novo Produto" para começar'
                ) : (
                  'Não há produtos disponíveis no momento'
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedProduct(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Código
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Código de Barras
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Marca
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estoque
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock: parseInt(e.target.value) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Preço
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Categoria
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({ ...formData, category_id: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_new}
                        onChange={(e) =>
                          setFormData({ ...formData, is_new: e.target.checked })
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Marcar como Lançamento
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem
                  </label>
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div className="flex space-x-3">
                    <ImageUploader
                      bucket={storage.buckets.images}
                      onUpload={(url) =>
                        setFormData({ ...formData, image_url: url })
                      }
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleImageCapture}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Câmera
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedProduct(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {selectedProduct ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Preview */}
      <AnimatePresence>
        {isPreviewOpen && previewProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Produto
                </h3>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-4">
                  {previewProduct.image_url ? (
                    <img
                      src={previewProduct.image_url}
                      alt={previewProduct.name}
                      className="h-24 w-24 rounded-lg object-cover cursor-pointer"
                      onClick={() => setIsZoomOpen(true)} // Abrir zoom ao clicar
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {previewProduct.name}
                      {previewProduct.is_new && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Lançamento
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-500">{previewProduct.brand}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Código</span>
                    <span className="text-sm text-gray-900">{previewProduct.code}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Código de Barras</span>
                    <span className="text-sm text-gray-900">{previewProduct.barcode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Estoque</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      previewProduct.stock > 10
                        ? 'bg-green-100 text-green-800'
                        : previewProduct.stock > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {previewProduct.stock} un
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Preço</span>
                    <span className="text-sm text-gray-900">{formatCurrency(previewProduct.price)}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Categoria</span>
                    <span className="text-sm text-gray-900">
                      {categories.find(c => c.id === previewProduct.category_id)?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                {previewProduct.description && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Descrição</span>
                    <p className="text-sm text-gray-500">{previewProduct.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end p-6 border-t">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Zoom da Imagem */}
      <AnimatePresence>
        {isZoomOpen && previewProduct?.image_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setIsZoomOpen(false)} // Fechar ao clicar fora
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative"
            >
              <img
                src={previewProduct.image_url}
                alt={previewProduct.name}
                className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
              />
              <button
                onClick={() => setIsZoomOpen(false)}
                className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-75 rounded-full p-1 hover:bg-opacity-100"
              >
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Quantidade no Carrinho */}
      <AnimatePresence>
        {isCartModalOpen && cartProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-sm w-full"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Adicionar ao Carrinho
                </h3>
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-4">
                  {cartProduct.image_url ? (
                    <img
                      src={cartProduct.image_url}
                      alt={cartProduct.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">
                      {cartProduct.name}
                    </h4>
                    <p className="text-sm text-gray-500">{formatCurrency(cartProduct.price)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={cartProduct.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(cartProduct.stock, parseInt(e.target.value) || 1)))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Disponível: {cartProduct.stock} unidades
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddToCartConfirm}
                  disabled={addingToCart === cartProduct.id}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}