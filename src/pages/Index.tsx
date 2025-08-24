import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthPage } from "@/components/AuthPage";
import { TradingDashboard } from "@/components/TradingDashboard";
import { RefreshCwIcon } from "lucide-react";
import type { User, Session } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Start price simulation
    const startPriceSimulation = () => {
      // Call price simulator every 3-5 seconds for realistic updates
      const interval = setInterval(async () => {
        try {
          await supabase.functions.invoke('price-simulator');
        } catch (error) {
          console.error('Price simulation error:', error);
        }
      }, 3000 + Math.random() * 2000); // 3-5 seconds

      return interval;
    };

    const simulationInterval = startPriceSimulation();

    return () => {
      subscription.unsubscribe();
      clearInterval(simulationInterval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCwIcon className="w-6 h-6 animate-spin text-primary" />
          <span className="text-foreground">Loading StockyTrader...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <TradingDashboard user={user} />;
};

export default Index;
