import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDateOnly(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const PR_STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  submitted: "Chờ PUR xử lý",
  pricing: "PUR đang gán giá",
  pending_ktt: "Chờ Kế toán duyệt",
  pending_pgd: "Chờ Phó GĐ duyệt",
  pending_gd: "Chờ Giám đốc duyệt",
  approved: "Đã duyệt — chờ gửi PO",
  ordered: "Đã gửi PO — chờ giao / nhập kho",
  completed: "Hoàn tất",
  rejected: "Từ chối",
};

export const PO_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ gửi",
  sent: "Đã gửi NCC",
  waiting_delivery: "Đang chờ giao hàng",
  awaiting_stock_in: "Hàng đã về — chờ kế toán kho nhập",
  partial: "Nhập một phần — còn thiếu",
  received: "Đã nhập đủ",
  cancelled: "Đã hủy",
  changed_supplier: "Đã đổi NCC",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  pur: "Thu mua",
  department: "Phòng ban",
  accountant: "Kế toán trưởng",
  deputy: "Phó Giám đốc",
  director: "Giám đốc",
  warehouse: "Kế toán kho",
};
