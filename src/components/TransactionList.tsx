import { Card } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  vendor: string;
  amount: string;
  category: string;
  timestamp: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionList = ({ transactions, onEdit, onDelete }: TransactionListProps) => {

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between py-3 border-b last:border-b-0"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{transaction.vendor}</p>
              <p className="text-xs text-muted-foreground">
                {transaction.category} • {transaction.timestamp}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-sm">{transaction.amount}</p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(transaction)}
                  title="Edit transaction"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(transaction.id)}
                  title="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
