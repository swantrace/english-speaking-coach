import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import type * as React from "react";

export interface ActionConfirmation {
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
}

export interface RowAction<TData> {
  label: string;
  action: (row: TData) => void | Promise<void>;
  isDestructive?: boolean;
  confirmation?: ActionConfirmation;
}

export interface BulkAction<TData> {
  label: string;
  action: (selectedRows: TData[]) => void | Promise<void>;
  isDestructive?: boolean;
  confirmation?: ActionConfirmation;
}

export type DataTableFacetedFilterOption = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export type DataTableFacetedFilterConfig = {
  columnId: string;
  title?: string;
  options?: Record<string, DataTableFacetedFilterOption>;
};

export type DataTablePaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
};

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  facetedFilters?: DataTableFacetedFilterConfig[];
  rowActions?: RowAction<TData>[];
  bulkActions?: BulkAction<TData>[];
  initialColumnVisibility?: VisibilityState;
  isPending?: boolean;
  paginationMeta?: DataTablePaginationMeta;
  searchPlaceholder?: string;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  sorting?: SortingState;
  onSortingChange?: (state: SortingState) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (state: ColumnFiltersState) => void;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string | undefined;
  getRowAriaLabel?: (row: TData) => string | undefined;
};