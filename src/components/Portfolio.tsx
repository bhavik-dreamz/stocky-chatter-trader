import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUpIcon, TrendingDownIcon, DollarSignIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Holding {
  id: string;
  stock: {
    symbol: string;
    name: string;
    current_price: number;
  };
  total_quantity: number;
  average_cost: number;
}

interface PortfolioProps {
  holdings: Holding[];
  balance: number;
}

export const Portfolio = ({ holdings, balance }: PortfolioProps) => {
  const totalValue = holdings.reduce((sum, holding) => {
    return sum + (holding.stock.current_price * holding.total_quantity);
  }, 0);

  const totalInvested = holdings.reduce((sum, holding) => {
    return sum + (holding.average_cost * holding.total_quantity);
  }, 0);

  const totalPnL = totalValue - totalInvested;
  const totalPnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSignIcon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Balance</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${balance.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Portfolio Value</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${totalValue.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSignIcon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Total Invested</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${totalInvested.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-2">
            {totalPnL >= 0 ? (
              <TrendingUpIcon className="w-5 h-5 text-gain" />
            ) : (
              <TrendingDownIcon className="w-5 h-5 text-loss" />
            )}
            <span className="text-sm font-medium text-muted-foreground">Total P&L</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            totalPnL >= 0 ? "text-gain" : "text-loss"
          )}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
          <p className={cn(
            "text-sm font-medium",
            totalPnL >= 0 ? "text-gain" : "text-loss"
          )}>
            {totalPnL >= 0 ? '+' : ''}{totalPnLPercentage.toFixed(2)}%
          </p>
        </Card>
      </div>

      {/* Holdings */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-bold text-foreground mb-4">Holdings</h3>
        {holdings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No holdings yet. Start trading to build your portfolio!
          </p>
        ) : (
          <div className="space-y-4">
            {holdings.map((holding) => {
              const currentValue = holding.stock.current_price * holding.total_quantity;
              const investedValue = holding.average_cost * holding.total_quantity;
              const pnl = currentValue - investedValue;
              const pnlPercentage = (pnl / investedValue) * 100;

              return (
                <div 
                  key={holding.id} 
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-foreground">{holding.stock.symbol}</h4>
                      <Badge variant="outline" className="text-xs">
                        {holding.total_quantity} shares
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{holding.stock.name}</p>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <p className="font-bold text-foreground">
                      ${currentValue.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avg: ${holding.average_cost.toFixed(2)}
                    </p>
                    <p className={cn(
                      "text-sm font-medium",
                      pnl >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};