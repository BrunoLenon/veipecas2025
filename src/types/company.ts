export interface CompanyInfo {
  id: string;
  name: string;
  cnpj: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  updated_at: Date;
}