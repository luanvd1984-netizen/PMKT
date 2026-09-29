"use client";

import { useMemo, useState } from "react";
import type { PurchaseOrder, StockIn, PurchaseRequest } from "@/types";
import { formatVND, formatDate, PO_STATUS_LABEL, cn } from "@/lib/utils";
import { Button } from "./ui";

type ReportTab = "stock_month" | "by_dept" | "po_status";

function monthKey(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPanel({
  stockIns,
  pos,
  prs,
}: {
  stockIns: StockIn[];
  pos: PurchaseOrder[];
  prs: PurchaseRequest[];
}) {
  const [report, setReport] = useState<ReportTab>("stock_month");
  const [month, setMonth] = useState(currentMonth());

  // —— 1. Tổng nhập trong tháng: PO, NCC, tổng tiền ——
  const stockMonth = useMemo(() => {
    const rows = stockIns.filter((s) => monthKey(s.createdAt) === month);
    // group by PO + supplier (from PO)
    const map = new Map<
      string,
      {
        poCode: string;
        prCode: string;
        supplierCode: string;
        supplierName: string;
        departmentName: string;
        amount: number;
        stockCodes: string[];
      }
    >();
    for (const si of rows) {
      const po = pos.find((p) => p.id === si.poId);
      const key = si.poId;
      const lineAmt = si.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const existing = map.get(key);
      if (existing) {
        existing.amount += lineAmt;
        existing.stockCodes.push(si.code);
      } else {
        map.set(key, {
          poCode: si.poCode,
          prCode: si.prCode,
          supplierCode: po?.supplierCode ?? "—",
          supplierName: po?.supplierName ?? "—",
          departmentName: si.departmentName,
          amount: lineAmt,
          stockCodes: [si.code],
        });
      }
    }
    const list = [...map.values()].sort((a, b) => a.poCode.localeCompare(b.poCode));
    const total = list.reduce((s, r) => s + r.amount, 0);
    return { list, total, countNK: rows.length };
  }, [stockIns, pos, month]);

  // —— 2. Tổng mua theo BP (theo nhập kho trong tháng; fallback theo PO gửi trong tháng) ——
  const byDept = useMemo(() => {
    const map = new Map<string, { departmentName: string; amount: number; poSet: Set<string>; nkCount: number }>();
    const rows = stockIns.filter((s) => monthKey(s.createdAt) === month);
    for (const si of rows) {
      const amt = si.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const cur = map.get(si.departmentId) ?? {
        departmentName: si.departmentName,
        amount: 0,
        poSet: new Set<string>(),
        nkCount: 0,
      };
      cur.amount += amt;
      cur.poSet.add(si.poCode);
      cur.nkCount += 1;
      map.set(si.departmentId, cur);
    }
    // Nếu chưa có NK, vẫn hiện BP từ PO trong tháng (tổng theo giá trị PO)
    if (map.size === 0) {
      for (const po of pos) {
        const t = po.sentAt || po.createdAt;
        if (monthKey(t) !== month) continue;
        const cur = map.get(po.departmentId) ?? {
          departmentName: po.departmentName,
          amount: 0,
          poSet: new Set<string>(),
          nkCount: 0,
        };
        cur.amount += po.totalAmount;
        cur.poSet.add(po.code);
        map.set(po.departmentId, cur);
      }
    }
    const list = [...map.values()]
      .map((r) => ({
        departmentName: r.departmentName,
        amount: r.amount,
        poCount: r.poSet.size,
        nkCount: r.nkCount,
      }))
      .sort((a, b) => b.amount - a.amount);
    const total = list.reduce((s, r) => s + r.amount, 0);
    return { list, total, fromStock: rows.length > 0 };
  }, [stockIns, pos, month]);

  // —— 3. PO chưa giao / giao thiếu ——
  const poStatus = useMemo(() => {
    const waiting = pos.filter((p) => p.status === "waiting_delivery");
    const awaitingKho = pos.filter((p) => p.status === "awaiting_stock_in");
    const partial = pos.filter((p) => p.status === "partial");
    const open = [...waiting, ...awaitingKho, ...partial].sort((a, b) =>
      (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt)
    );
    return {
      waiting,
      awaitingKho,
      partial,
      open,
      counts: {
        waiting: waiting.length,
        awaitingKho: awaitingKho.length,
        partial: partial.length,
        open: open.length,
      },
    };
  }, [pos]);

  function exportCsv(filename: string, headers: string[], rows: string[][]) {
    const bom = "\uFEFF";
    const lines = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
          {(
            [
              { key: "stock_month" as const, label: "1. Tổng nhập tháng" },
              { key: "by_dept" as const, label: "2. Mua theo BP" },
              { key: "po_status" as const, label: "3. PO chưa giao đủ" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setReport(t.key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                report === t.key ? "bg-white shadow-sm" : "text-zinc-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(report === "stock_month" || report === "by_dept") && (
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Tháng
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 px-2 text-sm"
            />
          </label>
        )}
      </div>

      {/* Báo cáo 1 */}
      {report === "stock_month" && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Tổng nhập kho tháng {month}</h3>
              <p className="text-sm text-zinc-500">
                {stockMonth.countNK} phiếu NK · {stockMonth.list.length} PO · Tổng{" "}
                <strong className="text-zinc-900">{formatVND(stockMonth.total)}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCsv(
                  `tong-nhap-${month}.csv`,
                  ["PO", "PR", "NCC mã", "NCC tên", "BP", "Phiếu NK", "Tổng tiền"],
                  stockMonth.list.map((r) => [
                    r.poCode,
                    r.prCode,
                    r.supplierCode,
                    r.supplierName,
                    r.departmentName,
                    r.stockCodes.join("; "),
                    String(r.amount),
                  ])
                )
              }
            >
              Xuất Excel (CSV)
            </Button>
          </div>
          {stockMonth.list.length === 0 ? (
            <p className="p-8 text-center text-zinc-400">Chưa có nhập kho trong tháng này</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Số PO</th>
                  <th className="px-4 py-2 font-medium">NCC</th>
                  <th className="px-4 py-2 font-medium">BP</th>
                  <th className="px-4 py-2 font-medium">Phiếu NK</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng tiền nhập</th>
                </tr>
              </thead>
              <tbody>
                {stockMonth.list.map((r) => (
                  <tr key={r.poCode} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.poCode}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{r.supplierCode}</span>
                      <span className="text-zinc-500"> — {r.supplierName}</span>
                    </td>
                    <td className="px-4 py-2">{r.departmentName}</td>
                    <td className="px-4 py-2 text-zinc-500">{r.stockCodes.join(", ")}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatVND(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-zinc-50">
                  <td colSpan={4} className="px-4 py-2 text-right font-semibold">
                    Tổng tháng
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{formatVND(stockMonth.total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Báo cáo 2 */}
      {report === "by_dept" && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Tổng mua theo bộ phận — {month}</h3>
              <p className="text-sm text-zinc-500">
                {byDept.fromStock
                  ? "Tính theo số đã nhập kho (thực nhận)"
                  : "Chưa có NK — tạm tính theo giá trị PO gửi trong tháng"}
                {" · "}
                Tổng <strong className="text-zinc-900">{formatVND(byDept.total)}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCsv(
                  `mua-theo-bp-${month}.csv`,
                  ["Bộ phận", "Số PO", "Số phiếu NK", "Tổng tiền"],
                  byDept.list.map((r) => [
                    r.departmentName,
                    String(r.poCount),
                    String(r.nkCount),
                    String(r.amount),
                  ])
                )
              }
            >
              Xuất Excel (CSV)
            </Button>
          </div>
          {byDept.list.length === 0 ? (
            <p className="p-8 text-center text-zinc-400">Chưa có dữ liệu tháng này</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Bộ phận</th>
                  <th className="px-4 py-2 font-medium text-right">Số PO</th>
                  <th className="px-4 py-2 font-medium text-right">Phiếu NK</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {byDept.list.map((r) => (
                  <tr key={r.departmentName} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.departmentName}</td>
                    <td className="px-4 py-2 text-right">{r.poCount}</td>
                    <td className="px-4 py-2 text-right">{r.nkCount || "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatVND(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-zinc-50">
                  <td className="px-4 py-2 font-semibold">Tổng</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2 text-right font-semibold">{formatVND(byDept.total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Báo cáo 3 */}
      {report === "po_status" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Chờ NCC giao" value={poStatus.counts.waiting} color="amber" />
            <StatCard label="Hàng về — chờ nhập kho" value={poStatus.counts.awaitingKho} color="blue" />
            <StatCard label="Giao / nhập thiếu" value={poStatus.counts.partial} color="red" />
          </div>
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold">PO chưa giao đủ / chưa xong</h3>
                <p className="text-sm text-zinc-500">{poStatus.counts.open} phiếu đang mở</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportCsv(
                    `po-chua-xong.csv`,
                    ["PO", "PR", "NCC", "BP", "Trạng thái", "SL đặt", "SL đã nhập", "Còn thiếu", "Tổng tiền PO"],
                    poStatus.open.map((po) => {
                      const ordered = po.lines.reduce((s, l) => s + l.quantity, 0);
                      const received = po.lines.reduce((s, l) => s + l.receivedQty, 0);
                      return [
                        po.code,
                        po.prCode,
                        `${po.supplierCode} ${po.supplierName}`,
                        po.departmentName,
                        PO_STATUS_LABEL[po.status] || po.status,
                        String(ordered),
                        String(received),
                        String(Math.max(0, ordered - received)),
                        String(po.totalAmount),
                      ];
                    })
                  )
                }
              >
                Xuất Excel (CSV)
              </Button>
            </div>
            {poStatus.open.length === 0 ? (
              <p className="p-8 text-center text-zinc-400">Không có PO tồn — tốt!</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">PO</th>
                    <th className="px-4 py-2 font-medium">NCC</th>
                    <th className="px-4 py-2 font-medium">BP</th>
                    <th className="px-4 py-2 font-medium">Trạng thái</th>
                    <th className="px-4 py-2 font-medium text-right">Đặt</th>
                    <th className="px-4 py-2 font-medium text-right">Đã nhập</th>
                    <th className="px-4 py-2 font-medium text-right">Còn thiếu</th>
                    <th className="px-4 py-2 font-medium">Gửi / về</th>
                  </tr>
                </thead>
                <tbody>
                  {poStatus.open.map((po) => {
                    const ordered = po.lines.reduce((s, l) => s + l.quantity, 0);
                    const received = po.lines.reduce((s, l) => s + l.receivedQty, 0);
                    return (
                      <tr key={po.id} className="border-t">
                        <td className="px-4 py-2 font-medium">{po.code}</td>
                        <td className="px-4 py-2">
                          {po.supplierCode}
                          <span className="text-zinc-400 block text-xs">{po.supplierName}</span>
                        </td>
                        <td className="px-4 py-2">{po.departmentName}</td>
                        <td className="px-4 py-2">{PO_STATUS_LABEL[po.status]}</td>
                        <td className="px-4 py-2 text-right">{ordered}</td>
                        <td className="px-4 py-2 text-right text-green-700">{received}</td>
                        <td className="px-4 py-2 text-right text-amber-700 font-medium">
                          {Math.max(0, ordered - received)}
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {formatDate(po.arrivedAt || po.sentAt || po.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "amber" | "blue" | "red";
}) {
  const bg =
    color === "amber"
      ? "bg-amber-50 border-amber-100 text-amber-900"
      : color === "blue"
        ? "bg-blue-50 border-blue-100 text-blue-900"
        : "bg-red-50 border-red-100 text-red-900";
  return (
    <div className={cn("rounded-xl border p-4", bg)}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
