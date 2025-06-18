import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SupabaseProtectedRoute from './components/SupabaseProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import SupabaseTest from './components/SupabaseTest';

// Public Pages
import LandingPage from './pages/LandingPage';
import ComoFunciona from './pages/ComoFunciona';
import Planos from './pages/Planos';
import FAQ from './pages/FAQ';
import Contato from './pages/Contato';
import SobreNos from './pages/SobreNos';
import SobreCache from './pages/SobreCache';
import TermosUso from './pages/TermosUso';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import BuscaProfissionais from './pages/BuscaProfissionais';
import PubliqueDemanda from './pages/PubliqueDemanda';
import PerfilProfissionalPublico from './pages/PerfilProfissionalPublico';
import RecuperarSenha from './pages/RecuperarSenha';
import Error404 from './pages/Error404';

// Auth Pages (Supabase)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/auth/Dashboard';
import ForgotPassword from './pages/auth/ForgotPassword';

// Professional Pages
import DashboardProfissional from './pages/professional/DashboardProfissional';
import PerfilProfissional from './pages/professional/PerfilProfissional';
import CertificadosProfissional from './pages/professional/CertificadosProfissional';
import ContratosProfissional from './pages/professional/ContratosProfissional';
import MensagensProfissional from './pages/professional/MensagensProfissional';
import AssinaturaProfissional from './pages/professional/AssinaturaProfissional';
import BuscaEmpresas from './pages/professional/BuscaEmpresas';

// Company Pages
import DashboardEmpresa from './pages/company/DashboardEmpresa';
import PerfilEmpresa from './pages/company/PerfilEmpresa';
import BuscaProfissionaisEmpresa from './pages/company/BuscaProfissionais';
import ContratosEmpresa from './pages/company/ContratosEmpresa';
import MensagensEmpresa from './pages/company/MensagensEmpresa';
import AssinaturaEmpresa from './pages/company/AssinaturaEmpresa';
import RelatoriosEmpresa from './pages/company/RelatoriosEmpresa';

// Admin Pages
import DashboardAdmin from './pages/admin/DashboardAdmin';

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

            {/* Supabase Connection Test */}
            <SupabaseTest />
          </div>
        </SupabaseAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;