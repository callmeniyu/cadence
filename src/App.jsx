import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import './styles/tokens.css';
import './styles/base.css';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
