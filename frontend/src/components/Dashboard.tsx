import { useState, useEffect } from "react";
import { MessageSquare, Clock, Zap, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DashboardStats {
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  streakDays: number;
  weeklyActivity: { day: string; count: number }[];
  topicBreakdown: { topic: string; count: number }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard stats
    const mockStats: DashboardStats = {
      totalChats: 42,
      totalMessages: 287,
      avgResponseTime: 1.2,
      streakDays: 7,
      weeklyActivity: [
        { day: "Mon", count: 12 },
        { day: "Tue", count: 19 },
        { day: "Wed", count: 15 },
        { day: "Thu", count: 25 },
        { day: "Fri", count: 31 },
        { day: "Sat", count: 18 },
        { day: "Sun", count: 14 },
      ],
      topicBreakdown: [
        { topic: "Development", count: 85 },
        { topic: "Design", count: 45 },
        { topic: "Writing", count: 72 },
        { topic: "Other", count: 85 },
      ],
    };

    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 500);
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load dashboard</div>;
  }

  return (
    <div className="space-y-8 p-6 md:p-8 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="animate-slideIn">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Welcome back, {user?.username}! 👋
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Here's your activity overview for today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<MessageSquare className="h-6 w-6" />}
          label="Total Chats"
          value={stats.totalChats}
          subtext="All conversations"
          color="from-primary to-primary/60"
        />
        <StatsCard
          icon={<Zap className="h-6 w-6" />}
          label="Total Messages"
          value={stats.totalMessages}
          subtext="In all chats"
          color="from-accent to-accent/60"
        />
        <StatsCard
          icon={<Clock className="h-6 w-6" />}
          label="Avg Response"
          value={`${stats.avgResponseTime}s`}
          subtext="Response time"
          color="from-blue-500 to-blue-400"
        />
        <StatsCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Current Streak"
          value={`${stats.streakDays} days`}
          subtext="Keep it going!"
          color="from-green-500 to-green-400"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30 rounded-2xl p-6 shadow-lg shadow-secondary/10 animate-slideIn">
        <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
          ✨ Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction label="New Chat" icon="➕" color="bg-gradient-to-br from-primary/40 to-primary/20" />
          <QuickAction label="View History" icon="📜" color="bg-gradient-to-br from-blue-500/40 to-blue-400/20" />
          <QuickAction label="Export Chats" icon="📥" color="bg-gradient-to-br from-green-500/40 to-green-400/20" />
          <QuickAction label="Settings" icon="⚙️" color="bg-gradient-to-br from-purple-500/40 to-purple-400/20" />
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, subtext, color }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 hover:-translate-y-1 animate-slideIn backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-white/80">{icon}</div>
        <TrendingUp className="h-4 w-4 text-green-300" />
      </div>
      <div>
        <p className="text-sm text-white/70 font-medium">{label}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        <p className="text-xs text-white/60 mt-1">{subtext}</p>
      </div>
    </div>
  );
}

function QuickAction({ label, icon, color }: any) {
  return (
    <button
      className={`${color} border border-white/20 rounded-xl p-4 text-center hover:shadow-lg hover:border-white/40 transition-all transform hover:scale-105 backdrop-blur-sm group`}
    >
      <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">{icon}</div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="h-12 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl w-48 animate-shimmer" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-6 h-32 animate-shimmer border border-white/10" />
        ))}
      </div>
      <div className="bg-gradient-to-br from-secondary/20 to-accent/20 rounded-2xl p-6 h-40 animate-shimmer border border-white/10" />
    </div>
  );
}
