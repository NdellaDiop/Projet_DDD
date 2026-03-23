import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface AdvancedSearchProps {
  configs: FilterConfig[];
  onSearch: (filters: Record<string, string | number>) => void;
  className?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ configs, onSearch, className }) => {
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    // Filtrer les valeurs vides
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    onSearch(activeFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilters({});
    onSearch({});
    setIsOpen(false);
  };

  const activeCount = Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className} ${activeCount > 0 ? 'border-primary text-primary bg-primary/5' : ''}`}>
          <Filter className="w-4 h-4" />
          Filtres avancés
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-white">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">Filtres</h4>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive" onClick={handleReset}>
                Réinitialiser
              </Button>
            )}
          </div>
          <div className="grid gap-4">
            {configs.map((config) => (
              <div key={config.key} className="grid gap-2">
                <Label htmlFor={config.key} className="text-xs font-medium text-muted-foreground">
                  {config.label}
                </Label>
                
                {config.type === 'text' && (
                  <Input
                    id={config.key}
                    placeholder={config.placeholder || config.label}
                    value={filters[config.key] || ''}
                    onChange={(e) => handleChange(config.key, e.target.value)}
                    className="h-8"
                  />
                )}

                {config.type === 'number' && (
                  <Input
                    id={config.key}
                    type="number"
                    placeholder={config.placeholder || config.label}
                    value={filters[config.key] || ''}
                    onChange={(e) => handleChange(config.key, e.target.value)}
                    className="h-8"
                  />
                )}

                {config.type === 'date' && (
                  <Input
                    id={config.key}
                    type="date"
                    value={filters[config.key] || ''}
                    onChange={(e) => handleChange(config.key, e.target.value)}
                    className="h-8"
                  />
                )}

                {config.type === 'select' && config.options && (
                  <Select
                    value={filters[config.key] || ''}
                    onValueChange={(val) => handleChange(config.key, val)}
                  >
                    <SelectTrigger id={config.key} className="h-8">
                      <SelectValue placeholder={config.placeholder || "Sélectionner..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {config.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleApply} className="w-full">
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdvancedSearch;
