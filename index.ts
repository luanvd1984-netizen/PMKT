export type Status = "active" | "locked";

export type UserRole =
  | "admin"
  | "pur"
  | "department"
  | "accountant"
  | "deputy"
  | "director"
  | "warehouse"; // Kế toán kho — nhập SL thực nhận

export type PRStatus =
  | "draft"
  | "submitted"
  | "pricing"
  | "pending_ktt"
  | "pending_pgd"
  | "pending_gd"
  | "approved"
  | "ordered"
  | "completed"
  | "rejected";

/**
 * waiting_delivery  - Đã gửi PO, chờ NCC giao
 * awaiting_stock_in - PUR xác nhận hàng đã về, chờ kế toán kho nhập số thực nhận
 * partial           - Nhập một phần, còn thiếu
 * received          - Nhập đủ
 * cancelled         - Hủy phần còn lại
 * changed_supplier  - Đã đổi NCC
 */
export type POStatus =
  | "pending"
  | "sent"
  | "waiting_delivery"
  | "awaiting_stock_in"
  | "partial"
  | "received"
  | "cancelled"
  | "changed_supplier";

export type RejectTarget = "pur" | "department";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  departmentId: string | null;
  warehouseId: string | null; // thủ kho gắn kho (optional)
}

export interface ApprovalStep {
  id: string;
  role: "accountant" | "deputy" | "director" | "pur";
  roleLabel: string;
  userId: string;
  userName: string;
  action: "approve" | "reject" | "submit_sign";
  reason: string;
  at: string;
  rejectTo?: RejectTarget;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  taxCode: string;
  bank: string;
  status: Status;
  address?: string;
  email?: string;
  contactPerson?: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  group: string;
  unit: string;
  unitPrice: number;
  defaultSupplierId: string;
  status: Status;
}

export interface Quote {
  id: string;
  itemCode: string;
  unitPrice: number;
  period: string;
  fromDate: string;
  toDate: string;
  updatedBy: string;
  status: Status;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  keeper: string;
  note: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  defaultWarehouseId: string | null;
  monthlyBudget: number;
  head: string;
}

export interface PRLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  note: string;
  unitPrice: number | null;
  supplierId: string | null;
  supplierCode: string | null;
}

export interface PurchaseRequest {
  id: string;
  code: string;
  departmentId: string;
  departmentName: string;
  createdBy: string;
  createdAt: string;
  submittedAt: string | null;
  neededDate: string | null; // ngày cần hàng
  status: PRStatus;
  note: string;
  lines: PRLine[];
  approvalHistory: ApprovalStep[];
  rejectReason: string | null;
  rejectTo: RejectTarget | null;
}

export interface POLine {
  id: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  prId: string;
  prCode: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  departmentId: string;
  departmentName: string;
  status: POStatus;
  createdAt: string;
  createdBy: string;
  sentAt: string | null;
  arrivedAt: string | null; // PUR bấm nhận hàng
  lines: POLine[];
  totalAmount: number;
  note: string;
  replacedFromPoId: string | null;
  cancelReason: string | null;
}

export interface StockIn {
  id: string;
  code: string;
  poId: string;
  poCode: string;
  prId: string;
  prCode: string;
  departmentId: string;
  departmentName: string;
  warehouseId: string | null;
  warehouseCode: string;
  warehouseName: string;
  createdAt: string;
  createdBy: string;
  lines: {
    id: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export type TabKey = "suppliers" | "items" | "quotes" | "warehouses" | "departments";
