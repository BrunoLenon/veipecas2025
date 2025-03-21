import { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../types/user';

interface CanAccessProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

const CanAccess = ({ roles, children, fallback = null }: CanAccessProps) => {
  const { user } = useAuth();

  // Se o usuário não existir ou não tiver uma role autorizada, renderiza o fallback
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // Renderiza o conteúdo autorizado
  return <>{children}</>;
};

export default CanAccess;
