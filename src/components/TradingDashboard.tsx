import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StockCard } from "./StockCard";
import { Portfolio } from "./Portfolio";
import { TradeDialog } from "./TradeDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOutIcon, RefreshCwIcon, TrendingUpIcon } from "lucide-react";
import type { User } from '@supabase/supabase-js';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  previous_close: number;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  balance: number;
}

interface Holding {
  id: string;
  stock: Stock;
  total_quantity: number;
  average_cost: number;
}

interface TradingDashboardProps {
  user: User;
}

export const TradingDashboard = ({ user }: TradingDashboardProps) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, [user]);

  const loadData = async () => {
    try {
      // Load stocks
      const { data: stocksData, error: stocksError } = await supabase
        .from('stocks')
        .select('*')
        .order('symbol');

      if (stocksError) throw stocksError;
      setStocks(stocksData || []);

      // Load or create profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Create profile if doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, display_name: user.email?.split('@')[0] })
          .select()
          .single();
        
        if (createError) throw createError;
        profileData = newProfile;
      } else if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      // Load holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          *,
          stock:stocks(*)
        `)
        .eq('user_id', user.id)
        .gt('total_quantity', 0);

      if (holdingsError) throw holdingsError;
      setHoldings(holdingsData || []);

    } catch (error) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('stock-price-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stocks'
        },
        (payload) => {
          const updatedStock = payload.new as Stock;
          setStocks(prev => prev.map(stock => 
            stock.id === updatedStock.id ? updatedStock : stock
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTrade = (stock: Stock, type: 'buy' | 'sell') => {
    setSelectedStock(stock);
    setTradeType(type);
    setIsTradeDialogOpen(true);
  };

  const executeTrade = async (stockId: string, type: 'buy' | 'sell', quantity: number, price: number) => {
    if (!profile) return;

    const totalAmount = quantity * price;

    try {
      if (type === 'buy') {
        // Check balance
        if (totalAmount > profile.balance) {
          throw new Error('Insufficient funds');
        }

        // Update balance
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: profile.balance - totalAmount })
          .eq('user_id', user.id);

        if (balanceError) throw balanceError;

        // Update or create holding using FIFO
        const { data: existingHolding } = await supabase
          .from('holdings')
          .select('*')
          .eq('user_id', user.id)
          .eq('stock_id', stockId)
          .single();

        if (existingHolding) {
          const newQuantity = existingHolding.total_quantity + quantity;
          const newAverageCost = ((existingHolding.average_cost * existingHolding.total_quantity) + totalAmount) / newQuantity;

          const { error: holdingError } = await supabase
            .from('holdings')
            .update({
              total_quantity: newQuantity,
              average_cost: newAverageCost
            })
            .eq('id', existingHolding.id);

          if (holdingError) throw holdingError;
        } else {
          const { error: holdingError } = await supabase
            .from('holdings')
            .insert({
              user_id: user.id,
              stock_id: stockId,
              total_quantity: quantity,
              average_cost: price
            });

          if (holdingError) throw holdingError;
        }
      } else {
        // For sell orders, check if user has enough shares
        const { data: holding } = await supabase
          .from('holdings')
          .select('*')
          .eq('user_id', user.id)
          .eq('stock_id', stockId)
          .single();

        if (!holding || holding.total_quantity < quantity) {
          throw new Error('Insufficient shares');
        }

        // Update balance (add proceeds)
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: profile.balance + totalAmount })
          .eq('user_id', user.id);

        if (balanceError) throw balanceError;

        // Update holding
        const newQuantity = holding.total_quantity - quantity;
        if (newQuantity > 0) {
          const { error: holdingError } = await supabase
            .from('holdings')
            .update({ total_quantity: newQuantity })
            .eq('id', holding.id);

          if (holdingError) throw holdingError;
        } else {
          const { error: holdingError } = await supabase
            .from('holdings')
            .delete()
            .eq('id', holding.id);

          if (holdingError) throw holdingError;
        }
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          stock_id: stockId,
          type,
          quantity,
          price,
          total_amount: totalAmount
        });

      if (transactionError) throw transactionError;

      // Reload data
      await loadData();

    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCwIcon className="w-6 h-6 animate-spin text-primary" />
          <span className="text-foreground">Loading your portfolio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <TrendingUpIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">StockyTrader</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.display_name || user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOutIcon className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="markets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="markets">Markets</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="markets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onTrade={handleTrade}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <Portfolio 
              holdings={holdings} 
              balance={profile?.balance || 0} 
            />
          </TabsContent>
        </Tabs>
      </main>

      <TradeDialog
        isOpen={isTradeDialogOpen}
        onClose={() => setIsTradeDialogOpen(false)}
        stock={selectedStock}
        tradeType={tradeType}
        balance={profile?.balance || 0}
        onTrade={executeTrade}
      />
    </div>
  );
};