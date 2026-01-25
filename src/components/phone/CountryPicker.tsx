import { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_COUNTRIES, POPULAR_COUNTRIES, Country } from "@/config/countries";

interface CountryPickerProps {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
}

export const CountryPicker = ({ selectedCountry, onSelect }: CountryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return ALL_COUNTRIES;
    
    const query = search.toLowerCase().trim();
    return ALL_COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [search]);

  // Filter popular countries based on search
  const filteredPopular = useMemo(() => {
    if (!search.trim()) return POPULAR_COUNTRIES;
    
    const query = search.toLowerCase().trim();
    return POPULAR_COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [search]);

  const handleSelect = (country: Country) => {
    onSelect(country);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 h-10 border-r-0 rounded-r-none shrink-0"
      >
        <span className="text-lg leading-none">{selectedCountry.flag}</span>
        <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle>Select Country</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-2">
              {/* Popular Countries */}
              {filteredPopular.length > 0 && !search.trim() && (
                <>
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Popular
                  </p>
                  {filteredPopular.map((country) => (
                    <CountryRow
                      key={`popular-${country.code}`}
                      country={country}
                      isSelected={selectedCountry.code === country.code}
                      onSelect={handleSelect}
                    />
                  ))}
                  <div className="my-2 border-t border-border" />
                </>
              )}

              {/* All Countries */}
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {search.trim() ? "Results" : "All Countries"}
              </p>
              {filteredCountries.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No countries found
                </p>
              ) : (
                filteredCountries.map((country) => (
                  <CountryRow
                    key={country.code}
                    country={country}
                    isSelected={selectedCountry.code === country.code}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface CountryRowProps {
  country: Country;
  isSelected: boolean;
  onSelect: (country: Country) => void;
}

const CountryRow = ({ country, isSelected, onSelect }: CountryRowProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-left ${
        isSelected
          ? "bg-primary/10 text-primary"
          : "hover:bg-secondary"
      }`}
    >
      <span className="text-xl leading-none">{country.flag}</span>
      <span className="flex-1 font-medium text-sm truncate">{country.name}</span>
      <span className="text-sm text-muted-foreground">{country.dialCode}</span>
    </button>
  );
};
