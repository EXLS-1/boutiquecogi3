// components/auditlog/audit-log-filters.tsx
// ============================================
// FILTRES POUR LES LOGS D'AUDIT
// ============================================
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { AuditLogFilter } from "@/lib/audit/types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_SEVERITY } from "@/lib/audit/types";

interface AuditLogFiltersProps {
  onFilterChange: (filter: AuditLogFilter) => void;
  initialFilter?: AuditLogFilter;
}

function toDateInputValue(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string, endOfDay: boolean): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const [, yearText, monthText, dayText] = match;
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
  if (
    date.getFullYear() !== Number(yearText) ||
    date.getMonth() !== Number(monthText) - 1 ||
    date.getDate() !== Number(dayText)
  ) {
    return undefined;
  }

  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
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

  const handleDateChange = (type: "start" | "end", value: string) => {
    const date = fromDateInputValue(value, type === "end");

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
        <label className="space-y-1 text-sm font-medium text-slate-600">
          Date de début
          <Input
            type="date"
            value={toDateInputValue(startDate)}
            onChange={(event) => handleDateChange("start", event.target.value)}
            aria-label="Date de début"
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-600">
          Date de fin
          <Input
            type="date"
            value={toDateInputValue(endDate)}
            onChange={(event) => handleDateChange("end", event.target.value)}
            aria-label="Date de fin"
          />
        </label>
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
