import { useState, useEffect } from "react";
import { MessageSquare, Clock, Zap, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { getApiBaseUrl } from "@/lib/config";

const API_BASE_URL = getApiBaseUrl();

interface DashboardStats {
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  streakDays: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const numberVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5 },
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayedValues, setDisplayedValues] = useState({
    totalChats: 0,
    totalMessages: 0,
    streakDays: 0,
  });

  useEffect(() => {
    // Fetch real chat statistics
    const fetchStats = async () => {
      try {
        const token = sessionStorage.getItem("access_token");
        if (!token) {
          setLoading(false);
          return;
        }

        // Get all chats (large limit to get everything)
        const chatsResponse = await fetch(
          `${API_BASE_URL}/api/chats?skip=0&limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json();
          const totalChats = chatsData.total || 0;

          // Calculate total messages
          let totalMessages = 0;
          if (chatsData.data && Array.isArray(chatsData.data)) {
            totalMessages = chatsData.data.reduce(
              (sum: number, chat: any) => sum + (chat.message_count || 0),
              0
            );
          }

          const mockStats: DashboardStats = {
            totalChats,
            totalMessages,
            avgResponseTime: 1.2,
            streakDays: 7,
          };

          setStats(mockStats);
          setLoading(false);

          // Animate counter numbers
          const interval = setInterval(() => {
            setDisplayedValues((prev) => ({
              totalChats: Math.min(prev.totalChats + 2, mockStats.totalChats),
              totalMessages: Math.min(
                prev.totalMessages + 5,
                mockStats.totalMessages
              ),
              streakDays: Math.min(prev.streakDays + 1, mockStats.streakDays),
            }));
          }, 50);

          return () => clearInterval(interval);
        } else {
          // Fallback to mock data if API fails
          const mockStats: DashboardStats = {
            totalChats: 0,
            totalMessages: 0,
            avgResponseTime: 1.2,
            streakDays: 0,
          };
          setStats(mockStats);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Fallback to empty stats
        setStats({
          totalChats: 0,
          totalMessages: 0,
          avgResponseTime: 1.2,
          streakDays: 0,
        });
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8 p-6 md:p-8 bg-gradient-to-br from-background via-background to-primary/5 animate-gradient-shift"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Welcome back, {user?.username}! 👋
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Here's your activity overview
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatsCard
            icon={<MessageSquare className="h-6 w-6" />}
            label="Total Chats"
            value={displayedValues.totalChats}
            subtext="All conversations"
            color="from-primary to-primary/60"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            icon={<Zap className="h-6 w-6" />}
            label="Total Messages"
            value={displayedValues.totalMessages}
            subtext="In all chats"
            color="from-accent to-accent/60"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            icon={<Clock className="h-6 w-6" />}
            label="Avg Response"
            value={`${stats.avgResponseTime}s`}
            subtext="Response time"
            color="from-blue-500 to-blue-400"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            icon={<TrendingUp className="h-6 w-6" />}
            label="Current Streak"
            value={`${displayedValues.streakDays} days`}
            subtext="Keep it going!"
            color="from-green-500 to-green-400"
          />
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30 rounded-2xl p-6 shadow-lg shadow-secondary/10 animate-gradient-flow"
        variants={itemVariants}
      >
        <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
          ✨ Quick Actions
        </h3>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <QuickAction
              label="New Chat"
              icon="➕"
              color="bg-gradient-to-br from-primary/40 to-primary/20"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <QuickAction
              label="View History"
              icon="📜"
              color="bg-gradient-to-br from-blue-500/40 to-blue-400/20"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <QuickAction
              label="Export Chats"
              icon="📥"
              color="bg-gradient-to-br from-green-500/40 to-green-400/20"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <QuickAction
              label="Settings"
              icon="⚙️"
              color="bg-gradient-to-br from-purple-500/40 to-purple-400/20"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function StatsCard({ icon, label, value, subtext, color }: any) {
  return (
    <motion.div
      className={`bg-gradient-to-br ${color} border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 hover:-translate-y-1 backdrop-blur-sm`}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-white/80 animate-bounce-soft">{icon}</div>
        <TrendingUp className="h-4 w-4 text-green-300" />
      </div>
      <div>
        <p className="text-sm text-white/70 font-medium">{label}</p>
        <motion.p
          className="text-3xl font-bold text-white mt-2 animate-number-count"
          variants={numberVariants}
        >
          {value}
        </motion.p>
        <p className="text-xs text-white/60 mt-1">{subtext}</p>
      </div>
    </motion.div>
  );
}

function QuickAction({ label, icon, color }: any) {
  return (
    <motion.button
      className={`${color} border border-white/20 rounded-xl p-4 text-center hover:shadow-lg hover:border-white/40 transition-all transform backdrop-blur-sm group w-full`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="text-3xl mb-2 transition-transform group-hover:scale-125"
        whileHover={{ rotate: 10, scale: 1.2 }}
      >
        {icon}
      </motion.div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </motion.button>
  );
}

function DashboardSkeleton() {
  return (
    <motion.div
      className="space-y-8 p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="h-12 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl w-48 animate-shimmer-enhanced"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-6 h-32 animate-skeleton-pulse border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
      </div>
      <motion.div
        className="bg-gradient-to-br from-secondary/20 to-accent/20 rounded-2xl p-6 h-40 animate-shimmer-enhanced border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      />
    </motion.div>
  );
}
