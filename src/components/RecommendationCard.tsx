import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface RecommendationCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  saveAmount: string;
  goals: { id: string; name: string }[];
  onSave: (goalId: string) => void;
  onDismiss: () => void;
  hideActions?: boolean;
}

export const RecommendationCard = ({
  icon: Icon,
  title,
  description,
  saveAmount,
  goals,
  onSave,
  onDismiss,
  hideActions = false,
}: RecommendationCardProps) => {
  const [selectedGoal, setSelectedGoal] = useState<string>(goals[0]?.id || "");

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {!hideActions && (
        <>
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">Save to Goal:</label>
            <Select value={selectedGoal} onValueChange={setSelectedGoal}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onSave(selectedGoal)} className="flex-1">
              Save {saveAmount}
            </Button>
            <Button onClick={onDismiss} variant="secondary" className="flex-1">
              Dismiss
            </Button>
          </div>
        </>
      )}
      {hideActions && (
        <div className="flex justify-end">
          <Button onClick={onDismiss} variant="ghost" size="sm">
            Dismiss
          </Button>
        </div>
      )}
    </Card>
  );
};
