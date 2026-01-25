import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useContacts, useDeleteContact, Contact } from "@/hooks/useContacts";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ContactForm } from "@/components/contacts/ContactForm";
import { EmptyContactsState } from "@/components/contacts/EmptyContactsState";
import { toast } from "@/hooks/use-toast";

const Contacts = () => {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const deleteContact = useDeleteContact();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const handleAddContact = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    
    try {
      await deleteContact.mutateAsync(deletingContact.id);
      toast({ title: "Contact deleted" });
      setDeletingContact(null);
    } catch (error) {
      toast({
        title: "Failed to delete contact",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Saved Contacts</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddContact}
            className="gap-1 text-primary"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyContactsState onAddContact={handleAddContact} />
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEditContact}
                onDelete={setDeletingContact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingContact} onOpenChange={() => setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingContact?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContact.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;
