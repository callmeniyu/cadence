import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './queryClient';
import { ToastProvider } from '../components/common/Toast';
import { AuthProvider } from '../features/auth/AuthContext';
import { BusinessProvider } from '../features/business/BusinessContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <BusinessProvider>
                {children}
              </BusinessProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
