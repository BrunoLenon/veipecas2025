import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  Users,
  Building2,
  UserPlus,
  Search,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, UserRole } from '../types/user';
import type { CompanyInfo } from '../types/company';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const canManageSettings = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const canManageAdmins = currentUser?.role === 'master';

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cnpj_cpf.includes(searchTerm)
  );

  if (!canManageSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Configurações</h2>
      <div className="bg-white shadow rounded-lg">
        <div className="border-b flex">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 px-1 text-center border-b-2 ${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}
          >
            <Users className="h-5 w-5 mx-auto mb-1" />Usuários
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`flex-1 py-4 px-1 text-center border-b-2 ${activeTab === 'company' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}
          >
            <Building2 className="h-5 w-5 mx-auto mb-1" />Empresa
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'users' ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-md">
                  <Search className="absolute top-2 left-2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar usuários..."
                    className="pl-10 w-full border rounded-md py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="ml-4 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
                >
                  <UserPlus className="h-5 w-5 mr-2" />Novo Usuário
                </button>
              </div>
              {/* Aqui viria a tabela de usuários */}
            </div>
          ) : (
            <div>
              {/* Aqui viria as infos da empresa */}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isUserModalOpen && (
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
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
            >
              {/* Formulário do modal aqui */}
              <div className="p-6">Modal de Novo Usuário</div>
              <div className="flex justify-end p-4">
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded-md text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
