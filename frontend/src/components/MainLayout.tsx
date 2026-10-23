import { Outlet } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { SidebarProvider} from "./ui/sidebar"
import Navbar from "./Navbar"
import { useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { MotionConfig } from "framer-motion"

const MainLayout = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize data attributes from localStorage
    const root = document.documentElement;
    const fontSize = localStorage.getItem("fontSize") || "base";
    const messageDensity = localStorage.getItem("messageDensity") || "comfortable";
    
    root.setAttribute("data-font-size", fontSize);
    root.setAttribute("data-message-density", messageDensity);
  }, []);

  if (!user) {
    return (
      <MotionConfig reducedMotion="user">
        <main className="app-canvas flex min-h-screen w-full flex-col">
          <Navbar />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <SidebarProvider>
        <AppSidebar />
        <main className="app-canvas flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>
      </SidebarProvider>
    </MotionConfig>
  )
}

export default MainLayout