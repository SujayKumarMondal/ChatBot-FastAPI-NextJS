import { useSessionTimeout } from "@/context/SessionTimeoutContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";

export default function SessionWarningModal() {
  const { isWarningVisible, dismissWarning, extendSession, timeRemaining } = useSessionTimeout();

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <AnimatePresence>
      {isWarningVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissWarning}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-lg border border-border bg-card shadow-2xl">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-destructive/20 to-orange-500/20 border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </motion.div>
                  <h2 className="text-lg font-semibold">Session Timeout Warning</h2>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <p className="mb-6 text-sm text-muted-foreground">
                  Your session will expire due to inactivity. Click below to continue your session.
                </p>

                {/* Timer Display */}
                <motion.div
                  className="mb-6 rounded-lg bg-destructive/10 p-4 text-center"
                  animate={{ scale: timeRemaining < 60 ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 0.6, repeat: timeRemaining < 60 ? Infinity : 0 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Time Remaining
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-foreground tabular-nums">
                    {minutes}:{seconds.toString().padStart(2, "0")}
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={dismissWarning}
                    className="flex-1"
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={extendSession}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  >
                    Stay Logged In
                  </Button>
                </div>
              </div>

              {/* Footer Info */}
              <div className="border-t border-border bg-muted/30 px-6 py-3">
                <p className="text-xs text-muted-foreground">
                  You will be automatically logged out when the timer reaches zero.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
