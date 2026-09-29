"use client";

import type { StockIn, PurchaseOrder } from "@/types";

/** Lấy số PO gọn: PO-2026-1100 → 1100, hoặc giữ nguyên nếu không match */
export function shortPoNumber(poCode: string): string {
  const m = poCode.match(/(\d+)$/);
  return m ? String(parseInt(m[1], 10)) : poCode;
}

/**
 * Diễn giải kiểu bạn dùng IF trên Excel:
 * "Mua hàng hoá, NVL cho BP {tên BP} theo PO số {số PO}"
 */
export function misaDescription(departmentName: string, poCode: string): string {
  const poNum = shortPoNumber(poCode);
  return `Mua hàng hoá, NVL cho BP ${departmentName} theo PO số ${poNum}`;
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = "\uFEFF";
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  const blob = new Blob([bom + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateYmd(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

/**
 * Xuất 1 hoặc nhiều phiếu NK → file CSV mở bằng Excel, import MISA AMIS.
 * Cột bám mẫu nhập kho phổ biến + diễn giải theo mã kho / PO như bạn mô tả.
 */
export function exportStockInsToMisaExcel(
  stockIns: StockIn[],
  pos: PurchaseOrder[],
  filename?: string
) {
  if (!stockIns.length) return false;

  const headers = [
    "Ngay_hach_toan",
    "Ngay_chung_tu",
    "So_phieu_NK",
    "Ma_kho",
    "Ten_kho",
    "So_PO",
    "So_PO_day_du",
    "Ma_NCC",
    "Ten_NCC",
    "Ma_BP",
    "Ten_BP",
    "Ma_hang",
    "Ten_hang",
    "DVT",
    "So_luong",
    "Don_gia",
    "Thanh_tien",
    "Dien_giai",
  ];

  const rows: (string | number)[][] = [];

  for (const si of stockIns) {
    const po = pos.find((p) => p.id === si.poId);
    const dienGiai = misaDescription(si.departmentName, si.poCode);
    const ngay = formatDateYmd(si.createdAt);
    const soPo = shortPoNumber(si.poCode);

    for (const line of si.lines) {
      rows.push([
        ngay,
        ngay,
        si.code,
        si.warehouseCode,
        si.warehouseName,
        soPo,
        si.poCode,
        po?.supplierCode ?? "",
        po?.supplierName ?? "",
        "", // Ma_BP — điền nếu map mã MISA
        si.departmentName,
        line.itemCode,
        line.itemName,
        line.unit,
        line.quantity,
        line.unitPrice,
        Math.round(line.quantity * line.unitPrice),
        dienGiai,
      ]);
    }
  }

  const name =
    filename ||
    `MISA-NhapKho-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(name, headers, rows);
  return true;
}

/** Xuất 1 phiếu NK */
export function exportOneStockInToMisa(si: StockIn, pos: PurchaseOrder[]) {
  return exportStockInsToMisaExcel([si], pos, `MISA-NK-${si.code}.csv`);
}
