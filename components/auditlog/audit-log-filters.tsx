// components/auditlog/audit-log-filters.tsx
// ============================================
// FILTRES POUR LES LOGS D'AUDIT
// ============================================
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AuditLogFilter } from "@/lib/audit/types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_SEVERITY } from "@/lib/audit/types";

interface AuditLogFiltersProps {
  onFilterChange: (filter: AuditLogFilter) => void;
  initialFilter?: AuditLogFilter;
}

export function AuditLogFilters({ onFilterChange, initialFilter = {} }: AuditLogFiltersProps) {
  const [filter, setFilter] = useState<AuditLogFilter>(initialFilter);
  const [startDate, setStartDate] = useState<Date | undefined>(initialFilter.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialFilter.endDate);

  const handleFilterChange = (key: keyof AuditLogFilter, value: unknown) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleDateChange = (type: "start" | "end", date: Date | undefined) => {
    if (type === "start") {
      setStartDate(date);
      handleFilterChange("startDate", date);
    } else {
      setEndDate(date);
      handleFilterChange("endDate", date);
    }
  };

  const clearFilters = () => {
    setFilter({});
    setStartDate(undefined);
    setEndDate(undefined);
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filter).some(v => v !== undefined && v !== "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher..."
            value={filter.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Action */}
        <Select
          value={filter.action || "all"}
          onValueChange={(value) => handleFilterChange("action", value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {Object.values(AUDIT_ACTIONS).map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Entité */}
        <Select
          value={filter.entity || "all"}
          onValueChange={(value) => handleFilterChange("entity", value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les entités" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            {Object.values(AUDIT_ENTITIES).map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sévérité */}
        <Select
          value={filter.severity || "all"}
          onValueChange={(value) => handleFilterChange("severity", value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les sévérités" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sévérités</SelectItem>
            {Object.values(AUDIT_SEVERITY).map((severity) => (
              <SelectItem key={severity} value={severity}>
                {severity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: fr }) : "Date de début"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => handleDateChange("start", date)}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "dd/MM/yyyy", { locale: fr }) : "Date de fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => handleDateChange("end", date)}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Bouton de réinitialisation */}
      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters} className="w-full">
          <X className="mr-2 h-4 w-4" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
