import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
}

interface TradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: Stock | null;
  tradeType: 'buy' | 'sell';
  balance: number;
  onTrade: (stockId: string, type: 'buy' | 'sell', quantity: number, price: number) => Promise<void>;
}

export const TradeDialog = ({ 
  isOpen, 
  onClose, 
  stock, 
  tradeType, 
  balance, 
  onTrade 
}: TradeDialogProps) => {
  const [quantity, setQuantity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!stock) return null;

  const totalCost = parseFloat(quantity) * stock.current_price || 0;
  const maxShares = Math.floor(balance / stock.current_price);

  const handleTrade = async () => {
    const qty = parseInt(quantity);
    
    if (!qty || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (tradeType === 'buy' && totalCost > balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough balance for this trade",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onTrade(stock.id, tradeType, qty, stock.current_price);
      toast({
        title: "Trade executed",
        description: `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${qty} shares of ${stock.symbol}`,
      });
      onClose();
      setQuantity('');
    } catch (error) {
      toast({
        title: "Trade failed",
        description: error instanceof Error ? error.message : "Failed to execute trade",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    if (tradeType === 'buy') {
      setQuantity(maxShares.toString());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tradeType === 'buy' ? (
              <ArrowUpIcon className="w-5 h-5 text-gain" />
            ) : (
              <ArrowDownIcon className="w-5 h-5 text-loss" />
            )}
            {tradeType === 'buy' ? 'Buy' : 'Sell'} {stock.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Stock</Label>
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="font-bold text-foreground">{stock.symbol}</p>
              <p className="text-sm text-muted-foreground">{stock.name}</p>
              <p className="text-lg font-bold text-foreground mt-1">
                ${stock.current_price.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quantity" className="text-sm font-medium text-foreground">
                Quantity
              </Label>
              {tradeType === 'buy' && maxShares > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMaxClick}
                  className="h-auto py-1 px-2 text-xs"
                >
                  Max: {maxShares}
                </Button>
              )}
            </div>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="bg-background/50 border-border/50"
            />
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price per share:</span>
              <span className="text-sm font-medium text-foreground">
                ${stock.current_price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Quantity:</span>
              <span className="text-sm font-medium text-foreground">
                {quantity || 0} shares
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-foreground">Total:</span>
              <span className={cn(
                "text-lg",
                tradeType === 'buy' ? "text-loss" : "text-gain"
              )}>
                ${totalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available balance:</span>
              <span className="text-foreground font-medium">${balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTrade}
              disabled={isLoading || !quantity || (tradeType === 'buy' && totalCost > balance)}
              className={cn(
                "flex-1 font-medium",
                tradeType === 'buy' 
                  ? "bg-gain hover:bg-gain/80 text-gain-foreground"
                  : "bg-loss hover:bg-loss/80 text-loss-foreground"
              )}
            >
              {isLoading ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};