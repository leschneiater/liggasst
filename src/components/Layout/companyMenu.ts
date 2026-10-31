import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  FileText,
  BarChart3,
  GraduationCap,
  Building2,
  Crown
} from 'lucide-react';

export interface CompanyMenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const companyMenuItems: CompanyMenuItem[] = [
  { path: '/dashboard-empresa', label: 'Painel', icon: LayoutDashboard },
  { path: '/busca-profissionais-empresa', label: 'Buscar Profissionais', icon: Search },
  { path: '/mensagens-empresa', label: 'Mensagens', icon: MessageSquare },
  { path: '/contratos-empresa', label: 'Contratos', icon: FileText },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/treinamentos-empresa', label: 'Treinamentos', icon: GraduationCap },
  { path: '/perfil-empresa', label: 'Perfil', icon: Building2 },
  { path: '/assinatura-empresa', label: 'Assinatura', icon: Crown },
];

export const companyAreaPaths: string[] = companyMenuItems.map((item) => item.path);

// Rotas da area empresa fora do menu (ex.: edicao de demanda) tambem levam
// o menu fixo, para a empresa nao perder a navegacao ao editar.
export const isCompanyAreaPath = (pathname: string): boolean =>
  companyAreaPaths.includes(pathname) || pathname.startsWith('/editar-demanda/');
