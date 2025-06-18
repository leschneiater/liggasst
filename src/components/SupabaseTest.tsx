import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Database } from 'lucide-react';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Testa a conexão com o Supabase usando uma query simples
        const { error } = await supabase.from('_test').select('*').limit(1);
        
        // Se o erro for "table not found" (PostgreSQL error code), significa que a conexão está OK
        if (error && error.code === '42P01') {
          setConnectionStatus('success');
          return;
        }
        
        // Se não há erro, a conexão está OK
        if (!error) {
          setConnectionStatus('success');
          return;
        }
        
        // Outros erros indicam problema de conexão - só loga erros inesperados
        throw error;
        
      } catch (error: any) {
        // Só loga erros que não sejam o esperado "table not found"
        if (error.code !== '42P01') {
          console.error('Erro de conexão:', error);
        }
        setConnectionStatus('error');
        setErrorMessage(error.message || 'Erro desconhecido');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm z-50">
      <div className="flex items-center space-x-3">
        <Database size={20} className="text-green-deep" />
        <div>
          <h3 className="font-poppins font-semibold text-sm text-soft-black">
            Status Supabase
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            {connectionStatus === 'testing' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-deep"></div>
                <span className="font-roboto text-xs text-gray-600">Testando...</span>
              </>
            )}
            {connectionStatus === 'success' && (
              <>
                <CheckCircle size={16} className="text-green-600" />
                <span className="font-roboto text-xs text-green-600">Conectado</span>
              </>
            )}
            {connectionStatus === 'error' && (
              <>
                <AlertCircle size={16} className="text-red-600" />
                <span className="font-roboto text-xs text-red-600">Erro</span>
              </>
            )}
          </div>
          {connectionStatus === 'error' && (
            <p className="font-roboto text-xs text-red-500 mt-1 break-words">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseTest;