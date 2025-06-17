import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Database } from 'lucide-react';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Testa a conexão com o Supabase
        const { data, error } = await supabase.from('_test').select('*').limit(1);
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 é "table not found" - isso é esperado se não temos tabelas ainda
          throw error;
        }
        
        setConnectionStatus('success');
      } catch (error: any) {
        console.error('Erro de conexão:', error);
        setConnectionStatus('error');
        setErrorMessage(error.message || 'Erro desconhecido');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm">
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
            <p className="font-roboto text-xs text-red-500 mt-1">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseTest;