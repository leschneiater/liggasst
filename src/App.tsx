import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SupabaseProtectedRoute from './components/SupabaseProtectedRoute';
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
const FAQ = lazy(() => import('./pages/FAQ'));
const Contato = lazy(() => import('./pages/Contato'));
const SobreNos = lazy(() => import('./pages/SobreNos'));
const SobreCache = lazy(() => import('./pages/SobreCache'));
const TermosUso = lazy(() => import('./pages/TermosUso'));
const PoliticaPrivacidade = lazy(() => import('./pages/PoliticaPrivacidade'));
const BuscaProfissionais = lazy(() => import('./pages/BuscaProfissionais'));
const PubliqueDemanda = lazy(() => import('./pages/PubliqueDemanda'));
const PerfilProfissionalPublico = lazy(() => import('./pages/PerfilProfissionalPublico'));
const RecuperarSenha = lazy(() => import('./pages/RecuperarSenha'));
const Error404 = lazy(() => import('./pages/Error404'));
const MigrationPage = lazy(() => import('./pages/MigrationPage'));

// Auth Pages (Supabase)
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/auth/Dashboard'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// Professional Pages
const DashboardProfissional = lazy(() => import('./pages/professional/DashboardProfissional'));
const PerfilProfissional = lazy(() => import('./pages/professional/PerfilProfissional'));
const CertificadosProfissional = lazy(() => import('./pages/professional/CertificadosProfissional'));
const ContratosProfissional = lazy(() => import('./pages/professional/ContratosProfissional'));
const MensagensProfissional = lazy(() => import('./pages/professional/MensagensProfissional'));
const AssinaturaProfissional = lazy(() => import('./pages/professional/AssinaturaProfissional'));
const BuscaEmpresas = lazy(() => import('./pages/professional/BuscaEmpresas'));

// Company Pages
const DashboardEmpresa = lazy(() => import('./pages/company/DashboardEmpresa'));
const PerfilEmpresa = lazy(() => import('./pages/company/PerfilEmpresa'));
const BuscaProfissionaisEmpresa = lazy(() => import('./pages/company/BuscaProfissionais'));
const ContratosEmpresa = lazy(() => import('./pages/company/ContratosEmpresa'));
const MensagensEmpresa = lazy(() => import('./pages/company/MensagensEmpresa'));
const AssinaturaEmpresa = lazy(() => import('./pages/company/AssinaturaEmpresa'));
const RelatoriosEmpresa = lazy(() => import('./pages/company/RelatoriosEmpresa'));

// Admin Pages
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <SupabaseAuthProvider>
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
            
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Layout><LandingPage /></Layout>} />
                <Route path="/como-funciona" element={<Layout><ComoFunciona /></Layout>} />
                <Route path="/planos" element={<Layout><Planos /></Layout>} />
                <Route path="/faq" element={<Layout><FAQ /></Layout>} />
                <Route path="/contato" element={<Layout><Contato /></Layout>} />
                <Route path="/sobre" element={<Layout><SobreNos /></Layout>} />
                <Route path="/sobre-cache" element={<Layout><SobreCache /></Layout>} />
                <Route path="/termos-de-uso" element={<Layout><TermosUso /></Layout>} />
                <Route path="/politica-de-privacidade" element={<Layout><PoliticaPrivacidade /></Layout>} />
                <Route path="/busca-profissionais" element={<Layout><BuscaProfissionais /></Layout>} />
                <Route path="/publique-demanda" element={<Layout><PubliqueDemanda /></Layout>} />
                <Route path="/perfil-profissional-publico/:id" element={<Layout><PerfilProfissionalPublico /></Layout>} />
                <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                <Route path="/migracao" element={<MigrationPage />} />

                {/* Supabase Auth Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/dashboard" element={
                  <SupabaseProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </SupabaseProtectedRoute>
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
                    <Layout><MensagensProfissional /></Layout>
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
                    <Layout><MensagensEmpresa /></Layout>
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

                {/* Admin Protected Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute userType="admin">
                    <Layout><DashboardAdmin /></Layout>
                  </ProtectedRoute>
                } />

                {/* 404 Route */}
                <Route path="*" element={<Layout><Error404 /></Layout>} />
              </Routes>
            </Suspense>
          </div>
        </SupabaseAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;