"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Package,
  FileText,
  Warehouse as WarehouseIcon,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  RotateCcw,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TabKey,
  Supplier,
  Item,
  Quote,
  Warehouse,
  Department,
  Status,
  User,
} from "@/types";
import { logout as doLogout } from "@/lib/storage";
import { LogOut, ArrowLeft } from "lucide-react";
import {
  getSuppliers,
  saveSuppliers,
  getItems,
  saveItems,
  getQuotes,
  saveQuotes,
  getWarehouses,
  saveWarehouses,
  getDepartments,
  saveDepartments,
  resetAllData,
  logout as doLogout,
} from "@/lib/storage";
import { formatVND, generateId, cn } from "@/lib/utils";
import { Button, Input, Select, Badge, Dialog, Label } from "./ui";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "suppliers", label: "Nhà cung cấp", icon: <Building2 className="h-4 w-4" /> },
  { key: "items", label: "Mã hàng", icon: <Package className="h-4 w-4" /> },
  { key: "quotes", label: "Báo giá", icon: <FileText className="h-4 w-4" /> },
  { key: "warehouses", label: "Kho", icon: <WarehouseIcon className="h-4 w-4" /> },
  { key: "departments", label: "Phòng ban", icon: <Users className="h-4 w-4" /> },
];

export default function MasterDataApp({
  user,
  onLogout,
  onBack,
}: {
  user?: User | null;
  onLogout?: () => void;
  onBack?: () => void;
} = {}) {
  const [tab, setTab] = useState<TabKey>("suppliers");
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    setSuppliers(getSuppliers());
    setItems(getItems());
    setQuotes(getQuotes());
    setWarehouses(getWarehouses());
    setDepartments(getDepartments());
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.taxCode.includes(q)
    );
  }, [suppliers, search]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q)
    );
  }, [items, search]);

  const filteredQuotes = useMemo(() => {
    const q = search.toLowerCase();
    return quotes.filter(
      (qte) =>
        qte.itemCode.toLowerCase().includes(q) ||
        qte.period.toLowerCase().includes(q) ||
        qte.updatedBy.toLowerCase().includes(q)
    );
  }, [quotes, search]);

  const filteredWarehouses = useMemo(() => {
    const q = search.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        w.keeper.toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  const filteredDepartments = useMemo(() => {
    const q = search.toLowerCase();
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.head.toLowerCase().includes(q)
    );
  }, [departments, search]);

  const getSupplierCode = (id: string) =>
    suppliers.find((s) => s.id === id)?.code ?? "—";
  const getWarehouseCode = (id: string | null) =>
    id ? warehouses.find((w) => w.id === id)?.code ?? "—" : "—";

  function openAdd() {
    setEditingId(null);
    if (tab === "suppliers") {
      setForm({ code: "", name: "", phone: "", taxCode: "", bank: "", status: "active", address: "", contactPerson: "" });
    } else if (tab === "items") {
      setForm({ code: "", name: "", group: "Thực phẩm tươi", unit: "Kg", unitPrice: 0, defaultSupplierId: suppliers[0]?.id ?? "", status: "active" });
    } else if (tab === "quotes") {
      setForm({ itemCode: items[0]?.code ?? "", unitPrice: 0, period: "2026-Q4", fromDate: "2026-10-01", toDate: "2026-12-31", updatedBy: "PUR", status: "active" });
    } else if (tab === "warehouses") {
      setForm({ code: "", name: "", keeper: "", note: "" });
    } else if (tab === "departments") {
      setForm({ code: "", name: "", defaultWarehouseId: "", monthlyBudget: 0, head: "" });
    }
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    if (tab === "suppliers") {
      const s = suppliers.find((x) => x.id === id);
      if (s) setForm({ ...s });
    } else if (tab === "items") {
      const i = items.find((x) => x.id === id);
      if (i) setForm({ ...i });
    } else if (tab === "quotes") {
      const q = quotes.find((x) => x.id === id);
      if (q) setForm({ ...q });
    } else if (tab === "warehouses") {
      const w = warehouses.find((x) => x.id === id);
      if (w) setForm({ ...w });
    } else if (tab === "departments") {
      const d = departments.find((x) => x.id === id);
      if (d) setForm({ ...d, defaultWarehouseId: d.defaultWarehouseId ?? "" });
    }
    setDialogOpen(true);
  }

  function handleSave() {
    if (tab === "suppliers") {
      if (!form.code || !form.name) { toast.error("Vui lòng nhập Mã NCC và Tên NCC"); return; }
      let next: Supplier[];
      if (editingId) {
        next = suppliers.map((s) => (s.id === editingId ? { ...s, ...form } : s));
      } else {
        next = [...suppliers, { ...form, id: generateId() } as Supplier];
      }
      setSuppliers(next); saveSuppliers(next);
      toast.success(editingId ? "Đã cập nhật NCC" : "Đã thêm NCC");
    } else if (tab === "items") {
      if (!form.code || !form.name) { toast.error("Vui lòng nhập Mã hàng và Tên hàng"); return; }
      let next: Item[];
      if (editingId) {
        next = items.map((i) => (i.id === editingId ? { ...i, ...form, unitPrice: Number(form.unitPrice) } : i));
      } else {
        next = [...items, { ...form, id: generateId(), unitPrice: Number(form.unitPrice) } as Item];
      }
      setItems(next); saveItems(next);
      toast.success(editingId ? "Đã cập nhật mã hàng" : "Đã thêm mã hàng");
    } else if (tab === "quotes") {
      if (!form.itemCode) { toast.error("Vui lòng chọn mã hàng"); return; }
      let next: Quote[];
      if (editingId) {
        next = quotes.map((q) => (q.id === editingId ? { ...q, ...form, unitPrice: Number(form.unitPrice) } : q));
      } else {
        next = [...quotes, { ...form, id: generateId(), unitPrice: Number(form.unitPrice) } as Quote];
      }
      setQuotes(next); saveQuotes(next);
      toast.success(editingId ? "Đã cập nhật báo giá" : "Đã thêm báo giá");
    } else if (tab === "warehouses") {
      if (!form.code || !form.name) { toast.error("Vui lòng nhập Mã kho và Tên kho"); return; }
      let next: Warehouse[];
      if (editingId) {
        next = warehouses.map((w) => (w.id === editingId ? { ...w, ...form } : w));
      } else {
        next = [...warehouses, { ...form, id: generateId() } as Warehouse];
      }
      setWarehouses(next); saveWarehouses(next);
      toast.success(editingId ? "Đã cập nhật kho" : "Đã thêm kho");
    } else if (tab === "departments") {
      if (!form.code || !form.name) { toast.error("Vui lòng nhập Mã PB và Tên phòng ban"); return; }
      let next: Department[];
      const payload = { ...form, monthlyBudget: Number(form.monthlyBudget), defaultWarehouseId: form.defaultWarehouseId || null };
      if (editingId) {
        next = departments.map((d) => (d.id === editingId ? { ...d, ...payload } : d));
      } else {
        next = [...departments, { ...payload, id: generateId() } as Department];
      }
      setDepartments(next); saveDepartments(next);
      toast.success(editingId ? "Đã cập nhật phòng ban" : "Đã thêm phòng ban");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    if (!confirm("Bạn chắc chắn muốn xóa bản ghi này?")) return;
    if (tab === "suppliers") { const next = suppliers.filter((s) => s.id !== id); setSuppliers(next); saveSuppliers(next); }
    else if (tab === "items") { const next = items.filter((i) => i.id !== id); setItems(next); saveItems(next); }
    else if (tab === "quotes") { const next = quotes.filter((q) => q.id !== id); setQuotes(next); saveQuotes(next); }
    else if (tab === "warehouses") { const next = warehouses.filter((w) => w.id !== id); setWarehouses(next); saveWarehouses(next); }
    else if (tab === "departments") { const next = departments.filter((d) => d.id !== id); setDepartments(next); saveDepartments(next); }
    toast.success("Đã xóa");
  }

  function exportJsonMisa() {
    const data: Record<string, any> = {};
    if (tab === "suppliers") {
      data.suppliers = suppliers.map((s) => ({
        VendorCode: s.code, VendorName: s.name, Phone: s.phone, TaxCode: s.taxCode,
        BankAccount: s.bank, Status: s.status === "active" ? 1 : 0, Address: s.address ?? "", ContactPerson: s.contactPerson ?? "",
      }));
    } else if (tab === "items") {
      data.items = items.map((i) => ({
        InventoryItemCode: i.code, InventoryItemName: i.name, InventoryItemCategory: i.group, Unit: i.unit,
        UnitPrice: i.unitPrice, DefaultVendorCode: getSupplierCode(i.defaultSupplierId), Status: i.status === "active" ? 1 : 0,
      }));
    } else if (tab === "quotes") {
      data.priceLists = quotes.map((q) => ({
        InventoryItemCode: q.itemCode, UnitPrice: q.unitPrice, Period: q.period, FromDate: q.fromDate,
        ToDate: q.toDate, UpdatedBy: q.updatedBy, Status: q.status === "active" ? 1 : 0,
      }));
    } else if (tab === "warehouses") {
      data.warehouses = warehouses.map((w) => ({ StockCode: w.code, StockName: w.name, Keeper: w.keeper, Description: w.note }));
    } else if (tab === "departments") {
      data.departments = departments.map((d) => ({
        OrganizationUnitCode: d.code, OrganizationUnitName: d.name, DefaultStockCode: getWarehouseCode(d.defaultWarehouseId),
        MonthlyBudget: d.monthlyBudget, Manager: d.head,
      }));
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oceanami-misa-${tab}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất JSON MISA");
  }

  function handleReset() {
    if (!confirm("Reset toàn bộ dữ liệu về mặc định? Dữ liệu hiện tại sẽ mất.")) return;
    resetAllData();
    setSuppliers(getSuppliers()); setItems(getItems()); setQuotes(getQuotes());
    setWarehouses(getWarehouses()); setDepartments(getDepartments());
    toast.success("Đã reset dữ liệu");
  }

  const titles: Record<TabKey, { title: string; desc: string; addLabel: string }> = {
    suppliers: { title: "Danh mục Nhà Cung Cấp", desc: "Quản lý thông tin NCC: liên hệ, thuế, ngân hàng và trạng thái hoạt động.", addLabel: "Thêm NCC" },
    items: { title: "Danh mục Mã Hàng & Tên Hàng", desc: "Mã hàng, nhóm hàng, đơn vị tính, đơn giá tham chiếu (PUR quản lý) và NCC mặc định.", addLabel: "Thêm mã hàng" },
    quotes: { title: "Danh mục Báo Giá & Đơn Giá", desc: "Đơn giá áp dụng theo khoảng thời gian (tháng/quý) do PUR cập nhật.", addLabel: "Thêm báo giá" },
    warehouses: { title: "Danh mục Kho", desc: "Các kho/điểm lưu trữ: Bếp trung tâm, Bàn/Bar, Buồng phòng, Căn tin, Bảo trì kỹ thuật...", addLabel: "Thêm kho" },
    departments: { title: "Danh mục Phòng Ban", desc: "Phòng ban, kho mặc định đi kèm, hạn mức ngân sách tháng và trưởng phòng phụ trách.", addLabel: "Thêm phòng ban" },
  };

  const current = titles[tab];
  const counts: Record<TabKey, number> = { suppliers: filteredSuppliers.length, items: filteredItems.length, quotes: filteredQuotes.length, warehouses: filteredWarehouses.length, departments: filteredDepartments.length };
  const totals: Record<TabKey, number> = { suppliers: suppliers.length, items: items.length, quotes: quotes.length, warehouses: warehouses.length, departments: departments.length };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12c2-4 4-6 6-6s4 2 6 6 4 6 6 6 4-2 6-6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Oceanami Resort — Danh mục Nền</h1>
                <p className="text-sm text-zinc-500">Master Data Management dành cho Admin / PUR. Chuẩn hóa JSON đồng bộ MISA AMIS.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onBack && (
                <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100">
                  <ArrowLeft className="h-4 w-4" /> Quay lại
                </button>
              )}
              {user && onLogout && (
                <button onClick={() => { doLogout(); onLogout(); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100">
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
              className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="text-sm text-zinc-500">{current.desc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJsonMisa}><Download className="h-4 w-4" />JSON MISA</Button>
            <Button onClick={openAdd}><Plus className="h-4 w-4" />{current.addLabel}</Button>
          </div>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input className="pl-9" placeholder="Tìm nhanh theo mã hoặc tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {tab === "suppliers" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã NCC</th>
                  <th className="px-4 py-3 font-medium">Tên NCC</th>
                  <th className="px-4 py-3 font-medium">Điện thoại</th>
                  <th className="px-4 py-3 font-medium">MST</th>
                  <th className="px-4 py-3 font-medium">Ngân hàng</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400">Không có dữ liệu phù hợp</td></tr>
                ) : filteredSuppliers.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium">{s.code}</td>
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3">{s.phone}</td>
                    <td className="px-4 py-3">{s.taxCode}</td>
                    <td className="px-4 py-3">{s.bank}</td>
                    <td className="px-4 py-3"><Badge variant={s.status === "active" ? "success" : "muted"}>{s.status === "active" ? "Hoạt động" : "Khóa"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "items" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã hàng</th>
                  <th className="px-4 py-3 font-medium">Tên hàng</th>
                  <th className="px-4 py-3 font-medium">Nhóm hàng</th>
                  <th className="px-4 py-3 font-medium">ĐVT</th>
                  <th className="px-4 py-3 font-medium">Đơn giá TC</th>
                  <th className="px-4 py-3 font-medium">NCC mặc định</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-400">Không có dữ liệu phù hợp</td></tr>
                ) : filteredItems.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium">{i.code}</td>
                    <td className="px-4 py-3">{i.name}</td>
                    <td className="px-4 py-3">{i.group}</td>
                    <td className="px-4 py-3">{i.unit}</td>
                    <td className="px-4 py-3">{formatVND(i.unitPrice)}</td>
                    <td className="px-4 py-3">{getSupplierCode(i.defaultSupplierId)}</td>
                    <td className="px-4 py-3"><Badge variant={i.status === "active" ? "success" : "muted"}>{i.status === "active" ? "Hoạt động" : "Khóa"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(i.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "quotes" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã hàng</th>
                  <th className="px-4 py-3 font-medium">Đơn giá</th>
                  <th className="px-4 py-3 font-medium">Kỳ áp dụng</th>
                  <th className="px-4 py-3 font-medium">Từ ngày</th>
                  <th className="px-4 py-3 font-medium">Đến ngày</th>
                  <th className="px-4 py-3 font-medium">Người cập nhật</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-400">Không có dữ liệu phù hợp</td></tr>
                ) : filteredQuotes.map((q) => (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium">{q.itemCode}</td>
                    <td className="px-4 py-3">{formatVND(q.unitPrice)}</td>
                    <td className="px-4 py-3">{q.period}</td>
                    <td className="px-4 py-3">{q.fromDate}</td>
                    <td className="px-4 py-3">{q.toDate}</td>
                    <td className="px-4 py-3">{q.updatedBy}</td>
                    <td className="px-4 py-3"><Badge variant={q.status === "active" ? "success" : "muted"}>{q.status === "active" ? "Hoạt động" : "Khóa"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "warehouses" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã kho</th>
                  <th className="px-4 py-3 font-medium">Tên kho</th>
                  <th className="px-4 py-3 font-medium">Thủ kho</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-400">Không có dữ liệu phù hợp</td></tr>
                ) : filteredWarehouses.map((w) => (
                  <tr key={w.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium">{w.code}</td>
                    <td className="px-4 py-3">{w.name}</td>
                    <td className="px-4 py-3">{w.keeper}</td>
                    <td className="px-4 py-3 text-zinc-500">{w.note}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(w.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "departments" && (
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã PB</th>
                  <th className="px-4 py-3 font-medium">Tên phòng ban</th>
                  <th className="px-4 py-3 font-medium">Kho mặc định</th>
                  <th className="px-4 py-3 font-medium">Ngân sách/tháng</th>
                  <th className="px-4 py-3 font-medium">Trưởng phòng</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400">Không có dữ liệu phù hợp</td></tr>
                ) : filteredDepartments.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium">{d.code}</td>
                    <td className="px-4 py-3">{d.name}</td>
                    <td className="px-4 py-3">{getWarehouseCode(d.defaultWarehouseId)}</td>
                    <td className="px-4 py-3">{formatVND(d.monthlyBudget)}</td>
                    <td className="px-4 py-3">{d.head}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
          <span>{counts[tab]} / {totals[tab]} bản ghi</span>
          <Button variant="ghost" size="sm" onClick={handleReset}><RotateCcw className="h-3.5 w-3.5" />Reset dữ liệu mẫu</Button>
        </div>
      </main>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingId ? `Sửa ${current.addLabel.replace("Thêm ", "")}` : current.addLabel}>
        <div className="space-y-4">
          {tab === "suppliers" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mã NCC *</Label><Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="NCC006" /></div>
                <div><Label>Trạng thái</Label><Select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="active">Hoạt động</option><option value="locked">Khóa</option></Select></div>
              </div>
              <div><Label>Tên NCC *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Điện thoại</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>MST</Label><Input value={form.taxCode || ""} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} /></div>
              </div>
              <div><Label>Ngân hàng</Label><Input value={form.bank || ""} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></div>
              <div><Label>Người liên hệ</Label><Input value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
              <div><Label>Địa chỉ</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </>
          )}
          {tab === "items" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mã hàng *</Label><Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>Trạng thái</Label><Select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="active">Hoạt động</option><option value="locked">Khóa</option></Select></div>
              </div>
              <div><Label>Tên hàng *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nhóm hàng</Label><Select value={form.group || ""} onChange={(e) => setForm({ ...form, group: e.target.value })}><option value="Thực phẩm tươi">Thực phẩm tươi</option><option value="Hóa chất">Hóa chất</option><option value="Công cụ dụng cụ">Công cụ dụng cụ</option><option value="Vật tư">Vật tư</option><option value="Đồ uống">Đồ uống</option></Select></div>
                <div><Label>Đơn vị tính</Label><Select value={form.unit || ""} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="Kg">Kg</option><option value="Cái">Cái</option><option value="Can">Can</option><option value="Chai">Chai</option><option value="Quả">Quả</option><option value="Thùng">Thùng</option><option value="Lít">Lít</option></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Đơn giá tham chiếu (đ)</Label><Input type="number" value={form.unitPrice ?? 0} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
                <div><Label>NCC mặc định</Label><Select value={form.defaultSupplierId || ""} onChange={(e) => setForm({ ...form, defaultSupplierId: e.target.value })}>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}</Select></div>
              </div>
            </>
          )}
          {tab === "quotes" && (
            <>
              <div><Label>Mã hàng *</Label><Select value={form.itemCode || ""} onChange={(e) => setForm({ ...form, itemCode: e.target.value })}>{items.map((i) => (<option key={i.id} value={i.code}>{i.code} — {i.name}</option>))}</Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Đơn giá (đ)</Label><Input type="number" value={form.unitPrice ?? 0} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
                <div><Label>Kỳ áp dụng</Label><Input value={form.period || ""} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-Q4" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Từ ngày</Label><Input type="date" value={form.fromDate || ""} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></div>
                <div><Label>Đến ngày</Label><Input type="date" value={form.toDate || ""} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></div>
              </div>
              <div><Label>Người cập nhật</Label><Input value={form.updatedBy || ""} onChange={(e) => setForm({ ...form, updatedBy: e.target.value })} /></div>
              <div><Label>Trạng thái</Label><Select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="active">Hoạt động</option><option value="locked">Khóa</option></Select></div>
            </>
          )}
          {tab === "warehouses" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mã kho *</Label><Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="K06" /></div>
                <div><Label>Thủ kho</Label><Input value={form.keeper || ""} onChange={(e) => setForm({ ...form, keeper: e.target.value })} /></div>
              </div>
              <div><Label>Tên kho *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Ghi chú</Label><Input value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            </>
          )}
          {tab === "departments" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mã PB *</Label><Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PB12" /></div>
                <div><Label>Ngân sách/tháng (đ)</Label><Input type="number" value={form.monthlyBudget ?? 0} onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })} /></div>
              </div>
              <div><Label>Tên phòng ban *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Kho mặc định</Label><Select value={form.defaultWarehouseId || ""} onChange={(e) => setForm({ ...form, defaultWarehouseId: e.target.value })}><option value="">— Không có —</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.code} — {w.name}</option>))}</Select></div>
              <div><Label>Trưởng phòng</Label><Input value={form.head || ""} onChange={(e) => setForm({ ...form, head: e.target.value })} /></div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave}>Lưu</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}