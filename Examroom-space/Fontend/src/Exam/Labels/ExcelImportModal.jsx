// ExcelImportModal.jsx
import React, { useState, useRef, useMemo } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


/* ================= helpers (เดิม) ================= */
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

  const printRef = useRef();
  const printOnce = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "StudentImportList",
  });
  const handlePrintTwice = () => { printOnce(); setTimeout(() => printOnce(), 500); };

  const rows = [
    { id: 1, name: "ทั้งหมด" },
    { id: 2, name: "แถวคู่" },
    { id: 3, name: "แถวคี่" },
    { id: 4, name: "กำหนดแถวเอง" },
  ];
  const handleRowSelection = (id) => { setSelectedRow(id); if (id !== 4) setCustomRow(""); };
  const handleCustomRowChange = (e) => { const v = e.target.value; if (!v || Number(v) > 0) setCustomRow(v); };
  const handleFileChange = (e) => { const f = e.target.files?.[0]; setFile(f || null); setError(f ? null : "กรุณาเลือกไฟล์ที่ถูกต้อง"); };

  /* ======= เตรียมค่าพื้นฐาน + ตรวจห้อง ======= */
  const roomIdValue = getRoomId(datas);

  /* ===================== Export cover Excel ===================== */
  const handleExportExcel = () => {
    if (!dataSigGroup?.length) { setError("ไม่มีข้อมูลที่จะส่งออก โปรดนำเข้าข้อมูลก่อน"); return; }
    const coverData = [
      [],
      ["", "", "", "รายวิชา " + (selectedCourse || "")],
      ["", "", "", "", "สอบวันที่ " + (datas?.roomexam?.Edate || "")],
      ["", "", "", "", "เวลา " + (datas?.roomexam?.Etime || "")],
      ["", "", "", "", "ห้องสอบ " + (datas?.rooms?.room_name || "")],
      [],
    ];
    const left = dataSigGroup.slice(0, Math.ceil(dataSigGroup.length / 2));
    const right = dataSigGroup.slice(Math.ceil(dataSigGroup.length / 2));
    const maxRows = Math.max(left.length, right.length);
    const table = [["", "แถว", "รหัสประจำตัว", "จำนวนนักศึกษา", "", "แถว", "รหัสประจำตัว", "จำนวนนักศึกษา"]];
    for (let i = 0; i < maxRows; i++) {
      const L = left[i], R = right[i];
      table.push([
        "",
        L ? (L.row > 1000 ? `แถวเสริม ${String(L.row).slice(3)}` : `แถว ${L.row}`) : "",
        L?.range || "", L?.count || "",
        "",
        R ? (R.row > 1000 ? `แถวเสริม ${String(R.row).slice(3)}` : `แถว ${R.row}`) : "",
        R?.range || "", R?.count || "",
      ]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...coverData, ...table]);
    XLSX.utils.book_append_sheet(wb, ws, "CoverPage");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `CoverPage_${selectedCourse || "Export"}.xlsx`);
  };

  /* ===================== Import Excel -> GET รายชื่อ ===================== */
  /* ===================== Import Excel -> GET รายชื่อ ===================== */
  const handleImport = async () => {
    if (!file) { setError("กรุณาเลือกไฟล์ Excel"); return; }

    const roomId = roomIdValue; // ✅ ใช้ตัวจริง
    if (!roomId) { setError("ไม่พบ room_id ในข้อมูลห้อง"); return; }

    let idConfigValue = getIdConfig(datas); // ✅ optional
    const courseValue = (selectedCourse || getCourseStrict(datas) || "").trim();

    if (!idConfigValue) {
      const fromLocal = getIdConfigFromLocal();
      if (fromLocal > 0) idConfigValue = fromLocal;
    }
    // ตอนนี้ idConfigValue อาจเป็น null/0 ได้ (โอเค)

    setLoading(true); setError(null); setUploadProgress(0);

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

      // ✅ ส่ง id_config เฉพาะตอนมีค่า (วิธี A)
      if (idConfigValue) params.set("id_config", String(idConfigValue));

      if (selectedRow === 4 && customRow) params.set("custom", customRow);
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

      // ✅ ส่ง id_config เฉพาะตอนมีค่า (วิธี A)
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
      setLoading(false); setUploadProgress(0);
    }
  };


  /* ===================== ส่วนพิมพ์ ===================== */
  const PrintComponent = React.forwardRef((props, ref) => {
    const grouped = dataSig.reduce((acc, it) => {
      acc[it.Seat] = acc[it.Seat] || [];
      acc[it.Seat].push(it);
      return acc;
    }, {});
    const sortedRowKeys = Object.keys(grouped).sort((a, b) => {
      const exA = a.includes("เสริม"), exB = b.includes("เสริม");
      if (exA !== exB) return exA ? 1 : -1;
      const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
    const flat = sortedRowKeys.flatMap((k) => grouped[k]);

    const rowFlag = {};
    let colorIndex = 0;

    return (
      <div ref={ref} style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", padding: "10mm", background: "white", boxSizing: "border-box", fontSize: "10pt" }}>
        <div style={{ pageBreakAfter: "always" }}>
          <CoverPage />
        </div>

        <style>{`
          @media print {
            @page { size: A4; margin: 5mm 0mm; }
            body { -webkit-print-color-adjust: exact; }
          }
        `}</style>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: "9pt", border: "1px solid black", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "12%" }} /><col style={{ width: "8%" }} />
            <col style={{ width: "15%" }} /><col style={{ width: "45%" }} />
            <col style={{ width: "25%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr style={{ textAlign: "center" }}>
              <th style={{ border: "1px solid black", padding: 5, background: "#f2f2f2" }}>แถว</th>
              <th style={{ border: "1px solid black", padding: 5, background: "#f2f2f2" }}>ลำดับ</th>
              <th style={{ border: "1px solid black", padding: 5, background: "#f2f2f2" }}>รหัส</th>
              <th style={{ border: "1px solid black", padding: 5, background: "#f2f2f2" }}>ชื่อ</th>
              <th style={{ border: "1px solid black", padding: 5, background: "#f2f2f2" }}>คณะ</th>
              <th style={{ border: "1px solid black", padding: 5, background: "#f2f2f2" }}>เซ็นชื่อ</th>
            </tr>
          </thead>
          <tbody>
            {flat.map((it, idx) => {
              if (rowFlag[it.Seat] === undefined) { rowFlag[it.Seat] = colorIndex % 2; colorIndex++; }
              const bg = rowFlag[it.Seat] === 1 ? "#d9d9d9" : "transparent";
              return (
                <tr key={`${it.IdStd}-${idx}`} style={{ background: bg }}>
                  <td style={{ border: "1px solid black", padding: 5, textAlign: "center" }}>{it.Seat}</td>
                  <td style={{ border: "1px solid black", padding: 5, textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ border: "1px solid black", padding: 5, textAlign: "center" }}>{it.IdStd}</td>
                  <td style={{ border: "1px solid black", padding: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.Name}</td>
                  <td style={{ border: "1px solid black", padding: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.Dep}</td>
                  <td style={{ border: "1px solid black", padding: 5 }} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  });

  const CoverPage = React.forwardRef((props, ref) => {
    const sortedGroup = [...dataSigGroup].sort((a, b) => {
      const exA = a.row > 1000, exB = b.row > 1000;
      if (exA !== exB) return exA ? 1 : -1;
      return a.row - b.row;
    });
    const left = sortedGroup.slice(0, Math.ceil(sortedGroup.length / 2));
    const right = sortedGroup.slice(Math.ceil(sortedGroup.length / 2));
    return (
      <div ref={ref} className="cover-page" style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "26pt", color: datas?.roomexam?.Etime && parseInt(datas.roomexam.Etime.split(":")[0], 10) >= 13 ? "red" : "blue" }}>
          {datas?.roomexam?.Etime && (parseInt(datas.roomexam.Etime.split(":")[0], 10) >= 13 ? "สอบบ่าย" : "สอบเช้า")}
        </h1>
        <h1 style={{ fontSize: "26pt" }}>รายวิชา {selectedCourse || (datas?.roomexam?.Course || "No data")}<br /></h1>
        <h3 style={{ fontSize: "24pt" }}>สอบวันที่ {datas?.roomexam?.Edate || "No data"} เวลา {datas?.roomexam?.Etime || "No data"}</h3>
        <h3 style={{ fontSize: "22pt" }}>ห้องสอบ {datas?.rooms?.room_name || "No data"}</h3>

        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 10 }}>
          {[left, right].map((arr, colIdx) => (
            <div key={colIdx} style={{ flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "center", background: "#d9d9d9" }}>
                    <th style={{ border: "1px solid #ccc", fontSize: 18 }}>แถว</th>
                    <th style={{ border: "1px solid #ccc", fontSize: 18, whiteSpace: "nowrap" }}>รหัสประจำตัว</th>
                    <th style={{ border: "1px solid #ccc", fontSize: 18 }}>จำนวนนักศึกษา</th>
                  </tr>
                </thead>
                <tbody>
                  {arr.map((g, i) => (
                    <tr key={i} style={{ background: i % 2 !== 0 ? "#d9d9d9" : "transparent" }}>
                      <td style={{ border: "1px solid #ccc", fontSize: 16, padding: "15px 5px", whiteSpace: "nowrap" }}>
                        {g.row > 1000 ? `แถวเสริม ${String(g.row).slice(3)}` : `แถว ${g.row}`}
                      </td>
                      <td style={{ border: "1px solid #ccc", fontSize: 16, padding: "15px 5px", whiteSpace: "nowrap" }}>{g.range}</td>
                      <td style={{ border: "1px solid #ccc", fontSize: 16, padding: "15px 5px", whiteSpace: "nowrap" }}>{g.count}</td>
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
    setFile(null); setError(null); setUploadProgress(0);
    setSelectedRow(1); setCustomRow("");
    setDataSig([]); setDataSigGroup([]);
    handleClose();
  };

  return (
    <>
      <Modal show={show} onHide={resetForm} backdrop="static" size="lg">
        <Modal.Header closeButton><Modal.Title>นำเข้าข้อมูลนักศึกษาจากไฟล์ Excel</Modal.Title></Modal.Header>
        <Modal.Body>
          {/* ซ่อน dropdown วิชา เมื่อมีเพียง 1 วิชา */}
          {courseOptions.length > 1 && (
            <Form.Group className="mb-3">
              <Form.Label>เลือกวิชา</Form.Label>
              <Form.Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} disabled={loading}>
                {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </Form.Select>
            </Form.Group>
          )}

          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>เลือกไฟล์ Excel (.xlsx, .xls)</Form.Label>
            <Form.Control type="file" accept=".xlsx, .xls" onChange={handleFileChange} disabled={loading} />
            <Form.Text className="text-muted">รองรับไฟล์คอลัมน์: IdStd, Name, Dep, Course</Form.Text>
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
                <div className="progress-bar" role="progressbar" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <Form.Group className="mt-3">
            <Form.Label>เลือกแถวที่ต้องการ</Form.Label>
            <div className="d-flex flex-wrap gap-3">
              {rows.map((r) => (
                <div key={r.id} className="form-check">
                  <input type="radio" className="form-check-input" name="row-select" id={`radio-${r.id}`}
                    checked={selectedRow === r.id} onChange={() => handleRowSelection(r.id)} />
                  <label className="form-check-label" htmlFor={`radio-${r.id}`}>{r.name}</label>
                </div>
              ))}
            </div>
          </Form.Group>

          {selectedRow === 4 && (
            <Form.Group className="mt-3">
              <Form.Label>ระบุเลขแถว (รูปแบบ: 1-5,8,12-14)</Form.Label>
              <Form.Control type="text" placeholder="ใส่เลขแถวที่ต้องการ" value={customRow} onChange={handleCustomRowChange} />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={resetForm} disabled={loading}>ยกเลิก</Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={
              !file ||
              loading ||
              (courseOptions.length > 1 && !selectedCourse) ||
              (selectedRow === 4 && !customRow)
            }
          >
            {loading ? <> <Spinner as="span" animation="border" size="sm" className="me-2" /> กำลังนำเข้า... </> : "นำเข้าข้อมูล"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* เนื้อหาสำหรับพิมพ์ */}
      <div style={{ display: "none" }}><PrintComponent ref={printRef} /></div>
    </>
  );
}
