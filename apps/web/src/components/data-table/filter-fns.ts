import type { FilterFn } from "@tanstack/react-table";

export function includesSelectedValues<TData>(): FilterFn<TData> {
  return (row, columnId, filterValue) => {
    if (!Array.isArray(filterValue) || filterValue.length === 0) {
      return true;
    }

    const cellValue = row.getValue(columnId);

    if (Array.isArray(cellValue)) {
      return cellValue.some((value) => filterValue.includes(String(value)));
    }

    if (cellValue == null) {
      return false;
    }

    return filterValue.includes(String(cellValue));
  };
}
