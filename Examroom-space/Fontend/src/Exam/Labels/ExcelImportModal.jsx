import React, { useState, useRef, useMemo } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Logo from "./logo.png";

/* ================= helpers ================= */
const getIdConfig = (d) =>
  d?.roomexam?.id_config ??
  d?.roomexam?.Id_config ??
  d?.id_config ??
  d?.ID_CONFIG ??
  d?.exam_config?.id_config ??
  d?.exam_config?.Id_config ??
  d?.combinedItems?.[0]?.roomexam?.id_config ??
  d?.combinedItems?.[0]?.roomexam?.Id_config ??
  d?.combinedItems?.[0]?.id_config ??
  d?.combinedItems?.[0]?.exam_config?.id_config ??
  d?.combinedItems?.[0]?.exam_config?.Id_config ??
  null;

const getRoomId = (d) =>
  d?.rooms?.room_id ??
  d?.rooms?.roomId ??
  d?.rooms?.Room_id ??
  d?.combinedItems?.[0]?.rooms?.room_id ??
  d?.combinedItems?.[0]?.rooms?.roomId ??
  d?.combinedItems?.[0]?.rooms?.Room_id ??
  null;

const getCourseStrict = (d) =>
  d?.roomexam?.Course ?? d?.combinedItems?.[0]?.roomexam?.Course ?? "";

const getIdConfigFromLocal = () => {
  const keys = ["id_config", "CONFIG_ID", "ID_CONFIG"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    const n = v ? Number(v) : 0;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

const isValidCustomRowPattern = (value) => {
  const v = String(value || "").trim();
  if (!v) return false;
  return /^(\d+(\s*-\s*\d+)?)(\s*,\s*\d+(\s*-\s*\d+)?)*$/.test(v);
};

const getSessionText = (timeStr) => {
  if (!timeStr) return "";
  const hour = parseInt(String(timeStr).split(":")[0], 10);
  if (!Number.isFinite(hour)) return "";
  return hour >= 13 ? "สอบบ่าย" : "สอบเช้า";
};

const getSessionColor = (timeStr) => {
  if (!timeStr) return "blue";
  const hour = parseInt(String(timeStr).split(":")[0], 10);
  if (!Number.isFinite(hour)) return "blue";
  return hour >= 13 ? "red" : "blue";
};

const paginateBySeatGroup = (items, maxRowsPerPage = 28) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const grouped = [];
  let currentSeat = null;
  let currentGroup = [];

  for (const item of items) {
    if (item.Seat !== currentSeat) {
      if (currentGroup.length) grouped.push(currentGroup);
      currentSeat = item.Seat;
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }
  }
  if (currentGroup.length) grouped.push(currentGroup);

  const pages = [];
  let currentPage = [];
  let currentCount = 0;

  for (const group of grouped) {
    if (currentCount > 0 && currentCount + group.length > maxRowsPerPage) {
      pages.push(currentPage);
      currentPage = [...group];
      currentCount = group.length;
    } else {
      currentPage.push(...group);
      currentCount += group.length;
    }
  }

  if (currentPage.length) pages.push(currentPage);
  return pages;
};

export function ExcelImportModal({ show, handleClose, onImportSuccess, datas }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [dataSig, setDataSig] = useState([]);
  const [dataSigGroup, setDataSigGroup] = useState([]);

  const [selectedRow, setSelectedRow] = useState(1);
  const [customRow, setCustomRow] = useState("");

  const courseOptions = useMemo(() => {
    const out = new Set();
    if (datas?.combinedItems?.length) {
      datas.combinedItems.forEach((it) => {
        if (it?.roomexam?.Course) out.add(String(it.roomexam.Course).trim());
      });
    } else if (datas?.roomexam?.Course) {
      out.add(String(datas.roomexam.Course).trim());
    }
    return Array.from(out);
  }, [datas]);

  const [selectedCourse, setSelectedCourse] = useState("");
  React.useEffect(() => {
    setSelectedCourse(courseOptions[0] || getCourseStrict(datas) || "");
  }, [courseOptions, datas]);

  const printComponentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: "StudentImportList",
  });

  const handlePrintTwice = () => {
    handlePrint();
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  const roomIdValue = getRoomId(datas);

  const rows = [
    { id: 1, name: "ทั้งหมด" },
    { id: 2, name: "แถวคู่" },
    { id: 3, name: "แถวคี่" },
    { id: 4, name: "กำหนดแถวเอง" },
  ];

  const handleRowSelection = (id) => {
    setSelectedRow(id);
    if (id !== 4) setCustomRow("");
    if (error) setError(null);
  };

  const handleCustomRowChange = (e) => {
    const v = e.target.value;
    if (/^[0-9,\-\s]*$/.test(v)) {
      setCustomRow(v);
      if (error) setError(null);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError(f ? null : "กรุณาเลือกไฟล์ที่ถูกต้อง");
  };

  const handleExportExcel = () => {
    if (!dataSigGroup?.length) {
      setError("ไม่มีข้อมูลที่จะส่งออก โปรดนำเข้าข้อมูลก่อน");
      return;
    }

    const coverData = [
      [],
      ["", "", "", "รายวิชา " + (selectedCourse || "")],
      ["", "", "", "", "สอบวันที่ " + (datas?.roomexam?.Edate || "")],
      ["", "", "", "", "เวลา " + (datas?.roomexam?.Etime || "")],
      ["", "", "", "", "ห้องสอบ " + (datas?.rooms?.room_name || "")],
      [],
    ];

    const sortedGroupData = [...dataSigGroup].sort((a, b) => {
      const isExtraA = a.row > 1000;
      const isExtraB = b.row > 1000;
      if (isExtraA && !isExtraB) return 1;
      if (!isExtraA && isExtraB) return -1;
      return a.row - b.row;
    });

    const leftGroup = sortedGroupData.slice(0, Math.ceil(sortedGroupData.length / 2));
    const rightGroup = sortedGroupData.slice(Math.ceil(sortedGroupData.length / 2));
    const maxRows = Math.max(leftGroup.length, rightGroup.length);

    const studentTable = [["", "แถว", "รหัสประจำตัว", "จำนวนนักศึกษา", "", "แถว", "รหัสประจำตัว", "จำนวนนักศึกษา"]];

    for (let i = 0; i < maxRows; i++) {
      const left = leftGroup[i];
      const right = rightGroup[i];

      studentTable.push([
        "",
        left ? (left.row > 1000 ? `แถวเสริม ${left.row.toString().slice(3)}` : `แถว ${left.row}`) : "",
        left?.range || "",
        left?.count || "",
        "",
        right ? (right.row > 1000 ? `แถวเสริม ${right.row.toString().slice(3)}` : `แถว ${right.row}`) : "",
        right?.range || "",
        right?.count || "",
      ]);
    }

    const combinedData = [...coverData, ...studentTable];
    const sheet = XLSX.utils.aoa_to_sheet(combinedData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "CoverPage");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `CoverPage_${selectedCourse || "Export"}.xlsx`);
  };

  const handleImport = async () => {
    if (!file) {
      setError("กรุณาเลือกไฟล์ Excel");
      return;
    }

    if (selectedRow === 4) {
      const trimmed = String(customRow || "").trim();
      if (!trimmed) {
        setError("กรุณาระบุเลขแถวที่ต้องการ");
        return;
      }
      if (!isValidCustomRowPattern(trimmed)) {
        setError("รูปแบบเลขแถวไม่ถูกต้อง เช่น 1-5 หรือ 1,2,5,7 หรือ 1-3,5,7-9");
        return;
      }
    }

    const roomId = roomIdValue;
    if (!roomId) {
      setError("ไม่พบ room_id ในข้อมูลห้อง");
      return;
    }

    let idConfigValue = getIdConfig(datas);
    const courseValue = (selectedCourse || getCourseStrict(datas) || "").trim();

    if (!idConfigValue) {
      const fromLocal = getIdConfigFromLocal();
      if (fromLocal > 0) idConfigValue = fromLocal;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    const fetchStudents = async (withCourse) => {
      const params = new URLSearchParams({
        room_id: String(roomId),
        mode: (() => {
          if (selectedRow === 2) return "even";
          if (selectedRow === 3) return "odd";
          if (selectedRow === 4 && customRow) return "custom";
          return "all";
        })(),
      });

      if (idConfigValue) params.set("id_config", String(idConfigValue));
      if (selectedRow === 4 && customRow) params.set("custom", customRow.trim());
      if (withCourse && courseValue) params.set("course", courseValue);

      const res = await fetch(`${localStorage.getItem("API")}/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };

    let postErrorMsg = "";

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("room_id", String(roomId));

      if (idConfigValue) fd.append("id_config", String(idConfigValue));
      if (courseValue) fd.append("course", courseValue);

      await axios.post(`${localStorage.getItem("API")}/students/import`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        onUploadProgress: (pe) => {
          if (!pe.total) return;
          setUploadProgress(Math.round((pe.loaded * 100) / pe.total));
        },
      });
    } catch (err) {
      postErrorMsg = err?.response?.data?.message || err?.message || "HTTP 400";
      console.warn("[students/import] warning:", postErrorMsg);
    }

    try {
      let data = await fetchStudents(true);
      if (!data?.students?.length) {
        data = await fetchStudents(false);
      }

      const mapped = (data?.students || []).map((s, i) => ({
        IdStd: s.student_id || "",
        Name: s.student_name || "",
        Dep: s.dep || "",
        Seat: s.seat_no || "",
        _idx: i + 1,
      }));

      setDataSig(mapped);
      setDataSigGroup(Array.isArray(data?.grouped) ? data.grouped : []);

      if (!mapped.length) {
        setError(postErrorMsg || "ไม่พบรายชื่อนักศึกษา");
        return;
      }

      handlePrintTwice();
      onImportSuccess?.(data);
    } catch (err) {
      setError(err?.message || "เกิดข้อผิดพลาดในการดึงข้อมูลหลังนำเข้า");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const groupedData = {};
  dataSig.forEach((item) => {
    if (!groupedData[item.Seat]) {
      groupedData[item.Seat] = [];
    }
    groupedData[item.Seat].push(item);
  });

  const sortedRows = Object.keys(groupedData).sort((a, b) => {
    const isExtraA = a.includes("เสริม") || parseInt(a.replace(/\D/g, ""), 10) > 1000;
    const isExtraB = b.includes("เสริม") || parseInt(b.replace(/\D/g, ""), 10) > 1000;

    if (isExtraA && !isExtraB) return 1;
    if (!isExtraA && isExtraB) return -1;

    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  const sortedData = [];
  sortedRows.forEach((row) => {
    sortedData.push(...groupedData[row]);
  });

  const PrintComponent = React.forwardRef((props, ref) => {
    const pagedData = paginateBySeatGroup(sortedData, 28);

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          padding: "10mm",
          backgroundColor: "white",
          boxSizing: "border-box",
          fontSize: "10pt",
        }}
      >
        <div style={{ pageBreakAfter: "always" }}>
          <CoverPage />
        </div>

        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 5mm 0mm;
            }

            table {
              margin-top: 5mm !important;
              margin-bottom: 5mm !important;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-page {
              page-break-after: always;
            }

            .print-page:last-child {
              page-break-after: auto;
            }

            tr {
              page-break-inside: avoid !important;
            }

            tbody {
              page-break-inside: auto;
            }
          }
        `}</style>

        {pagedData.map((pageItems, pageIndex) => {
          const rowGroups = {};
          let currentColorIndex = 0;
          const startIndex =
            pageIndex === 0
              ? 0
              : pagedData.slice(0, pageIndex).reduce((sum, page) => sum + page.length, 0);

          return (
            <div
              key={pageIndex}
              className="print-page"
              style={{
                pageBreakAfter: pageIndex === pagedData.length - 1 ? "auto" : "always",
              }}
            >
              {pageIndex === 0 && (
                <div style={{ marginBottom: "15px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      margin: 2,
                      fontSize: "14pt",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                      }}
                    >
                      <img src={Logo} style={{ width: "100px", marginRight: "10px" }} alt="SU Logo" />
                      <h3 style={{ margin: 0, fontSize: "16pt" }}>
                        คณะวิทยาศาสตร์ มหาวิทยาลัยศิลปากร
                      </h3>
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "24pt",
                        fontWeight: "bold",
                        color: getSessionColor(datas?.roomexam?.Etime),
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getSessionText(datas?.roomexam?.Etime)}
                    </div>
                  </div>

                  <h3 style={{ margin: "0 0 10px 0", fontSize: "16pt" }}>
                    {selectedCourse || datas?.roomexam?.Course || "No data"}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      margin: 0,
                      fontSize: "14pt",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "10pt" }}>
                      ห้องสอบ {datas?.rooms?.room_name || "No data"}
                    </p>
                    <p style={{ margin: 0, fontSize: "10pt" }}>
                      สอบวันที่ {datas?.roomexam?.Edate || "No data"} เวลา {datas?.roomexam?.Etime || "No data"}
                    </p>
                  </div>

                  <p style={{ margin: "0 0 10px 0", fontSize: "10pt" }}>หมายเหตุ</p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      margin: 0,
                      fontSize: "14pt",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "10pt" }}>นศ.ทั้งหมด ___{dataSig.length || 0}___</p>
                    <p style={{ margin: 0, fontSize: "10pt" }}>ไม่มีสิทธิสอบ ___0___</p>
                    <p style={{ margin: 0, fontSize: "10pt" }}>มีสิทธิสอบ ___{dataSig.length || 0}___</p>
                    <p style={{ margin: 0, fontSize: "10pt" }}>ขาดสอบ ___0___</p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      margin: 0,
                      fontSize: "14pt",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "10pt" }}>
                      กรรมการ 1._____________ 2._____________ 3._____________ 4._____________ 5._____________ 6._____________
                    </p>
                  </div>
                </div>
              )}

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: pageIndex === 0 ? "10px" : "0px",
                  fontSize: "9pt",
                  border: "1px solid black",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "45%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr style={{ textAlign: "center" }}>
                    <th style={{ border: "1px solid black", padding: "5px", backgroundColor: "#f2f2f2" }}>แถว</th>
                    <th style={{ border: "1px solid black", padding: "5px", backgroundColor: "#f2f2f2" }}>ลำดับ</th>
                    <th style={{ border: "1px solid black", padding: "5px", backgroundColor: "#f2f2f2" }}>รหัส</th>
                    <th style={{ border: "1px solid black", padding: "5px", backgroundColor: "#f2f2f2" }}>ชื่อ</th>
                    <th style={{ border: "1px solid black", padding: "5px", backgroundColor: "#f2f2f2" }}>คณะ</th>
                    <th style={{ border: "1px solid black", padding: "5px", backgroundColor: "#f2f2f2" }}>เซ็นชื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, rowIndex) => {
                    if (rowGroups[item.Seat] === undefined) {
                      rowGroups[item.Seat] = currentColorIndex % 2;
                      currentColorIndex++;
                    }

                    const bgColor = rowGroups[item.Seat] === 1 ? "#d9d9d9" : "transparent";

                    return (
                      <tr
                        key={`${pageIndex}-${item.IdStd || rowIndex}`}
                        style={{
                          backgroundColor: bgColor,
                          pageBreakInside: "avoid",
                        }}
                      >
                        <td style={{ border: "1px solid black", padding: "5px", textAlign: "center" }}>
                          {item.Seat}
                        </td>
                        <td style={{ border: "1px solid black", padding: "5px", textAlign: "center" }}>
                          {startIndex + rowIndex + 1}
                        </td>
                        <td style={{ border: "1px solid black", padding: "5px", textAlign: "center" }}>
                          {item.IdStd}
                        </td>
                        <td
                          style={{
                            border: "1px solid black",
                            padding: "5px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.Name}
                        </td>
                        <td
                          style={{
                            border: "1px solid black",
                            padding: "5px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.Dep}
                        </td>
                        <td style={{ border: "1px solid black", padding: "5px" }} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  });

  const CoverPage = React.forwardRef((props, ref) => {
    const buildCoverGroupsFromDataSig = () => {
      if (!Array.isArray(dataSig) || dataSig.length === 0) return [];

      const seatMap = new Map();

      dataSig.forEach((item) => {
        const seatLabel = String(item?.Seat || "").trim();
        const studentId = String(item?.IdStd || "").trim();

        if (!seatLabel) return;

        if (!seatMap.has(seatLabel)) {
          seatMap.set(seatLabel, []);
        }

        if (studentId) {
          seatMap.get(seatLabel).push(studentId);
        }
      });

      const result = [];

      for (const [seatLabel, ids] of seatMap.entries()) {
        const sortedIds = [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const isExtra =
          seatLabel.includes("เสริม") ||
          parseInt(seatLabel.replace(/\D/g, ""), 10) > 1000;

        let rowNumber = 0;

        if (seatLabel.includes("เสริม")) {
          rowNumber = 1000 + (parseInt(seatLabel.replace(/\D/g, ""), 10) || 0);
        } else {
          rowNumber = parseInt(seatLabel.replace(/\D/g, ""), 10) || 0;
        }

        result.push({
          row: rowNumber,
          displayRow: isExtra
            ? `แถวเสริม ${seatLabel.replace(/\D/g, "") || ""}`
            : `แถว ${rowNumber}`,
          range:
            sortedIds.length > 0
              ? `${sortedIds[0]} - ${sortedIds[sortedIds.length - 1]}`
              : "",
          count: sortedIds.length,
          isExtra,
        });
      }

      result.sort((a, b) => {
        if (a.isExtra && !b.isExtra) return 1;
        if (!a.isExtra && b.isExtra) return -1;
        return a.row - b.row;
      });

      return result;
    };

    const coverGroups = buildCoverGroupsFromDataSig();

    const leftSortedGroup = coverGroups.slice(0, Math.ceil(coverGroups.length / 2));
    const rightSortedGroup = coverGroups.slice(Math.ceil(coverGroups.length / 2));

    return (
      <div ref={ref} className="cover-page" style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "26pt",
            color:
              datas?.roomexam?.Etime &&
                parseInt(datas.roomexam.Etime.split(":")[0], 10) >= 13
                ? "red"
                : "blue",
          }}
        >
          {datas?.roomexam?.Etime &&
            (parseInt(datas.roomexam.Etime.split(":")[0], 10) >= 13 ? "สอบบ่าย" : "สอบเช้า")}
        </h1>

        <h1 style={{ fontSize: "26pt" }}>
          รายวิชา {selectedCourse || datas?.roomexam?.Course || "No data"}
          <br />
        </h1>

        <h3 style={{ fontSize: "24pt" }}>
          สอบวันที่ {datas?.roomexam?.Edate || "No data"} เวลา {datas?.roomexam?.Etime || "No data"}
        </h3>

        <h3 style={{ fontSize: "22pt" }}>
          ห้องสอบ {datas?.rooms?.room_name || "No data"}
        </h3>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            gap: 10,
          }}
        >
          {[leftSortedGroup, rightSortedGroup].map((arr, colIdx) => (
            <div key={colIdx} style={{ flex: 1 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "55%" }} />
                  <col style={{ width: "27%" }} />
                </colgroup>

                <thead>
                  <tr style={{ textAlign: "center", background: "#d9d9d9" }}>
                    <th style={{ border: "1px solid #ccc", fontSize: 18 }}>แถว</th>
                    <th
                      style={{
                        border: "1px solid #ccc",
                        fontSize: 18,
                        whiteSpace: "nowrap",
                      }}
                    >
                      รหัสประจำตัว
                    </th>
                    <th style={{ border: "1px solid #ccc", fontSize: 18 }}>
                      จำนวนนักศึกษา
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {arr.map((group, i) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 !== 0 ? "#d9d9d9" : "transparent" }}
                    >
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "15px 5px",
                          whiteSpace: "nowrap",
                          fontSize: group.displayRow.includes("เสริม") ? 12 : 16
                        }}
                      >
                        {group.displayRow}
                      </td>

                      <td
                        style={{
                          border: "1px solid #ccc",
                          fontSize: 16,
                          padding: "15px 5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.range}
                      </td>

                      <td
                        style={{
                          border: "1px solid #ccc",
                          fontSize: 16,
                          padding: "15px 5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  });

  const resetForm = () => {
    setFile(null);
    setError(null);
    setUploadProgress(0);
    setSelectedRow(1);
    setCustomRow("");
    setDataSig([]);
    setDataSigGroup([]);
    handleClose();
  };

  return (
    <>
      <Modal show={show} onHide={resetForm} backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>นำเข้าข้อมูลนักศึกษาจากไฟล์ Excel</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {courseOptions.length > 1 && (
            <Form.Group className="mb-3">
              <Form.Label>เลือกวิชา</Form.Label>
              <Form.Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={loading}
              >
                {courseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>เลือกไฟล์ Excel (.xlsx, .xls)</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              รองรับไฟล์คอลัมน์: IdStd, Name, Dep, Course
            </Form.Text>
          </Form.Group>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

          {loading && (
            <div className="text-center my-3">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">กำลังประมวลผลไฟล์...</p>
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="mt-3">
              <p>กำลังอัพโหลดข้อมูล: {uploadProgress}%</p>
              <div className="progress">
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <Form.Group className="mt-3">
            <Form.Label>เลือกแถวที่ต้องการ</Form.Label>
            <div className="d-flex flex-wrap gap-3">
              {rows.map((r) => (
                <div key={r.id} className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    name="row-select"
                    id={`radio-${r.id}`}
                    checked={selectedRow === r.id}
                    onChange={() => handleRowSelection(r.id)}
                  />
                  <label className="form-check-label" htmlFor={`radio-${r.id}`}>
                    {r.name}
                  </label>
                </div>
              ))}
            </div>
          </Form.Group>

          {selectedRow === 4 && (
            <Form.Group className="mt-3">
              <Form.Label>ระบุเลขแถว (รูปแบบ: 1-5,8,12-14)</Form.Label>
              <Form.Control
                type="text"
                placeholder="ใส่เลขแถวที่ต้องการ เช่น 1-5 หรือ 1,2,5,7"
                value={customRow}
                onChange={handleCustomRowChange}
              />
              <Form.Text className="text-muted">
                รองรับรูปแบบ เช่น 1-5 หรือ 1,2,5,7 หรือ 1-3,5,7-9
              </Form.Text>
            </Form.Group>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={resetForm} disabled={loading}>
            ยกเลิก
          </Button>

          <Button
            variant="primary"
            onClick={handleImport}
            disabled={
              !file ||
              loading ||
              (courseOptions.length > 1 && !selectedCourse) ||
              (selectedRow === 4 && !customRow.trim())
            }
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                กำลังนำเข้า...
              </>
            ) : (
              "นำเข้าข้อมูล"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <div style={{ display: "none" }}>
        <PrintComponent ref={printComponentRef} />
      </div>
    </>
  );
}