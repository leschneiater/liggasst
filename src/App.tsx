import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AvisosProvider } from './contexts/AvisosProvider';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-gray">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
      <p className="font-roboto text-gray-600">Carregando...</p>
    </div>
  </div>
);

// Public Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ComoFunciona = lazy(() => import('./pages/ComoFunciona'));
const Planos = lazy(() => import('./pages/Planos'));
const RetornoAssinatura = lazy(() => import('./pages/RetornoAssinatura'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contato = lazy(() => import('./pages/Contato'));
const SobreNos = lazy(() => import('./pages/SobreNos'));
const SobreCache = lazy(() => import('./pages/SobreCache'));
const TermosUso = lazy(() => import('./pages/TermosUso'));
const PoliticaPrivacidade = lazy(() => import('./pages/PoliticaPrivacidade'));
const BuscaProfissionais = lazy(() => import('./pages/BuscaProfissionais'));
const VitrineEmpresas = lazy(() => import('./pages/VitrineEmpresas'));
const PubliqueDemanda = lazy(() => import('./pages/PubliqueDemanda'));
const PerfilProfissionalPublico = lazy(() => import('./pages/PerfilProfissionalPublico'));
const Error404 = lazy(() => import('./pages/Error404'));

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/auth/Dashboard'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const CompletarCadastro = lazy(() => import('./pages/auth/CompletarCadastro'));

// Professional Pages
const DashboardProfissional = lazy(() => import('./pages/professional/DashboardProfissional'));
const PerfilProfissional = lazy(() => import('./pages/professional/PerfilProfissional'));
const CertificadosProfissional = lazy(() => import('./pages/professional/CertificadosProfissional'));
const ContratosProfissional = lazy(() => import('./pages/professional/ContratosProfissional'));
const MensagensProfissional = lazy(() => import('./pages/professional/MensagensProfissional'));
const MessagingRoute = lazy(() => import('./components/Mensagens/MessagingRoute'));
const AssinaturaProfissional = lazy(() => import('./pages/professional/AssinaturaProfissional'));
const BuscaEmpresas = lazy(() => import('./pages/professional/BuscaEmpresas'));
const DemandasDisponiveis = lazy(() => import('./pages/professional/DemandasDisponiveis'));
const DenunciasAdmin = lazy(() => import('./pages/admin/DenunciasAdmin'));
const ContatosAdmin = lazy(() => import('./pages/admin/ContatosAdmin'));
const RadarAdmin = lazy(() => import('./pages/admin/RadarAdmin'));
const TreinamentosAdmin = lazy(() => import('./pages/admin/TreinamentosAdmin'));
const ReembolsosAdmin = lazy(() => import('./pages/admin/ReembolsosAdmin'));
const AdsAdmin = lazy(() => import('./pages/admin/AdsAdmin'));
const RadarTst = lazy(() => import('./pages/RadarTst'));
const Treinamentos = lazy(() => import('./pages/Treinamentos'));
const MinhaCapacitacao = lazy(() => import('./pages/MinhaCapacitacao'));
const CapacitacaoEquipe = lazy(() => import('./pages/company/CapacitacaoEquipe'));

// Company Pages
const DashboardEmpresa = lazy(() => import('./pages/company/DashboardEmpresa'));
const PerfilEmpresa = lazy(() => import('./pages/company/PerfilEmpresa'));
const BuscaProfissionaisEmpresa = lazy(() => import('./pages/company/BuscaProfissionais'));
const ContratosEmpresa = lazy(() => import('./pages/company/ContratosEmpresa'));
const MensagensEmpresa = lazy(() => import('./pages/company/MensagensEmpresa'));
const AssinaturaEmpresa = lazy(() => import('./pages/company/AssinaturaEmpresa'));
const RelatoriosEmpresa = lazy(() => import('./pages/company/RelatoriosEmpresa'));
const EditarDemanda = lazy(() => import('./pages/company/EditarDemanda'));
const ComparadorPropostas = lazy(() => import('./pages/company/ComparadorPropostas'));
const CalendarioConformidade = lazy(() => import('./pages/company/CalendarioConformidade'));
const ProporContrato = lazy(() => import('./pages/company/ProporContrato'));

// Admin Pages
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));

