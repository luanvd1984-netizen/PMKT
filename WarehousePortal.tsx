"use client";

import { useEffect, useState, useMemo } from "react";
import { LogOut, Package, PackageCheck, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import type { User, PurchaseOrder, StockIn, Department, Warehouse } from "@/types";
import {
  getPOs, savePOs, getStockIns, saveStockIns,
  getDepartments, getWarehouses, nextStockInCode, logout,
} from "@/lib/storage";
import { formatVND, generateId, formatDate, PO_STATUS_LABEL, cn } from "@/lib/utils";
import { Button, Input, Badge, Dialog, Label } from "./ui";
import { exportOneStockInToMisa, exportStockInsToMisaExcel } from "@/lib/misa-export";

/**
 * Kế toán kho: đối chiếu PO + phiếu ghi tay → nhập SL thực nhận → tạo phiếu NK
 */
export default function WarehousePortal({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [stockIns, setStockIns] = useState<StockIn[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setPos(getPOs());
    setStockIns(getStockIns());
    setDepartments(getDepartments());
    setWarehouses(getWarehouses());
  }

  const pending = useMemo(
    () =>
      pos
        .filter((p) => p.status === "awaiting_stock_in")
        .sort((a, b) => (b.arrivedAt || b.createdAt).localeCompare(a.arrivedAt || a.createdAt)),
    [pos]
  );

  function openStockIn(po: PurchaseOrder) {
    const init: Record<string, number> = {};
    po.lines.forEach((l) => {
      // mặc định = còn lại (kế toán kho sửa theo ghi tay)
      init[l.id] = Math.max(0, l.quantity - l.receivedQty);
    });
    setQty(init);
    setSelected(po);
  }

  function handleStockIn() {
    if (!selected) return;
    let has = false;
    const updatedLines = selected.lines.map((l) => {
      const remain = l.quantity - l.receivedQty;
      const add = Math.min(Math.max(0, qty[l.id] ?? 0), remain);
      if (add > 0) has = true;
      return { ...l, receivedQty: l.receivedQty + add };
    });
    if (!has) {
      toast.error("Nhập ít nhất 1 dòng theo thực nhận (ghi tay)");
      return;
    }

    const stockLines = selected.lines
      .map((l, i) => {
        const add = updatedLines[i].receivedQty - l.receivedQty;
        if (add <= 0) return null;
        return {
          id: generateId(),
          itemCode: l.itemCode,
          itemName: l.itemName,
          unit: l.unit,
          quantity: add,
          unitPrice: l.unitPrice,
        };
      })
      .filter(Boolean) as StockIn["lines"];

    const dept = departments.find((d) => d.id === selected.departmentId);
    const wh =
      (user.warehouseId && warehouses.find((w) => w.id === user.warehouseId)) ||
      (dept?.defaultWarehouseId
        ? warehouses.find((w) => w.id === dept.defaultWarehouseId)
        : null);

    const existingSI = getStockIns();
    const si: StockIn = {
      id: generateId(),
      code: nextStockInCode(existingSI),
      poId: selected.id,
      poCode: selected.code,
      prId: selected.prId,
      prCode: selected.prCode,
      departmentId: selected.departmentId,
      departmentName: selected.departmentName,
      warehouseId: wh?.id ?? null,
      warehouseCode: wh?.code ?? "—",
      warehouseName: wh?.name ?? "Kho BP",
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      lines: stockLines,
    };
    saveStockIns([...existingSI, si]);

    const allReceived = updatedLines.every((l) => l.receivedQty >= l.quantity);
    const newStatus = allReceived ? "received" : "partial";

    savePOs(
      getPOs().map((p) =>
        p.id === selected.id
          ? {
              ...p,
              lines: updatedLines,
              status: newStatus as PurchaseOrder["status"],
              note: allReceived
                ? "Đã nhập đủ kho"
                : "Nhập một phần — còn thiếu (PUR xử lý đổi NCC / hủy / chờ giao tiếp)",
            }
          : p
      )
    );

    refresh();
    setSelected(null);
    toast.success(
      allReceived
        ? `${si.code}: nhập đủ → ${si.warehouseName}`
        : `${si.code}: nhập một phần → ${si.warehouseName}`
    );
  }

  function badge(status: string) {
    const map: Record<string, "default" | "success" | "muted" | "warning"> = {
      awaiting_stock_in: "warning",
      partial: "warning",
      received: "success",
      waiting_delivery: "warning",
    };
    return <Badge variant={map[status] || "muted"}>{PO_STATUS_LABEL[status] || status}</Badge>;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white text-sm font-bold">
              O
            </div>
            <div>
              <h1 className="font-semibold">Nhập kho (Kế toán kho)</h1>
              <p className="text-xs text-zinc-500">{user.name} · Kế toán kho — đối chiếu phiếu ghi tay & nhập SL</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); onLogout(); }}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
          <button
            onClick={() => setTab("pending")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === "pending" ? "bg-white shadow-sm" : "text-zinc-600"
            )}
          >
            Chờ nhập kho
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === "history" ? "bg-white shadow-sm" : "text-zinc-600"
            )}
          >
            Lịch sử NK
          </button>
        </div>

        {tab === "pending" && (
          pending.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-zinc-400">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>Không có PO chờ nhập kho</p>
              <p className="text-xs mt-1">Khi PUR bấm &quot;Nhận hàng (hàng đã về)&quot;, PO hiện ở đây để kế toán kho nhập số</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((po) => (
                <div key={po.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{po.code}</span>
                        {badge(po.status)}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        NCC: {po.supplierCode} — {po.supplierName}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {po.prCode} · {po.departmentName} · Về: {formatDate(po.arrivedAt || "")}
                      </p>
                    </div>
                    <Button onClick={() => openStockIn(po)}>
                      <PackageCheck className="h-4 w-4" /> Nhập SL thực nhận
                    </Button>
                  </div>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-left text-zinc-400 text-xs border-b">
                        <th className="pb-1">Mã</th>
                        <th className="pb-1">Tên</th>
                        <th className="pb-1">SL đặt</th>
                        <th className="pb-1">Đã nhập</th>
                        <th className="pb-1">Còn lại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.lines.map((l) => (
                        <tr key={l.id} className="border-b border-zinc-50">
                          <td className="py-1.5 font-medium">{l.itemCode}</td>
                          <td className="py-1.5">{l.itemName}</td>
                          <td className="py-1.5">{l.quantity} {l.unit}</td>
                          <td className="py-1.5 text-green-700">{l.receivedQty}</td>
                          <td className="py-1.5 text-amber-700">{l.quantity - l.receivedQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "history" && (
          stockIns.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-zinc-400">
              Chưa có phiếu nhập kho
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    exportStockInsToMisaExcel(stockIns, pos);
                    toast.success("Đã xuất file Excel nhập kho MISA");
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Xuất tất cả → MISA
                </Button>
              </div>
              {stockIns
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((si) => (
                  <div key={si.id} className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-semibold">{si.code}</span>
                        <p className="text-sm text-zinc-500">
                          {si.poCode} / {si.prCode} · {si.departmentName} · Kho {si.warehouseCode}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {si.createdBy} · {formatDate(si.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          exportOneStockInToMisa(si, pos);
                          toast.success(`Đã xuất ${si.code} cho MISA`);
                        }}
                      >
                        <FileSpreadsheet className="h-4 w-4" /> Excel MISA
                      </Button>
                    </div>
                    <table className="w-full text-sm mt-2">
                      <tbody>
                        {si.lines.map((l) => (
                          <tr key={l.id} className="border-t border-zinc-50">
                            <td className="py-1 font-medium">{l.itemCode}</td>
                            <td className="py-1">{l.itemName}</td>
                            <td className="py-1">
                              {l.quantity} {l.unit}
                            </td>
                            <td className="py-1 text-right">{formatVND(l.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          )
        )}
      </main>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Nhập kho — ${selected?.code ?? ""}`}
      >
        {selected && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <p className="text-sm text-zinc-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Kế toán kho nhập <strong>số lượng thực nhận</strong> theo phiếu ghi tay (đối chiếu PO).
              Không bắt buộc bằng SL đặt (thực phẩm hay thiếu/dư).
            </p>
            {selected.lines.map((l) => {
              const remain = l.quantity - l.receivedQty;
              return (
                <div key={l.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {l.itemCode} — {l.itemName}
                    </span>
                    <span className="text-zinc-500">
                      Đặt {l.quantity} · Còn {remain} {l.unit}
                    </span>
                  </div>
                  {remain > 0 ? (
                    <div>
                      <Label>Thực nhận lần này</Label>
                      <Input
                        type="number"
                        min={0}
                        max={remain}
                        step="0.1"
                        value={qty[l.id] ?? 0}
                        onChange={(e) =>
                          setQty({
                            ...qty,
                            [l.id]: Math.min(remain, Math.max(0, Number(e.target.value) || 0)),
                          })
                        }
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-green-600">Đã nhập đủ dòng này</p>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 justify-end border-t pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Hủy
              </Button>
              <Button onClick={handleStockIn}>
                <PackageCheck className="h-4 w-4" /> Xác nhận nhập kho
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
