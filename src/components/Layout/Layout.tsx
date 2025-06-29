import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import SupabaseTest from '../SupabaseTest';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <SupabaseTest />
    </div>
  );
};

export default Layout;