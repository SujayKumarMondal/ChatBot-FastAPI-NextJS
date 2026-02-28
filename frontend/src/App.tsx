import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignIn";
import OAuthCallback from "./pages/OAuthCallback";
import { AboutPage } from "./pages/AboutPage";
import RegisterPage from "./pages/RegisterPage";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import PageTransition from "./components/PageTransition";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth routes */}
              <Route path="/signin" element={<PageTransition><SignInPage /></PageTransition>} />
              <Route path="/oauth-callback" element={<PageTransition><OAuthCallback /></PageTransition>} />
              <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
              <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
              <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
              <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
              {/* Settings & Profile routes */}
              <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
              <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
              {/* App layout */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<PageTransition><HomePage /></PageTransition>} />
                <Route path="chats/:chat_uid" element={<PageTransition><HomePage /></PageTransition>} />
                <Route path="chats/new" element={<PageTransition><HomePage /></PageTransition>} />
                <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
                <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
