import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Building2, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CompanyInfo } from '../types/company';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const canManageSettings = currentUser?.role === 'master' || currentUser?.role === 'admin';

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  async function fetchCompanyInfo() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error);
      toast.error('Erro ao carregar informações da empresa');
    } finally {
      setLoading(false);
    }
  }

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : companyInfo ? (
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">{companyInfo.name}</h3>
                <p className="text-sm text-gray-500">CNPJ: {companyInfo.cnpj}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma informação cadastrada
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}