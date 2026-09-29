"use client";

import type {
  User, Supplier, Item, Quote, Warehouse, Department,
  PurchaseRequest, PurchaseOrder, StockIn,
} from "@/types";
import {
  seedUsers, seedSuppliers, seedItems, seedQuotes,
  seedWarehouses, seedDepartments, seedPRs, seedPOs,
} from "./seed-data";

const KEYS = {
  users: "oceanami_users",
  suppliers: "oceanami_suppliers",
  items: "oceanami_items",
  quotes: "oceanami_quotes",
  warehouses: "oceanami_warehouses",
  departments: "oceanami_departments",
  prs: "oceanami_prs",
  pos: "oceanami_pos",
  stockIns: "oceanami_stock_ins",
  session: "oceanami_session",
} as const;

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function save<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function getUsers(): User[] { return load(KEYS.users, seedUsers); }
export function getSuppliers(): Supplier[] { return load(KEYS.suppliers, seedSuppliers); }
export function saveSuppliers(d: Supplier[]) { save(KEYS.suppliers, d); }
export function getItems(): Item[] { return load(KEYS.items, seedItems); }
export function saveItems(d: Item[]) { save(KEYS.items, d); }
export function getQuotes(): Quote[] { return load(KEYS.quotes, seedQuotes); }
export function saveQuotes(d: Quote[]) { save(KEYS.quotes, d); }
export function getWarehouses(): Warehouse[] { return load(KEYS.warehouses, seedWarehouses); }
export function saveWarehouses(d: Warehouse[]) { save(KEYS.warehouses, d); }
export function getDepartments(): Department[] { return load(KEYS.departments, seedDepartments); }
export function saveDepartments(d: Department[]) { save(KEYS.departments, d); }

export function getPRs(): PurchaseRequest[] { return load(KEYS.prs, seedPRs); }
export function savePRs(d: PurchaseRequest[]) { save(KEYS.prs, d); }
export function getPOs(): PurchaseOrder[] { return load(KEYS.pos, seedPOs); }
export function savePOs(d: PurchaseOrder[]) { save(KEYS.pos, d); }

export function getStockIns(): StockIn[] { return load(KEYS.stockIns, []); }
export function saveStockIns(d: StockIn[]) { save(KEYS.stockIns, d); }

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.session);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setSession(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(KEYS.session, JSON.stringify(user));
  else localStorage.removeItem(KEYS.session);
}

export function login(username: string, password: string): User | null {
  const users = getUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    setSession(user);
    return user;
  }
  return null;
}

export function logout() {
  setSession(null);
}

export function resetAllData() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function nextPRCode(prs: PurchaseRequest[]): string {
  const year = new Date().getFullYear();
  const nums = prs.map((p) => {
    const m = p.code.match(/PR-\d+-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `PR-${year}-${String(next).padStart(4, "0")}`;
}

export function nextPOCode(pos: PurchaseOrder[]): string {
  const year = new Date().getFullYear();
  const nums = pos.map((p) => {
    const m = p.code.match(/PO-\d+-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `PO-${year}-${String(next).padStart(4, "0")}`;
}

export function nextStockInCode(list: StockIn[]): string {
  const year = new Date().getFullYear();
  const nums = list.map((p) => {
    const m = p.code.match(/NK-\d+-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `NK-${year}-${String(next).padStart(4, "0")}`;
}
