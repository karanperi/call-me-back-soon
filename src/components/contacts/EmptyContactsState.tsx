import { BookUser } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyContactsStateProps {
  onAddContact: () => void;
  isFirstContact?: boolean;
}

export const EmptyContactsState = ({ onAddContact, isFirstContact = true }: EmptyContactsStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <BookUser className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        No saved contacts yet
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Save your frequently contacted people for quicker reminder creation
      </p>
      <Button onClick={onAddContact} className="gap-2">
        + {isFirstContact ? "Add Your First Contact" : "Add New Contact"}
      </Button>
    </div>
  );
};
