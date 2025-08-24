import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  previous_close: number;
}

interface StockCardProps {
  stock: Stock;
  onTrade: (stock: Stock, type: 'buy' | 'sell') => void;
}

export const StockCard = ({ stock, onTrade }: StockCardProps) => {
  const priceChange = stock.current_price - stock.previous_close;
  const percentageChange = (priceChange / stock.previous_close) * 100;
  const isPositive = priceChange >= 0;
  const isNeutral = priceChange === 0;

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{stock.symbol}</h3>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
            {stock.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            ${stock.current_price.toFixed(2)}
          </p>
          <div 
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isNeutral ? "text-neutral" :
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {!isNeutral && (
              isPositive ? 
                <ArrowUpIcon className="w-4 h-4" /> : 
                <ArrowDownIcon className="w-4 h-4" />
            )}
            <span>
              {isPositive ? '+' : ''}${priceChange.toFixed(2)} ({isPositive ? '+' : ''}{percentageChange.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={() => onTrade(stock, 'buy')}
          className="flex-1 bg-gain hover:bg-gain/80 text-gain-foreground font-medium"
        >
          Buy
        </Button>
        <Button 
          onClick={() => onTrade(stock, 'sell')}
          variant="outline"
          className="flex-1 border-loss/50 text-loss hover:bg-loss/10"
        >
          Sell
        </Button>
      </div>
    </Card>
  );
};