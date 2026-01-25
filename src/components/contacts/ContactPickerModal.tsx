import { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContacts, Contact } from "@/hooks/useContacts";
import { EmptyContactsState } from "./EmptyContactsState";
import { ContactForm } from "./ContactForm";
import { formatPhoneForDisplay } from "@/lib/phoneUtils";

interface ContactPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (contact: Contact) => void;
}

export const ContactPickerModal = ({ open, onOpenChange, onSelect }: ContactPickerModalProps) => {
  const { data: contacts = [], isLoading } = useContacts();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSelectContact = (contact: Contact) => {
    onSelect(contact);
    onOpenChange(false);
  };

  const handleAddContact = () => {
    setShowAddForm(true);
  };

  if (showAddForm) {
    return (
      <ContactForm 
        open={showAddForm} 
        onOpenChange={(open) => {
          setShowAddForm(open);
          if (!open) {
            // Stay on picker modal after adding
          }
        }} 
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Contact</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyContactsState onAddContact={handleAddContact} />
        ) : (
          <div className="flex flex-col gap-4">
            <ScrollArea className="max-h-[300px] -mx-2 px-2">
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPhoneForDisplay(contact.phone_number)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <Button 
              variant="outline" 
              onClick={handleAddContact}
              className="w-full gap-2"
            >
              + Add New Contact
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
