import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Flag } from 'lucide-react';

const menuItems = [
  { path: '/admin', label: 'Painel', icon: LayoutDashboard },
  { path: '/admin/denuncias', label: 'Denúncias', icon: Flag },
];

const AdminAreaNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm"
      aria-label="Menu da administração"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center space-x-2 px-3 py-3 text-sm font-roboto font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${
                  isActive
                    ? 'border-green-deep text-green-deep'
                    : 'border-transparent text-gray-600 hover:text-green-deep hover:border-green-medium'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default AdminAreaNav;
