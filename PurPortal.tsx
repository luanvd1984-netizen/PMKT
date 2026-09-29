"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LogOut, Package, Split, FileText, Building2, Send, PenLine,
  PackageCheck, Ban, RefreshCw, Printer, CheckCircle2, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import type {
  User, PurchaseRequest, PurchaseOrder, Supplier, PRLine, Item,
  ApprovalStep, POLine, StockIn, Department, Warehouse,
} from "@/types";
import {
  getPRs, savePRs, getPOs, savePOs, getSuppliers, getItems,
  getDepartments, getWarehouses, getStockIns,
  nextPOCode, logout,
} from "@/lib/storage";
import {
  formatVND, generateId, formatDate, PR_STATUS_LABEL, PO_STATUS_LABEL, cn,
} from "@/lib/utils";
import { Button, Input, Select, Badge, Dialog, Label } from "./ui";
import ReportsPanel from "./ReportsPanel";
import { exportOneStockInToMisa, exportStockInsToMisaExcel } from "@/lib/misa-export";

export default function PurPortal({
  user,
  onLogout,
  onOpenMaster,
}: {
  user: User;
  onLogout: () => void;
  onOpenMaster?: () => void;
}) {
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [stockIns, setStockIns] = useState<StockIn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [tab, setTab] = useState<"inbox" | "approval" | "orders" | "stock" | "reports">("inbox");

  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [mode, setMode] = useState<
    "view" | "price" | "send_po" | "cancel" | "change_sup" | null
  >(null);
  const [editLines, setEditLines] = useState<PRLine[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");

  useEffect(() => { refresh(); }, []);

  function refresh() {
    setPrs(getPRs());
    setPos(getPOs());
    setStockIns(getStockIns());
    setSuppliers(getSuppliers().filter((s) => s.status === "active"));
    setItems(getItems());
    setDepartments(getDepartments());
    setWarehouses(getWarehouses());
  }

  const inbox = useMemo(
    () => prs.filter((p) => p.status === "submitted" || p.status === "pricing")
      .sort((a, b) => (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt)),
    [prs]
  );
  const readyToSend = useMemo(() => prs.filter((p) => p.status === "approved"), [prs]);
  const inApproval = useMemo(
    () => prs.filter((p) => ["pending_ktt", "pending_pgd", "pending_gd"].includes(p.status)),
    [prs]
  );
  const activePOs = useMemo(
    () => pos.filter((p) => ["waiting_delivery", "awaiting_stock_in", "partial"].includes(p.status)),
    [pos]
  );
  const orderedPRs = useMemo(() => prs.filter((p) => p.status === "ordered"), [prs]);

  function openPrice(pr: PurchaseRequest) {
    const prefilled = pr.lines.map((l) => {
      const item = items.find((i) => i.id === l.itemId || i.code === l.itemCode);
      const defaultSup = item ? suppliers.find((s) => s.id === item.defaultSupplierId) : null;
      return {
        ...l,
        unitPrice: l.unitPrice ?? item?.unitPrice ?? null,
        supplierId: l.supplierId ?? defaultSup?.id ?? null,
        supplierCode: l.supplierCode ?? defaultSup?.code ?? null,
      };
    });
    setEditLines(prefilled);
    setSelectedPr(pr);
    setMode("price");
    if (pr.status === "submitted") {
      savePRs(getPRs().map((p) => (p.id === pr.id ? { ...p, status: "pricing" as const } : p)));
      refresh();
    }
  }

  function updateEditLine(lineId: string, field: string, value: string | number | null) {
    setEditLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const u = { ...l, [field]: value };
        if (field === "supplierId") {
          u.supplierCode = suppliers.find((s) => s.id === value)?.code ?? null;
        }
        return u;
      })
    );
  }

  function handleSubmitSign() {
    if (!selectedPr) return;
    if (editLines.some((l) => !l.unitPrice || !l.supplierId)) {
      toast.error("Mỗi dòng cần Đơn giá và NCC");
      return;
    }
    const step: ApprovalStep = {
      id: generateId(), role: "pur", roleLabel: "Thu mua",
      userId: user.id, userName: user.name, action: "submit_sign",
      reason: "", at: new Date().toISOString(),
    };
    savePRs(
      getPRs().map((p) =>
        p.id === selectedPr.id
          ? {
              ...p,
              status: "pending_ktt" as const,
              lines: editLines,
              approvalHistory: [...(p.approvalHistory || []), step],
              rejectReason: null,
              rejectTo: null,
            }
          : p
      )
    );
    refresh();
    closeDialog();
    setTab("approval");
    toast.success(`Đã trình ký ${selectedPr.code}`);
  }

  function handleSendPO() {
    if (!selectedPr) return;
    const bySupplier = new Map<string, PRLine[]>();
    for (const line of selectedPr.lines) {
      if (!line.supplierId) continue;
      if (!bySupplier.has(line.supplierId)) bySupplier.set(line.supplierId, []);
      bySupplier.get(line.supplierId)!.push(line);
    }
    const existing = getPOs();
    const newPOs: PurchaseOrder[] = [];
    for (const [supplierId, lines] of bySupplier) {
      const sup = suppliers.find((s) => s.id === supplierId);
      if (!sup) continue;
      const poLines: POLine[] = lines.map((l) => ({
        id: generateId(),
        itemCode: l.itemCode,
        itemName: l.itemName,
        unit: l.unit,
        quantity: l.quantity,
        receivedQty: 0,
        unitPrice: l.unitPrice!,
        amount: l.quantity * l.unitPrice!,
      }));
      newPOs.push({
        id: generateId(),
        code: nextPOCode([...existing, ...newPOs]),
        prId: selectedPr.id,
        prCode: selectedPr.code,
        supplierId: sup.id,
        supplierCode: sup.code,
        supplierName: sup.name,
        departmentId: selectedPr.departmentId,
        departmentName: selectedPr.departmentName,
        status: "waiting_delivery",
        createdAt: new Date().toISOString(),
        createdBy: user.name,
        sentAt: new Date().toISOString(),
        lines: poLines,
        totalAmount: poLines.reduce((s, l) => s + l.amount, 0),
        note: "Đang chờ giao hàng",
        arrivedAt: null,
        replacedFromPoId: null,
        cancelReason: null,
      });
    }
    savePOs([...existing, ...newPOs]);
    savePRs(getPRs().map((p) => (p.id === selectedPr.id ? { ...p, status: "ordered" as const } : p)));
    refresh();
    closeDialog();
    setTab("orders");
    toast.success(`Đã gửi ${newPOs.length} PO — đang chờ giao hàng`);
  }

  // —— PUR xác nhận hàng đã về (không nhập số — kế toán kho nhập) ——
  function handleMarkArrived(po: PurchaseOrder) {
    if (!confirm(`Xác nhận hàng ${po.code} đã về?\nKế toán kho sẽ đối chiếu phiếu ghi tay và nhập SL.`)) return;
    savePOs(
      getPOs().map((p) =>
        p.id === po.id
          ? {
              ...p,
              status: "awaiting_stock_in" as const,
              arrivedAt: new Date().toISOString(),
              note: "Hàng đã về — chờ kế toán kho nhập SL thực nhận",
            }
          : p
      )
    );
    refresh();
    toast.success(`${po.code}: đã chuyển kế toán kho nhập số thực nhận`);
  }

  // —— Hủy PO ——
  function openCancel(po: PurchaseOrder) {
    setSelectedPo(po);
    setCancelReason("");
    setMode("cancel");
  }

  function handleCancel() {
    if (!selectedPo) return;
    if (!cancelReason.trim()) {
      toast.error("Nhập lý do hủy");
      return;
    }
    // Only cancel remaining; received stays
    savePOs(
      getPOs().map((p) =>
        p.id === selectedPo.id
          ? {
              ...p,
              status: "cancelled" as const,
              note: `Đã hủy phần còn lại. ${cancelReason}`,
              cancelReason: cancelReason.trim(),
            }
          : p
      )
    );
    refresh();
    closeDialog();
    toast.success(`Đã hủy ${selectedPo.code}`);
  }

  // —— Đổi NCC ——
  function openChangeSup(po: PurchaseOrder) {
    setSelectedPo(po);
    setNewSupplierId("");
    setMode("change_sup");
  }

  function handleChangeSup() {
    if (!selectedPo || !newSupplierId) {
      toast.error("Chọn NCC mới");
      return;
    }
    const sup = suppliers.find((s) => s.id === newSupplierId);
    if (!sup) return;

    // Remaining lines only
    const remainLines = selectedPo.lines
      .filter((l) => l.receivedQty < l.quantity)
      .map((l) => ({
        ...l,
        id: generateId(),
        quantity: l.quantity - l.receivedQty,
        receivedQty: 0,
        amount: (l.quantity - l.receivedQty) * l.unitPrice,
      }));

    if (remainLines.length === 0) {
      toast.error("Không còn hàng chờ giao để đổi NCC");
      return;
    }

    const existing = getPOs();
    const newPo: PurchaseOrder = {
      id: generateId(),
      code: nextPOCode(existing),
      prId: selectedPo.prId,
      prCode: selectedPo.prCode,
      supplierId: sup.id,
      supplierCode: sup.code,
      supplierName: sup.name,
      departmentId: selectedPo.departmentId,
      departmentName: selectedPo.departmentName,
      status: "waiting_delivery",
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      sentAt: new Date().toISOString(),
      lines: remainLines,
      totalAmount: remainLines.reduce((s, l) => s + l.amount, 0),
      note: `Đổi từ ${selectedPo.code} — đang chờ giao hàng`,
      arrivedAt: null,
      replacedFromPoId: selectedPo.id,
      cancelReason: null,
    };

    savePOs([
      ...existing.map((p) =>
        p.id === selectedPo.id
          ? {
              ...p,
              status: "changed_supplier" as const,
              note: `Đã đổi NCC → ${newPo.code} (${sup.code})`,
            }
          : p
      ),
      newPo,
    ]);
    refresh();
    closeDialog();
    toast.success(`Đã tạo ${newPo.code} cho ${sup.code}`);
  }

  // —— Hoàn tất PR ——
  function canCompletePR(pr: PurchaseRequest) {
    const related = pos.filter((p) => p.prId === pr.id);
    if (related.length === 0) return false;
    return related.every((p) =>
      ["received", "cancelled", "changed_supplier"].includes(p.status)
    );
  }

  function handleCompletePR(pr: PurchaseRequest) {
    if (!canCompletePR(pr)) {
      toast.error("Còn PO chưa xử lý xong (chờ giao / nhận một phần)");
      return;
    }
    if (!confirm(`Hoàn tất ${pr.code}?`)) return;
    savePRs(getPRs().map((p) => (p.id === pr.id ? { ...p, status: "completed" as const } : p)));
    refresh();
    toast.success(`Đã hoàn tất ${pr.code}`);
  }

  // —— In ——
  function handlePrint(po: PurchaseOrder) {
    const pr = prs.find((p) => p.id === po.prId);
    const html = `
<!DOCTYPE html><html><head><title>${po.code}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 4px}
  h2{font-size:14px;margin:16px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
  th{background:#f5f5f5}
  .meta{font-size:13px;color:#555;margin-bottom:12px}
  .right{text-align:right}
  @media print{button{display:none}}
</style></head><body>
<h1>ĐƠN ĐẶT HÀNG ${po.code}</h1>
<div class="meta">
  PR: ${po.prCode} · BP: ${po.departmentName}<br/>
  NCC: ${po.supplierCode} — ${po.supplierName}<br/>
  Ngày gửi: ${formatDate(po.sentAt || po.createdAt)} · Trạng thái: ${PO_STATUS_LABEL[po.status]}
  ${po.note ? `<br/>Ghi chú: ${po.note}` : ""}
</div>
<table>
  <thead><tr><th>Mã</th><th>Tên hàng</th><th>SL đặt</th><th>Đã nhận</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
  <tbody>
  ${po.lines.map((l) => `<tr>
    <td>${l.itemCode}</td><td>${l.itemName}</td>
    <td>${l.quantity} ${l.unit}</td><td>${l.receivedQty} ${l.unit}</td>
    <td class="right">${formatVND(l.unitPrice)}</td>
    <td class="right">${formatVND(l.amount)}</td>
  </tr>`).join("")}
  </tbody>
</table>
<p class="right"><strong>Tổng: ${formatVND(po.totalAmount)}</strong></p>
${pr ? `<h2>Thông tin PR ${pr.code}</h2>
<div class="meta">Người tạo: ${pr.createdBy} · ${formatDate(pr.createdAt)}
${pr.note ? `<br/>Ghi chú PR: ${pr.note}` : ""}</div>` : ""}
<button onclick="window.print()" style="margin-top:16px;padding:8px 16px">In</button>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  function closeDialog() {
    setMode(null);
    setSelectedPr(null);
    setSelectedPo(null);
  }

  function statusBadge(status: string, type: "pr" | "po" = "pr") {
    const labels = type === "pr" ? PR_STATUS_LABEL : PO_STATUS_LABEL;
    const map: Record<string, "default" | "success" | "muted" | "warning"> = {
      draft: "muted", submitted: "warning", pricing: "warning",
      pending_ktt: "warning", pending_pgd: "warning", pending_gd: "warning",
      approved: "success", ordered: "warning", completed: "success", rejected: "default",
      pending: "warning", sent: "success", waiting_delivery: "warning", awaiting_stock_in: "warning", partial: "warning",
      received: "success", cancelled: "muted", changed_supplier: "muted",
    };
    return <Badge variant={map[status] || "muted"}>{labels[status] || status}</Badge>;
  }

  function totalOf(pr: PurchaseRequest) {
    return pr.lines.reduce((s, l) => s + (l.unitPrice || 0) * l.quantity, 0);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white text-sm font-bold">O</div>
            <div>
              <h1 className="font-semibold">Thu mua (PUR)</h1>
              <p className="text-xs text-zinc-500">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMaster && (
              <Button variant="outline" size="sm" onClick={onOpenMaster}>
                <Building2 className="h-4 w-4" /> Master Data
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { logout(); onLogout(); }}>
              <LogOut className="h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
          {[
            { key: "inbox" as const, label: "Chờ gán giá", count: inbox.length },
            { key: "approval" as const, label: "Duyệt / Gửi PO", count: inApproval.length + readyToSend.length },
            { key: "orders" as const, label: "PO & Nhận hàng", count: activePOs.length },
            { key: "stock" as const, label: "Nhập kho", count: stockIns.length },
            { key: "reports" as const, label: "Báo cáo", count: 0 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "bg-white shadow-sm" : "text-zinc-600"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* INBOX */}
        {tab === "inbox" && (
          inbox.length === 0 ? <Empty text="Không có PR cần gán giá" /> : (
            <div className="space-y-3">
              {inbox.map((pr) => (
                <Card key={pr.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{pr.code}</span>
                        {statusBadge(pr.status)}
                        {pr.rejectReason && <Badge variant="default">Bị trả về</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {pr.departmentName} · {pr.lines.length} mặt hàng
                      </p>
                      {pr.rejectReason && <p className="mt-1 text-sm text-red-600">Lý do: {pr.rejectReason}</p>}
                    </div>
                    <Button onClick={() => openPrice(pr)}>
                      <Split className="h-4 w-4" /> Gán giá & Trình ký
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* APPROVAL */}
        {tab === "approval" && (
          <div className="space-y-6">
            {readyToSend.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-2">Đã duyệt — gửi PO</h3>
                {readyToSend.map((pr) => (
                  <Card key={pr.id}>
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <span className="font-semibold">{pr.code}</span> {statusBadge(pr.status)}
                        <p className="text-sm text-zinc-500">{pr.departmentName} · {formatVND(totalOf(pr))}</p>
                      </div>
                      <Button onClick={() => { setSelectedPr(pr); setMode("send_po"); }}>
                        <Send className="h-4 w-4" /> Gửi PO
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {inApproval.map((pr) => (
              <Card key={pr.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{pr.code}</span> {statusBadge(pr.status)}
                    <p className="text-sm text-zinc-500">{pr.departmentName}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedPr(pr); setMode("view"); }}>Xem</Button>
                </div>
              </Card>
            ))}
            {readyToSend.length === 0 && inApproval.length === 0 && <Empty text="Không có phiếu trong luồng duyệt" />}
          </div>
        )}

        {/* ORDERS + RECEIVE */}
        {tab === "orders" && (
          <div className="space-y-6">
            {orderedPRs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-zinc-600 mb-2">PR đang giao hàng — Hoàn tất khi xong</h3>
                {orderedPRs.map((pr) => {
                  const related = pos.filter((p) => p.prId === pr.id);
                  const ready = canCompletePR(pr);
                  return (
                    <Card key={pr.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold">{pr.code}</span> {statusBadge(pr.status)}
                          <p className="text-sm text-zinc-500">
                            {related.length} PO · {pr.departmentName}
                          </p>
                        </div>
                        <Button
                          variant={ready ? "default" : "outline"}
                          size="sm"
                          disabled={!ready}
                          onClick={() => handleCompletePR(pr)}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Hoàn tất
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {pos.length === 0 ? <Empty text="Chưa có PO" /> : (
              <div className="space-y-3">
                {pos.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((po) => {
                  const canMarkArrived = po.status === "waiting_delivery" || po.status === "partial";
                  const awaitingKho = po.status === "awaiting_stock_in";
                  const hasRemain = po.lines.some((l) => l.receivedQty < l.quantity);
                  return (
                    <Card key={po.id}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{po.code}</span>
                              {statusBadge(po.status, "po")}
                            </div>
                            <p className="mt-1 text-sm text-zinc-500">
                              NCC: <strong>{po.supplierCode}</strong> — {po.supplierName}
                            </p>
                            <p className="text-sm text-zinc-500">
                              {po.prCode} · {po.departmentName} · {formatDate(po.sentAt || po.createdAt)}
                            </p>
                            {po.note && <p className="mt-1 text-sm text-blue-600">{po.note}</p>}
                          </div>
                          <p className="font-semibold shrink-0">{formatVND(po.totalAmount)}</p>
                        </div>

                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-zinc-400 text-xs border-b">
                              <th className="pb-1">Mã</th>
                              <th className="pb-1">Tên</th>
                              <th className="pb-1">Đặt</th>
                              <th className="pb-1">Đã nhận</th>
                              <th className="pb-1">Còn lại</th>
                              <th className="pb-1 text-right">Đơn giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po.lines.map((l) => (
                              <tr key={l.id} className="border-b border-zinc-50">
                                <td className="py-1.5 font-medium">{l.itemCode}</td>
                                <td className="py-1.5">{l.itemName}</td>
                                <td className="py-1.5">{l.quantity}</td>
                                <td className="py-1.5 text-green-700">{l.receivedQty}</td>
                                <td className="py-1.5 text-amber-700">{Math.max(0, l.quantity - l.receivedQty)}</td>
                                <td className="py-1.5 text-right">{formatVND(l.unitPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {canMarkArrived && (
                            <Button size="sm" onClick={() => handleMarkArrived(po)}>
                              <PackageCheck className="h-4 w-4" /> Nhận hàng (hàng đã về)
                            </Button>
                          )}
                          {awaitingKho && (
                            <span className="text-sm text-amber-700 self-center">Chờ kế toán kho nhập số…</span>
                          )}
                          {(canMarkArrived || awaitingKho) && hasRemain && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openChangeSup(po)}>
                                <RefreshCw className="h-4 w-4" /> Đổi NCC
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openCancel(po)}>
                                <Ban className="h-4 w-4" /> Hủy PO
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(po)}>
                            <Printer className="h-4 w-4" /> In PO/PR
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STOCK IN */}
        {tab === "stock" && (
          stockIns.length === 0 ? <Empty text="Chưa có phiếu nhập kho" /> : (
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
                  <FileSpreadsheet className="h-4 w-4" /> Xuất tất cả → MISA AMIS
                </Button>
              </div>
              {stockIns.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((si) => (
                <Card key={si.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <span className="font-semibold">{si.code}</span>
                      <p className="text-sm text-zinc-500">
                        Từ {si.poCode} / {si.prCode} · {si.departmentName}
                      </p>
                      <p className="text-sm text-zinc-500">
                        Kho: {si.warehouseCode} — {si.warehouseName} · {formatDate(si.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        exportOneStockInToMisa(si, pos);
                        toast.success(`Đã xuất ${si.code}`);
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Excel MISA
                    </Button>
                  </div>
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="text-left text-zinc-400 text-xs">
                        <th className="pb-1">Mã</th>
                        <th className="pb-1">Tên</th>
                        <th className="pb-1">SL nhập</th>
                        <th className="pb-1 text-right">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {si.lines.map((l) => (
                        <tr key={l.id} className="border-t border-zinc-50">
                          <td className="py-1 font-medium">{l.itemCode}</td>
                          <td className="py-1">{l.itemName}</td>
                          <td className="py-1">{l.quantity} {l.unit}</td>
                          <td className="py-1 text-right">{formatVND(l.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ))}
            </div>
          )
        )}
      </main>

      
        {tab === "reports" && (
          <ReportsPanel stockIns={stockIns} pos={pos} prs={prs} />
        )}

{/* Dialogs */}
      <Dialog open={mode === "price" && !!selectedPr} onClose={closeDialog} title={`Gán giá — ${selectedPr?.code ?? ""}`}>
        {selectedPr && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {editLines.map((line) => (
              <div key={line.id} className="rounded-lg border p-3 bg-zinc-50/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{line.itemCode} — {line.itemName}</span>
                  <span className="text-zinc-500">{line.quantity} {line.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Đơn giá</Label>
                    <Input type="number" value={line.unitPrice ?? ""} onChange={(e) => updateEditLine(line.id, "unitPrice", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>NCC</Label>
                    <Select value={line.supplierId || ""} onChange={(e) => updateEditLine(line.id, "supplierId", e.target.value || null)}>
                      <option value="">— Chọn —</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-end border-t pt-2">
              <Button variant="outline" onClick={closeDialog}>Đóng</Button>
              <Button onClick={handleSubmitSign}><PenLine className="h-4 w-4" /> Trình ký</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={mode === "send_po" && !!selectedPr} onClose={closeDialog} title={`Gửi PO — ${selectedPr?.code ?? ""}`}>
        {selectedPr && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">PO sẽ ở trạng thái <strong>Đang chờ giao hàng</strong>.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeDialog}>Hủy</Button>
              <Button onClick={handleSendPO}><Send className="h-4 w-4" /> Xác nhận gửi</Button>
            </div>
          </div>
        )}
      </Dialog>

      

      <Dialog open={mode === "cancel" && !!selectedPo} onClose={closeDialog} title={`Hủy PO — ${selectedPo?.code ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Hủy phần hàng còn lại chưa nhận. Phần đã nhận giữ nguyên trong kho.</p>
          <div>
            <Label>Lý do hủy *</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="BP không cần nữa / NCC không giao..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closeDialog}>Đóng</Button>
            <Button variant="destructive" onClick={handleCancel}><Ban className="h-4 w-4" /> Xác nhận hủy</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={mode === "change_sup" && !!selectedPo} onClose={closeDialog} title={`Đổi NCC — ${selectedPo?.code ?? ""}`}>
        {selectedPo && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Phần còn lại sẽ tạo PO mới cho NCC khác. PO cũ đánh dấu &quot;Đã đổi NCC&quot;.
            </p>
            <div>
              <Label>NCC mới *</Label>
              <Select value={newSupplierId} onChange={(e) => setNewSupplierId(e.target.value)}>
                <option value="">— Chọn NCC —</option>
                {suppliers
                  .filter((s) => s.id !== selectedPo.supplierId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                  ))}
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeDialog}>Hủy</Button>
              <Button onClick={handleChangeSup}><RefreshCw className="h-4 w-4" /> Tạo PO NCC mới</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={mode === "view" && !!selectedPr} onClose={closeDialog} title={selectedPr?.code ?? ""}>
        {selectedPr && (
          <div className="space-y-2 text-sm">
            {statusBadge(selectedPr.status)}
            <p className="text-zinc-500">{selectedPr.departmentName}</p>
            {(selectedPr.approvalHistory || []).map((h) => (
              <div key={h.id} className="text-xs">
                {h.roleLabel} — {h.userName} · {formatDate(h.at)}
                {h.reason && <span className="text-red-600"> · {h.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-white p-4 shadow-sm mb-3">{children}</div>;
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border bg-white p-12 text-center text-zinc-400">
      <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
      <p>{text}</p>
    </div>
  );
}
