import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Server,
  Shield
} from 'lucide-react';
import Button from '../components/ui/Button';
import { migrateAllData } from '../services/migrationService';
import toast from 'react-hot-toast';

const MigrationPage: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleStartMigration = async () => {
    try {
      setMigrationStatus('running');
      setProgress(10);
      
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);
      
      // Executar migração
      const result = await migrateAllData();
      
      clearInterval(progressInterval);
      
      if (result.success) {
        setProgress(100);
        setMigrationStatus('success');
        toast.success('Migração concluída com sucesso!');
      } else {
        setMigrationStatus('error');
        setErrorMessage(result.error || 'Erro desconhecido durante a migração');
        toast.error('Erro na migração. Verifique os logs para mais detalhes.');
      }
    } catch (error: any) {
      setMigrationStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido durante a migração');
      toast.error('Erro na migração. Verifique os logs para mais detalhes.');
    }
  };

  const handleRetry = () => {
    setMigrationStatus('idle');
    setProgress(0);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <Database size={64} className="mx-auto mb-4 text-green-deep" />
            <h1 className="font-poppins font-bold text-3xl text-soft-black mb-4">
              Migração de Dados
            </h1>
            <p className="font-roboto text-gray-600">
              Migre todos os dados do Supabase e Firebase para o banco de dados MySQL
            </p>
          </div>

          {migrationStatus === 'idle' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl">
                <div className="flex items-start">
                  <Shield size={24} className="text-blue-600 mr-4 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-poppins font-semibold text-lg text-blue-800 mb-2">
                      Importante: Faça backup antes de prosseguir
                    </h3>
                    <p className="font-roboto text-blue-700 mb-3">
                      Esta operação irá migrar todos os dados do Supabase e Firebase para o banco de dados MySQL.
                      Certifique-se de ter feito backup dos dados antes de prosseguir.
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-blue-200">
                      <p className="font-roboto text-sm text-blue-800">
                        <strong>Nota:</strong> A migração pode levar alguns minutos, dependendo da quantidade de dados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Server size={20} className="text-green-deep mr-2" />
                    <h3 className="font-poppins font-semibold text-soft-black">Supabase</h3>
                  </div>
                  <p className="font-roboto text-sm text-gray-600">
                    Dados de autenticação, perfis e relacionamentos
                  </p>
                </div>
                
                <div className="flex items-center justify-center">
                  <ArrowRight size={24} className="text-gray-400" />
                </div>
                
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Database size={20} className="text-green-deep mr-2" />
                    <h3 className="font-poppins font-semibold text-soft-black">MySQL</h3>
                  </div>
                  <p className="font-roboto text-sm text-gray-600">
                    Banco de dados centralizado
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleStartMigration} 
                fullWidth 
                size="lg"
                className="mt-4"
              >
                Iniciar Migração
              </Button>
            </div>
          )}

          {migrationStatus === 'running' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <RefreshCw size={48} className="text-green-deep animate-spin" />
              </div>
              
              <p className="text-center font-poppins font-semibold text-lg text-soft-black">
                Migrando dados...
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-deep h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <p className="text-center font-roboto text-gray-600">
                {progress}% concluído
              </p>
              
              <p className="text-center font-roboto text-sm text-gray-500">
                Por favor, não feche esta janela até que a migração seja concluída.
              </p>
            </div>
          )}

          {migrationStatus === 'success' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-deep" />
                </div>
              </div>
              
              <p className="text-center font-poppins font-semibold text-lg text-soft-black">
                Migração concluída com sucesso!
              </p>
              
              <p className="text-center font-roboto text-gray-600">
                Todos os dados foram migrados para o banco de dados MySQL.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  fullWidth
                >
                  Ir para Dashboard
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  fullWidth
                >
                  Voltar ao Início
                </Button>
              </div>
            </div>
          )}

          {migrationStatus === 'error' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>
              </div>
              
              <p className="text-center font-poppins font-semibold text-lg text-soft-black">
                Erro na migração
              </p>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="font-roboto text-red-700">
                  {errorMessage}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleRetry} 
                  fullWidth
                >
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  fullWidth
                >
                  Voltar ao Início
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;