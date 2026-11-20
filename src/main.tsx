import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { I18nProvider } from './lib/i18n.tsx';
import { ToastProvider } from './components/Toast.tsx';
import './styles/base.css';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </I18nProvider>,
);
