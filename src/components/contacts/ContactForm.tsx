import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateContact, useUpdateContact, Contact } from "@/hooks/useContacts";
import { toast } from "@/hooks/use-toast";

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

export const ContactForm = ({ open, onOpenChange, contact }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  
  const isEditing = !!contact;

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhoneNumber(contact.phone_number);
    } else {
      setName("");
      setPhoneNumber("");
    }
  }, [contact, open]);

  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "");
    
    // Convert UK formats to E.164
    if (cleaned.startsWith("07")) {
      cleaned = "+44" + cleaned.substring(1);
    } else if (cleaned.startsWith("447")) {
      cleaned = "+" + cleaned;
    }
    
    return cleaned;
  };

  const validateForm = (): boolean => {
    if (!name.trim() || name.trim().length < 2) {
      toast({
        title: "Invalid name",
        description: "Name must be at least 2 characters",
        variant: "destructive",
      });
      return false;
    }

    const ukPhoneRegex = /^(\+44|0)7\d{9}$/;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!ukPhoneRegex.test(normalizedPhone) && !ukPhoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid UK phone number",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    try {
      if (isEditing && contact) {
        await updateContact.mutateAsync({
          id: contact.id,
          name: name.trim(),
          phone_number: normalizedPhone,
        });
        toast({ title: "Contact updated successfully" });
      } else {
        await createContact.mutateAsync({
          name: name.trim(),
          phone_number: normalizedPhone,
        });
        toast({ title: "Contact saved successfully" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: isEditing ? "Failed to update contact" : "Failed to save contact",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{isEditing ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              placeholder="e.g. Grandma Jane"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone Number</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="+44 7700 000 000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
