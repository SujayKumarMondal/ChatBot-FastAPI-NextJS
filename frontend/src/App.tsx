import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import HomePage from "./pages/HomePage";
import OAuthCallback from "./pages/OAuthCallback";
import { AboutPage } from "./pages/AboutPage";
import { AuthProvider } from "./context/AuthContext";
import { SessionTimeoutProvider } from "./context/SessionTimeoutContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import PageTransition from "./components/PageTransition";
import SessionWarningModal from "./components/SessionWarningModal";


const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SessionTimeoutProvider>
            <BrowserRouter>
            <Routes>
              {/* Auth routes */}
              <Route path="/signin" element={<PageTransition><HomePage /></PageTransition>} />
              <Route path="/oauth-callback" element={<PageTransition><OAuthCallback /></PageTransition>} />
              <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
              {/* Settings & Profile routes */}
              <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
              <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
              {/* History Page */}
              <Route path="/history" element={<PageTransition><HistoryPage /></PageTransition>} />
              {/* App layout */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<PageTransition><HomePage /></PageTransition>} />
                <Route path="chats/:chat_uid" element={<PageTransition><HomePage /></PageTransition>} />
                <Route path="chats/new" element={<PageTransition><HomePage /></PageTransition>} />
                <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
                <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />
              </Route>
            </Routes>
            <SessionWarningModal />
          </BrowserRouter>
          </SessionTimeoutProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
