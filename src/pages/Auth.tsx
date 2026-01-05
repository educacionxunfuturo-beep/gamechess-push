import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

const Auth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // This page just redirects - the actual auth UI is in ConnectModal
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Redirigiendo...
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Auth;
