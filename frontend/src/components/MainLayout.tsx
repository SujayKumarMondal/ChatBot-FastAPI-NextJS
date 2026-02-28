import { Outlet } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { SidebarProvider} from "./ui/sidebar"
import Navbar from "./Navbar"
import { useEffect } from "react"

const MainLayout = () => {
  useEffect(() => {
    // Initialize data attributes from localStorage
    const root = document.documentElement;
    const fontSize = localStorage.getItem("fontSize") || "base";
    const messageDensity = localStorage.getItem("messageDensity") || "comfortable";
    
    root.setAttribute("data-font-size", fontSize);
    root.setAttribute("data-message-density", messageDensity);
  }, []);

  return (
     <SidebarProvider>
      <AppSidebar />
      <main className="w-full h-screen flex flex-col bg-gradient-to-br from-background via-background to-secondary/5">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          {<Outlet />}
        </div>
      </main>
    </SidebarProvider>
  )
}

export default MainLayout