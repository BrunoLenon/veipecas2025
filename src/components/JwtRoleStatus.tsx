import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function JwtRoleStatus() {
  const [role, setRole] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkJwt = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const jwt = session.access_token;
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        console.log("JWT payload:", payload);

        const meta = payload.user_metadata || {};
        const appMeta = payload.app_metadata || {};

        const roleFromJwt = meta.role || appMeta.role || payload.role || 'Não encontrado';
        const sellerFromJwt = meta.seller_id || appMeta.seller_id || null;

        setRole(roleFromJwt);
        setSellerId(sellerFromJwt);
      } else {
        setRole('Sem sessão');
        setSellerId(null);
      }
      setLoading(false);
    };

    checkJwt();
  }, []);

  if (loading) return null;

  return (
    <div className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-800">
      <span>Role: {role}</span>
      {role === 'seller' && <span className="ml-2"> | Seller: {sellerId}</span>}
    </div>
  );
}
