import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactPickerModal } from "./ContactPickerModal";
import { Contact } from "@/hooks/useContacts";

interface ContactPickerIconProps {
  onSelect: (name: string, phoneNumber: string) => void;
}

export const ContactPickerIcon = ({ onSelect }: ContactPickerIconProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (contact: Contact) => {
    onSelect(contact.name, contact.phone_number);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        title="Select from saved contacts"
      >
        <Users className="h-4 w-4" />
      </Button>
      
      <ContactPickerModal
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
      />
    </>
  );
};
