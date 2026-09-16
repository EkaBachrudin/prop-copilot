import { Navigate, Route, Routes } from 'react-router-dom';
import { DocumentTitle } from './components/DocumentTitle';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { LeadsPage } from './pages/LeadsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { WhatsAppSettingsPage } from './pages/WhatsAppSettingsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/conversations/:id" element={<ConversationsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/whatsapp" element={<WhatsAppSettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/properties" replace />} />
        <Route path="*" element={<Navigate to="/properties" replace />} />
      </Routes>
    </>
  );
}
