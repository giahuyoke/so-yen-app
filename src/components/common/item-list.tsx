import type { ReactNode } from "react";

interface ItemListProps<T> {
  dataSource: T[];
  renderItem: (item: T, index: number) => ReactNode;
  rowKey?: (item: T, index: number) => string;
}

const defaultKey = (item: unknown, index: number) =>
  typeof item === "object" && item !== null && "id" in item ? String(item.id) : String(index);

/** Danh sách có vạch ngăn, thay cho List của antd (đã ngừng phát triển). */
export function ItemList<T>({ dataSource, renderItem, rowKey = defaultKey }: ItemListProps<T>) {
  return (
    <div className="divide-y divide-line">
      {dataSource.map((item, i) => (
        <div key={rowKey(item, i)}>{renderItem(item, i)}</div>
      ))}
    </div>
  );
}

interface ListItemProps {
  children: ReactNode;
  /** Nút thao tác bên phải. */
  actions?: ReactNode[];
  /** Nội dung phụ bên phải (số liệu, nhãn). */
  extra?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ListItem({ children, actions, extra, className = "", onClick }: ListItemProps) {
  return (
    <div className={`flex items-center gap-3 py-3 ${className}`} onClick={onClick}>
      <div className="min-w-0 flex-1">{children}</div>
      {extra && <div className="shrink-0">{extra}</div>}
      {actions && actions.length > 0 && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ListItemMeta({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <>
      <div className="font-medium text-ink">{title}</div>
      {description && <div className="text-sm text-muted">{description}</div>}
    </>
  );
}
