import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ProfessionalAreaNav, { professionalAreaPaths } from './ProfessionalAreaNav';
import CompanyAreaNav from './CompanyAreaNav';
import { isCompanyAreaPath } from './companyMenu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isProfessionalArea = professionalAreaPaths.includes(location.pathname);
  const isCompanyArea = isCompanyAreaPath(location.pathname);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {isProfessionalArea && <ProfessionalAreaNav />}
      {isCompanyArea && <CompanyAreaNav />}
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
