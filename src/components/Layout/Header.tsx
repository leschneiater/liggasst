import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, Building2, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import LoginModal from '../LoginModal';
import CadastroEmpresaModal from '../CadastroEmpresaModal';
import CadastroProfissionalModal from '../CadastroProfissionalModal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCadastroEmpresaOpen, setIsCadastroEmpresaOpen] = useState(false);
  const [isCadastroProfissionalOpen, setIsCadastroProfissionalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Firebase Auth (sistema original)
  const { currentUser, userType, logout } = useAuth();
  
  // Supabase Auth (sistema de teste)
  const { user: supabaseUser, signOut } = useSupabaseAuth();
  
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar scroll para efeito visual no header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await logout();
      }
      if (supabaseUser) {
        await signOut();
      }
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProtectedNavigation = (path: string, actionName: string) => {
    if (!currentUser && !supabaseUser) {
      toast.error(`Você precisa estar logado para ${actionName}`);
      setIsLoginModalOpen(true);
      return;
    }
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  const publicNavItems = [
    { path: '/', label: 'Início' },
    { path: '/como-funciona', label: 'Como Funciona' },
    { 
      path: '/busca-profissionais', 
      label: 'Buscar Profissionais',
      protected: true,
      actionName: 'buscar profissionais'
    },
    { path: '/planos', label: 'Planos' },
    { path: '/contato', label: 'Contato' },
  ];

  const getDashboardLink = () => {
    // Se tem usuário Supabase, vai para dashboard Supabase
    if (supabaseUser) {
      return '/dashboard';
    }
    
    // Se tem usuário Firebase, vai para dashboard específico
    switch (userType) {
      case 'professional':
        return '/dashboard-profissional';
      case 'company':
        return '/dashboard-empresa';
      case 'admin':
        return '/admin';
      default:
        return '/';
    }
  };

  const isLoggedIn = currentUser || supabaseUser;

  return (
    <>
      <header className={`bg-white sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'shadow-lg border-b border-gray-100' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group" aria-label="LiggaSST - Página Inicial">
              <div className="w-10 h-10 bg-green-deep rounded-lg flex items-center justify-center group-hover:bg-green-medium transition-colors duration-300">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="font-poppins font-bold text-xl md:text-2xl text-green-deep group-hover:text-green-medium transition-colors duration-300">
                LiggaSST
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6 lg:space-x-8" aria-label="Navegação principal">
              {publicNavItems.map((item) => (
                item.protected ? (
                  <button
                    key={item.path}
                    onClick={() => handleProtectedNavigation(item.path, item.actionName!)}
                    className={`font-roboto transition-all duration-300 relative ${
                      isActive(item.path)
                        ? 'text-green-deep font-semibold'
                        : 'text-gray-700 hover:text-green-deep'
                    }`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    {item.label}
                    {isActive(item.path) && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-green-deep rounded-full"></div>
                    )}
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`font-roboto transition-all duration-300 relative ${
                      isActive(item.path)
                        ? 'text-green-deep font-semibold'
                        : 'text-gray-700 hover:text-green-deep'
                    }`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    {item.label}
                    {isActive(item.path) && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-green-deep rounded-full"></div>
                    )}
                  </Link>
                )
              ))}
            </nav>

            {/* User Actions */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  {/* Notifications */}
                  <button className="p-2 text-gray-600 hover:text-green-deep transition-colors duration-300 relative" aria-label="Notificações">
                    <Bell size={20} />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-medium rounded-full" aria-hidden="true"></span>
                  </button>
                  
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-light text-green-deep rounded-lg hover:bg-green-deep hover:text-white transition-all duration-300 font-semibold border border-green-light shadow-sm hover:shadow-md"
                    aria-label="Acessar Dashboard"
                  >
                    {supabaseUser ? <User size={16} /> : userType === 'professional' ? <User size={16} /> : <Building2 size={16} />}
                    <span>Dashboard</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors duration-300 font-semibold"
                    aria-label="Sair da conta"
                  >
                    <LogOut size={16} />
                    <span>Sair</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setIsLoginModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-green-deep text-green-deep hover:bg-green-deep hover:text-white"
                  >
                    Entrar
                  </Button>
                  
                  <div className="relative group">
                    <Button
                      size="sm"
                      className="bg-green-deep text-white hover:bg-green-medium"
                    >
                      Cadastrar
                    </Button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                      <button
                        onClick={() => setIsCadastroEmpresaOpen(true)}
                        className="w-full text-left px-4 py-3 text-sm font-roboto text-gray-700 hover:bg-green-light hover:text-green-deep transition-colors duration-200 rounded-t-lg flex items-center"
                      >
                        <Building2 size={16} className="mr-2" />
                        Sou Empresa
                      </button>
                      <button
                        onClick={() => setIsCadastroProfissionalOpen(true)}
                        className="w-full text-left px-4 py-3 text-sm font-roboto text-gray-700 hover:bg-green-light hover:text-green-deep transition-colors duration-200 rounded-b-lg flex items-center"
                      >
                        <User size={16} className="mr-2" />
                        Sou Profissional
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-green-deep focus:outline-none transition-colors duration-300"
              aria-expanded={isMenuOpen}
              aria-label="Menu principal"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
                {publicNavItems.map((item) => (
                  item.protected ? (
                    <button
                      key={item.path}
                      onClick={() => {
                        handleProtectedNavigation(item.path, item.actionName!);
                        setIsMenuOpen(false);
                      }}
                      className={`block px-3 py-2 rounded-md text-base font-roboto transition-colors duration-300 w-full text-left ${
                        isActive(item.path)
                          ? 'text-green-deep bg-green-light font-semibold'
                          : 'text-gray-700 hover:text-green-deep hover:bg-neutral-gray'
                      }`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-base font-roboto transition-colors duration-300 ${
                        isActive(item.path)
                          ? 'text-green-deep bg-green-light font-semibold'
                          : 'text-gray-700 hover:text-green-deep hover:bg-neutral-gray'
                      }`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  )
                ))}
                
                {isLoggedIn ? (
                  <div className="space-y-2 pt-4 border-t">
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-light text-green-deep rounded-md font-semibold"
                    >
                      {supabaseUser ? <User size={16} /> : userType === 'professional' ? <User size={16} /> : <Building2 size={16} />}
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-red-600 w-full text-left font-semibold"
                    >
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        setIsLoginModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="block px-3 py-2 text-green-deep font-roboto font-semibold w-full text-left"
                    >
                      Entrar
                    </button>
                    <button
                      onClick={() => {
                        setIsCadastroEmpresaOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-light text-green-deep rounded-md font-roboto font-semibold w-full text-left"
                    >
                      <Building2 size={16} />
                      <span>Cadastrar Empresa</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsCadastroProfissionalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-light text-green-deep rounded-md font-roboto font-semibold w-full text-left"
                    >
                      <User size={16} />
                      <span>Cadastrar Profissional</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modals */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onOpenCadastroEmpresa={() => {
          setIsLoginModalOpen(false);
          setIsCadastroEmpresaOpen(true);
        }}
        onOpenCadastroProfissional={() => {
          setIsLoginModalOpen(false);
          setIsCadastroProfissionalOpen(true);
        }}
      />
      <CadastroEmpresaModal 
        isOpen={isCadastroEmpresaOpen} 
        onClose={() => setIsCadastroEmpresaOpen(false)} 
      />
      <CadastroProfissionalModal 
        isOpen={isCadastroProfissionalOpen} 
        onClose={() => setIsCadastroProfissionalOpen(false)} 
      />
    </>
  );
};

export default Header;