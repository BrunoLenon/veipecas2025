import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, storage } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  Users, 
  Building2, 
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  UserPlus,
  Mail,
  Key,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploader from '../components/ImageUploader';
import type { User, UserRole } from '../types/user';
import type { CompanyInfo } from '../types/company';

const roleLabels: Record<UserRole, string> = {
  master: 'Master',
  admin: 'Administrador',
  seller: 'Vendedor',
  customer: 'Cliente'
};

const roleColors: Record<UserRole, string> = {
  master: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  seller: 'bg-green-100 text-green-800',
  customer: 'bg-gray-100 text-gray-800'
};

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer' as UserRole,
    cnpj_cpf: '',
    seller_id: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
  });

  const canManageSettings = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const canManageAdmins = currentUser?.role === 'master';

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchCompanyInfo();
    }
  }, [activeTab]);

  async function fetchUsers() {
    try {
      setLoading(true);
      let query = supabase.from('users').select('*');

      if (currentUser?.role === 'admin') {
        query = query.neq('role', 'master');
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompanyInfo() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCompanyInfo(data);
      
      if (data) {
        setCompanyFormData({
          name: data.name,
          cnpj: data.cnpj,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logo_url: data.logo_url || '',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error);
      toast.error('Erro ao carregar informações da empresa');
    } finally {
      setLoading(false);
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (!userFormData.name.trim() || !userFormData.email.trim() || !userFormData.cnpj_cpf.trim()) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${userFormData.email},cnpj_cpf.eq.${userFormData.cnpj_cpf}`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser && (!selectedUser || existingUser.id !== selectedUser.id)) {
        toast.error('Já existe um usuário com este email ou CPF/CNPJ');
        return;
      }

      let userId = selectedUser?.id;

      if (!selectedUser) {
        if (!userFormData.password) {
          toast.error('Senha é obrigatória para novos usuários');
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userFormData.email,
          password: userFormData.password,
          options: {
            data: {
              role: userFormData.role,
            },
          },
        });

        if (authError) throw authError;
        userId = authData.user?.id;
      }

      if (!userId) throw new Error('ID do usuário não encontrado');

      const userData = {
        id: userId,
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
        cnpj_cpf: userFormData.cnpj_cpf,
        seller_id: userFormData.seller_id || null,
        status: true,
      };

      let error;
      if (selectedUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', userId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert([userData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        selectedUser
          ? 'Usuário atualizado com sucesso!'
          : 'Usuário cadastrado com sucesso!'
      );
      
      setIsUserModalOpen(false);
      setSelectedUser(null);
      resetUserForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      password: '', // Não preenchemos a senha ao editar
      role: user.role,
      cnpj_cpf: user.cnpj_cpf,
      seller_id: user.seller_id || '',
    });
    setIsUserModalOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setPasswordForm({
      newPassword: '',
      confirmPassword: ''
    });
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedUser) return;

    try {
      setIsSubmitting(true);

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      const { data, error } = await supabase.rpc(
        'update_user_password',
        {
          target_user_id: selectedUser.id,
          new_password: passwordForm.newPassword
        }
      );

      if (error) throw error;

      if (!data) {
        throw new Error('Você não tem permissão para alterar esta senha');
      }

      toast.success('Senha atualizada com sucesso!');
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      setPasswordForm({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      toast.error(error.message || 'Erro ao atualizar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  // Função adicionada para corrigir o erro
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (!companyFormData.name.trim() || !companyFormData.cnpj.trim()) {
        toast.error('Nome e CNPJ são obrigatórios');
        return;
      }

      // Verifica se já existe uma empresa com o mesmo CNPJ
      const { data: existingCompany, error: checkError } = await supabase
        .from('company_info')
        .select('id')
        .eq('cnpj', companyFormData.cnpj)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      const companyData = {
        name: companyFormData.name,
        cnpj: companyFormData.cnpj,
        address: companyFormData.address || null,
        phone: companyFormData.phone || null,
        email: companyFormData.email || null,
        website: companyFormData.website || null,
        logo_url: companyFormData.logo_url || null,
      };

      let error;
      if (companyInfo) {
        // Atualiza os dados da empresa existente
        const { error: updateError } = await supabase
          .from('company_info')
          .update(companyData)
          .eq('id', companyInfo.id);
        error = updateError;
      } else {
        // Insere uma nova empresa
        const { error: insertError } = await supabase
          .from('company_info')
          .insert([companyData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        companyInfo
          ? 'Empresa atualizada com sucesso!'
          : 'Empresa cadastrada com sucesso!'
      );
      
      setIsCompanyModalOpen(false);
      fetchCompanyInfo();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma empresa com este CNPJ');
      } else {
        toast.error(error.message || 'Erro ao salvar empresa');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'customer',
      cnpj_cpf: '',
      seller_id: '',
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cnpj_cpf.includes(searchTerm)
  );

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mb-6">
        Configurações
      </h2>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`}
            >
              <Users className="h-5 w-5 mx-auto mb-1" />
              Usuários
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`${
                activeTab === 'company'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`}
            >
              <Building2 className="h-5 w-5 mx-auto mb-1" />
              Empresa
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                  <div className="relative rounded-md shadow-sm max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Buscar usuários..."
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetUserForm();
                    setSelectedUser(null);
                    setIsUserModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Novo Usuário
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Função
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CPF/CNPJ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}>
                              {roleLabels[user.role]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.cnpj_cpf}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {(user.role !== 'master' || currentUser?.role === 'master') && (
                              <>
                                <button
                                  onClick={() => handleChangePassword(user)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                                  title="Alterar Senha"
                                >
                                  <Lock className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                                  title="Editar Usuário"
                                >
                                  <Edit className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mb-3" />
                  <span className="text-lg">Nenhum usuário encontrado</span>
                  {searchTerm && (
                    <p className="text-sm text-gray-400 mt-2">
                      Tente buscar com outros termos
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : companyInfo ? (
                <div className="bg-white rounded-lg">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center">
                      {companyInfo.logo_url ? (
                        <img
                          src={companyInfo.logo_url}
                          alt={companyInfo.name}
                          className="h-16 w-16 rounded-lg object-contain bg-gray-50"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {companyInfo.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          CNPJ: {companyInfo.cnpj}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCompanyModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Edit className="h-5 w-5 mr-2" />
                      Editar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Contato
                      </h4>
                      <div className="space-y-3">
                        {companyInfo.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2" />
                            {companyInfo.email}
                          </div>
                        )}
                        {companyInfo.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2" />
                            {companyInfo.phone}
                          </div>
                        )}
                        {companyInfo.website && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Globe className="h-4 w-4 mr-2" />
                            <a
                              href={companyInfo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-500"
                            >
                              {companyInfo.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Endereço
                      </h4>
                      {companyInfo.address ? (
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                          {companyInfo.address}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          Nenhum endereço cadastrado
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma informação cadastrada
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Cadastre as informações da sua empresa para começar
                  </p>
                  <button
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Cadastrar Empresa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Usuário */}
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
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.name}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={userFormData.email}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, email: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  {!selectedUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Senha
                      </label>
                      <input
                        type="password"
                        required={!selectedUser}
                        value={userFormData.password}
                        onChange={(e) =>
                          setUserFormData({ ...userFormData, password: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      CPF/CNPJ
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.cnpj_cpf}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, cnpj_cpf: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Função
                    </label>
                    <select
                      value={userFormData.role}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          role: e.target.value as UserRole,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {currentUser?.role === 'master' && (
                        <>
                          <option value="master">Master</option>
                          <option value="admin">Administrador</option>
                        </>
                      )}
                      <option value="seller">Vendedor</option>
                      <option value="customer">Cliente</option>
                    </select>
                  </div>

                  {userFormData.role === 'customer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Vendedor Responsável
                      </label>
                      <select
                        value={userFormData.seller_id}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            seller_id: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Selecione um vendedor</option>
                        {users
                          .filter((u) => u.role === 'seller')
                          .map((seller) => (
                            <option key={seller.id} value={seller.id}>
                              {seller.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Salvando...'
                      : selectedUser
                      ? 'Atualizar'
                      : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Senha */}
      <AnimatePresence>
        {isPasswordModalOpen && (
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
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Alterar Senha - {selectedUser?.name}
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal da Empresa */}
      <AnimatePresence>
        {isCompanyModalOpen && (
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
                  {companyInfo ? 'Editar Empresa' : 'Cadastrar Empresa'}
                </h3>
                <button
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCompanySubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo
                  </label>
                  {companyFormData.logo_url && (
                    <img
                      src={companyFormData.logo_url}
                      alt="Logo preview"
                      className="h-32 w-32 object-contain bg-gray-50 rounded-lg mb-2"
                    />
                  )}
                  <ImageUploader
                    bucket={storage.buckets.images}
                    onUpload={(url) =>
                      setCompanyFormData({ ...companyFormData, logo_url: url })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      required
                      value={companyFormData.name}
                      onChange={(e) =>
                        setCompanyFormData({
                          ...companyFormData,
                          name: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      required
                      value={companyFormData.cnpj}
                      onChange={(e) =>
                        setCompanyFormData({
                          ...companyFormData,
                          cnpj: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={companyFormData.email}
                      onChange={(e) =>
                        setCompanyFormData({
                          ...companyFormData,
                          email: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={companyFormData.phone}
                      onChange={(e) =>
                        setCompanyFormData({
                          ...companyFormData,
                          phone: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <input
                      type="url"
                      value={companyFormData.website}
                      onChange={(e) =>
                        setCompanyFormData({
                          ...companyFormData,
                          website: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="https://"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Endereço
                  </label>
                  <textarea
                    value={companyFormData.address}
                    onChange={(e) =>
                      setCompanyFormData({
                        ...companyFormData,
                        address: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsCompanyModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}