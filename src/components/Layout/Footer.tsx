import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Shield, Award, Users } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-green-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-green-light rounded-lg flex items-center justify-center">
                <span className="text-green-deep font-bold text-lg">L</span>
              </div>
              <span className="font-poppins font-bold text-2xl">LiggaSST</span>
            </div>
            <p className="font-roboto text-green-light mb-6 max-w-md">
              Conectando empresas com profissionais qualificados de Segurança do Trabalho em todo o Brasil. 
              Sua parceria segura e confiável para um ambiente de trabalho mais seguro.
            </p>
            
            {/* Trust Badges */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2 bg-green-medium bg-opacity-30 px-3 py-2 rounded-lg">
                <Shield size={16} className="text-green-light" />
                <span className="text-xs font-roboto text-green-light">LGPD Compliant</span>
              </div>
              <div className="flex items-center space-x-2 bg-green-medium bg-opacity-30 px-3 py-2 rounded-lg">
                <Award size={16} className="text-green-light" />
                <span className="text-xs font-roboto text-green-light">Verificado</span>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="text-green-light hover:text-white transition-colors duration-200 p-2 bg-green-medium bg-opacity-30 rounded-lg hover:bg-opacity-50">
                <Facebook size={20} fill="currentColor" />
              </a>
              <a href="#" className="text-green-light hover:text-white transition-colors duration-200 p-2 bg-green-medium bg-opacity-30 rounded-lg hover:bg-opacity-50">
                <Instagram size={20} fill="currentColor" />
              </a>
              <a href="#" className="text-green-light hover:text-white transition-colors duration-200 p-2 bg-green-medium bg-opacity-30 rounded-lg hover:bg-opacity-50">
                <Linkedin size={20} fill="currentColor" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-poppins font-semibold text-lg mb-4">Links Rápidos</h3>
            <ul className="space-y-3 font-roboto">
              <li>
                <Link to="/como-funciona" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Como Funciona
                </Link>
              </li>
              <li>
                <Link to="/planos" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Planos
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/sobre-cache" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Sobre Cache
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/dashboard-profissional" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Dashboard Profissional
                </Link>
              </li>
              <li>
                <Link to="/dashboard-empresa" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Dashboard Empresa
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-green-light hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-green-light rounded-full mr-2 group-hover:bg-white transition-colors duration-200"></span>
                  Dashboard Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-poppins font-semibold text-lg mb-4">Contato</h3>
            <div className="space-y-4 font-roboto">
              <div className="flex items-start space-x-3">
                <Mail size={16} className="text-green-light mt-1 flex-shrink-0" />
                <div>
                  <p className="text-green-light text-sm">E-mail</p>
                  <a href="mailto:contato@liggasst.com.br" className="text-white hover:text-green-light transition-colors duration-200">
                    contato@liggasst.com.br
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone size={16} className="text-green-light mt-1 flex-shrink-0" />
                <div>
                  <p className="text-green-light text-sm">Telefone</p>
                  <a href="tel:+5511999999999" className="text-white hover:text-green-light transition-colors duration-200">
                    (11) 99999-9999
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin size={16} className="text-green-light mt-1 flex-shrink-0" />
                <div>
                  <p className="text-green-light text-sm">Localização</p>
                  <span className="text-white">São Paulo, SP - Brasil</span>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-6 p-4 bg-green-medium bg-opacity-30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users size={16} className="text-green-light" />
                <span className="text-green-light text-sm font-roboto">Comunidade Ativa</span>
              </div>
              <p className="text-white font-poppins font-semibold">5.000+ Profissionais</p>
              <p className="text-white font-poppins font-semibold">2.500+ Empresas</p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-green-medium mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="font-roboto text-green-light text-sm">
              © 2025 LiggaSST. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link 
                to="/termos-de-uso" 
                className="font-roboto text-green-light hover:text-white text-sm transition-colors duration-200"
              >
                Termos de Uso
              </Link>
              <Link 
                to="/politica-de-privacidade" 
                className="font-roboto text-green-light hover:text-white text-sm transition-colors duration-200"
              >
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;