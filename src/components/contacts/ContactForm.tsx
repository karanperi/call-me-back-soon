import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InternationalPhoneInput } from "@/components/phone/InternationalPhoneInput";
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
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  
  const isEditing = !!contact;

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhoneNumber(contact.phone_number);
      setIsPhoneValid(true); // Existing numbers are assumed valid
    } else {
      setName("");
      setPhoneNumber("");
      setIsPhoneValid(false);
    }
  }, [contact, open]);

  const handlePhoneChange = (e164Value: string, isValid: boolean) => {
    setPhoneNumber(e164Value);
    setIsPhoneValid(isValid);
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

    if (!isPhoneValid || !phoneNumber) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (isEditing && contact) {
        await updateContact.mutateAsync({
          id: contact.id,
          name: name.trim(),
          phone_number: phoneNumber, // Already in E.164 format
        });
        toast({ title: "Contact updated successfully" });
      } else {
        await createContact.mutateAsync({
          name: name.trim(),
          phone_number: phoneNumber, // Already in E.164 format
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

          <InternationalPhoneInput
            id="contact-phone"
            value={phoneNumber}
            onChange={handlePhoneChange}
            label="Phone Number"
            showCostEstimate={false}
          />

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