function App() {
  return (
    <Router basename="/liggasst">
      <AuthProvider>
        <AvisosProvider>
          <ScrollToTop />
          <div className="min-h-screen bg-gray-50">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1B4332',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#2D6A4F',
                    color: '#fff',
                  },
                },
                error: {
                  style: {
                    background: '#dc2626',
                    color: '#fff',
                  },
                },
              }}
            />
            
            <ChunkErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Layout><LandingPage /></Layout>} />
                <Route path="/como-funciona" element={<Layout><ComoFunciona /></Layout>} />
                <Route path="/planos" element={<Layout><Planos /></Layout>} />
                <Route path="/assinatura/sucesso" element={<Layout><RetornoAssinatura resultado="sucesso" /></Layout>} />
                <Route path="/assinatura/cancelado" element={<Layout><RetornoAssinatura resultado="cancelado" /></Layout>} />
                <Route path="/faq" element={<Layout><FAQ /></Layout>} />
                <Route path="/contato" element={<Layout><Contato /></Layout>} />
                <Route path="/sobre" element={<Layout><SobreNos /></Layout>} />
                <Route path="/sobre-cache" element={<Layout><SobreCache /></Layout>} />
                <Route path="/termos-de-uso" element={<Layout><TermosUso /></Layout>} />
                <Route path="/politica-de-privacidade" element={<Layout><PoliticaPrivacidade /></Layout>} />
                <Route path="/busca-profissionais" element={<Layout><BuscaProfissionais /></Layout>} />
                <Route path="/vitrine-empresas" element={<Layout><VitrineEmpresas /></Layout>} />
                <Route path="/publique-demanda" element={
                  <ProtectedRoute userType="company">
                    <Layout><PubliqueDemanda /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/perfil-profissional-publico/:id" element={<Layout><PerfilProfissionalPublico /></Layout>} />
                <Route path="/recuperar-senha" element={<ForgotPassword />} />

                {/* Supabase Auth Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  path="/auth/completar-cadastro"
                  element={
                    <ProtectedRoute>
                      <CompletarCadastro />
                    </ProtectedRoute>
                  }
                />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                } />

                {/* Professional Protected Routes */}
                <Route path="/dashboard-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><DashboardProfissional /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/perfil-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><PerfilProfissional /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/certificados" element={
                  <ProtectedRoute userType="professional">
                    <Layout><CertificadosProfissional /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/contratos-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><ContratosProfissional /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/mensagens-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><MessagingRoute destino="/dashboard-profissional"><MensagensProfissional /></MessagingRoute></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/assinatura-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><AssinaturaProfissional /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/busca-empresas" element={
                  <ProtectedRoute userType="professional">
                    <Layout><BuscaEmpresas /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/demandas-disponiveis" element={
                  <ProtectedRoute userType="professional">
                    <Layout><DemandasDisponiveis /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/treinamentos-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><Treinamentos /></Layout>
                  </ProtectedRoute>
                } />

                {/* Company Protected Routes */}
                <Route path="/dashboard-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><DashboardEmpresa /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/perfil-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><PerfilEmpresa /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/busca-profissionais-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><BuscaProfissionaisEmpresa /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/contratos-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><ContratosEmpresa /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/mensagens-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><MessagingRoute destino="/dashboard-empresa"><MensagensEmpresa /></MessagingRoute></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/assinatura-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><AssinaturaEmpresa /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/relatorios" element={
                  <ProtectedRoute userType="company">
                    <Layout><RelatoriosEmpresa /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/editar-demanda/:id" element={
                  <ProtectedRoute userType="company">
                    <Layout><EditarDemanda /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/demandas/:id/propostas" element={
                  <ProtectedRoute userType="company">
                    <Layout><ComparadorPropostas /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/capacitacao-equipe" element={
                  <ProtectedRoute userType="company">
                    <Layout><CapacitacaoEquipe /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/minha-capacitacao" element={
                  <ProtectedRoute userType="employee">
                    <Layout><MinhaCapacitacao /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/calendario-conformidade" element={
                  <ProtectedRoute userType="company">
                    <Layout><CalendarioConformidade /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/propor-contrato/:profissionalId" element={
                  <ProtectedRoute userType="company">
                    <Layout><ProporContrato /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/treinamentos-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><Treinamentos /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/radar-tst-profissional" element={
                  <ProtectedRoute userType="professional">
                    <Layout><RadarTst /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/radar-tst-empresa" element={
                  <ProtectedRoute userType="company">
                    <Layout><RadarTst /></Layout>
                  </ProtectedRoute>
                } />

                {/* Admin Protected Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute userType="admin">
                    <Layout><DashboardAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/denuncias" element={
                  <ProtectedRoute userType="admin">
                    <Layout><DenunciasAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/treinamentos" element={
                  <ProtectedRoute userType="admin">
                    <Layout><TreinamentosAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/radar" element={
                  <ProtectedRoute userType="admin">
                    <Layout><RadarAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/contatos" element={
                  <ProtectedRoute userType="admin">
                    <Layout><ContatosAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/reembolsos" element={
                  <ProtectedRoute userType="admin">
                    <Layout><ReembolsosAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/publicidade" element={
                  <ProtectedRoute userType="admin">
                    <Layout><AdsAdmin /></Layout>
                  </ProtectedRoute>
                } />

                {/* 404 Route */}
                <Route path="*" element={<Layout><Error404 /></Layout>} />
              </Routes>
            </Suspense>
          </ChunkErrorBoundary>
          </div>
      </AvisosProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
