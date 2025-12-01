import React, { useEffect, useState, useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import moment from "moment";
import "moment/locale/th";
import Select from "react-select";
import Swal from "sweetalert2";

export default function Signature() {
  const token = localStorage.getItem("token");
  const [roomExamData, setRoomExamData] = useState([]);
  const [ExamData, setExamData] = useState([]);
  const [roomsData, setRoomsData] = useState([]);
  const [select, SetSelect] = useState("ใบ1"); // ใบรับ-ส่ง / ใบส่งต้นฉบับ
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateOptions, setDateOptions] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const tableRef = useRef(null);

  // === แถวว่าง “ไม่ผูกวันที่” ===
  const [extraRowsRoom, setExtraRowsRoom] = useState([]); // สำหรับใบ1 (roomExam)
  const [extraRowsExam, setExtraRowsExam] = useState([]); // สำหรับใบ2 (exam)
  const [addCountRoom, setAddCountRoom] = useState("");
  const [addCountExam, setAddCountExam] = useState("");

  // ดึงข้อมูลหลัก
  const fetchMainData = async () => {
    setIsLoading(true);
    try {
      const [roomExamRes, examRes, roomsRes] = await Promise.all([
        fetch(`${localStorage.getItem("API")}/GetExamtableProctor`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${localStorage.getItem("API")}/select_data/examtable`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${localStorage.getItem("API")}/select_data/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!roomExamRes.ok || !examRes.ok || !roomsRes.ok) {
        throw new Error("One or more API requests failed");
      }

      const [roomExamDataJson, examDataJson, roomsDataJson] = await Promise.all([
        roomExamRes.json(),
        examRes.json(),
        roomsRes.json(),
      ]);

      const validRoomExamData = Array.isArray(roomExamDataJson) ? roomExamDataJson : [];
      const validExamData = Array.isArray(examDataJson) ? examDataJson : [];
      const validRoomsData = Array.isArray(roomsDataJson) ? roomsDataJson : [];

      setRoomExamData(validRoomExamData);
      setExamData(validExamData);
      setRoomsData(validRoomsData);

      // เอาไว้กรอง/พิมพ์ตามวันที่ (ฟิลเตอร์ยังอยู่ แต่ "เพิ่มแถวว่าง" ไม่ใช้วันที่)
      const uniqueDates = [...new Set([
        ...validRoomExamData.map((x) => x?.Edate),
        ...validExamData.map((x) => x?.Edate),
      ])].filter(Boolean);

      const sortedDates = uniqueDates.sort(
        (a, b) =>
          moment(a, "DD/MM/YYYY").valueOf() - moment(b, "DD/MM/YYYY").valueOf()
      );

      setDateOptions(
        sortedDates.map((d) => ({ value: d, label: moment(d, "DD/MM/YYYY").format("DD/MM/YYYY") }))
      );
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
      setHasError(true);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลได้", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    moment.locale("th");
    fetchMainData();
  }, []);

  // พิมพ์
  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
    onBeforeprint: () => setIsPrinting(true),
    onAfterPrint: () => setIsPrinting(false),
    pageStyle: `
      @page { size: A4 landscape; margin: 5mm; }
      @media print {
        body * { visibility: hidden; }
        #printableTable, #printableTable * { visibility: visible; }
        #printableTable {
          position: absolute; left: 10mm; top: 10mm;
          width: 277mm; height: 190mm;
        }
      }
    `,
  });

  // กรองตามวันที่ (เฉพาะข้อมูลจริง) — แถวว่างจะ “ไม่กรอง” และแสดงท้ายตารางเสมอ
  const filterByDate = (data) => {
    if (!selectedDate || !Array.isArray(data)) return data;
    return data.filter((x) => x?.Edate === selectedDate.value);
  };

  // รวมข้อมูลที่จะแสดง
  const mergedRoomRows = useMemo(() => {
    return [...filterByDate(roomExamData), ...extraRowsRoom];
  }, [roomExamData, selectedDate, extraRowsRoom]);

  const mergedExamRows = useMemo(() => {
    return [...filterByDate(ExamData), ...extraRowsExam];
  }, [ExamData, selectedDate, extraRowsExam]);

  // หา Ref ถัดไปจากชุดที่ “กำลังจะแสดง” + แถวว่างเดิม
  const getNextRef = (list) => {
    const refs = list
      .map((x) => Number(String(x?.Ref || 0).replace(/\D/g, "")) || 0)
      .filter((n) => Number.isFinite(n));
    const max = refs.length ? Math.max(...refs) : 0;
    return max + 1;
  };

  // เพิ่มแถวว่าง (ไม่ผูกวันที่)
  const addEmptyRowsRoom = () => {
    const n = parseInt(addCountRoom, 10);
    if (!n || n <= 0) return Swal.fire("กรุณาระบุจำนวนแถว (ใบรับ–ส่ง)", "", "info");
    const startRef = getNextRef(mergedRoomRows);
    const rows = Array.from({ length: n }, (_, i) => ({
      Ref: startRef + i,
      // ช่องทั้งหมดปล่อยว่าง—including Edate
      Edate: "", Etime: "", Hr: "", Course: "", Room_name: "",
      No_st: "", Num_st: "", Lecturer: "", fullnames: "",
      isEmpty: true, _for: "roomExam",
    }));
    setExtraRowsRoom((prev) => [...prev, ...rows]);
    setAddCountRoom("");
  };

  const addEmptyRowsExam = () => {
    const n = parseInt(addCountExam, 10);
    if (!n || n <= 0) return Swal.fire("กรุณาระบุจำนวนแถว (ใบส่งต้นฉบับ)", "", "info");
    const startRef = getNextRef(mergedExamRows);
    const rows = Array.from({ length: n }, (_, i) => ({
      Ref: startRef + i,
      Edate: "", Etime: "", Hr: "", Course: "", Room_name: "",
      No_st: "", Num_st: "", Lecturer: "", fullnames: "",
      isEmpty: true, _for: "exam",
    }));
    setExtraRowsExam((prev) => [...prev, ...rows]);
    setAddCountExam("");
  };

  const clearExtraRows = () => {
    setExtraRowsRoom([]);
    setExtraRowsExam([]);
  };

  const hasAnyRoom = mergedRoomRows.length > 0;
  const hasAnyExam = mergedExamRows.length > 0;

  // ตารางใบรับ–ส่ง
  function Sig({ data, isPrinting }) {
    if (!Array.isArray(data) || data.length === 0) {
      return <div className="text-center p-5"><h3>ยังไม่มีข้อมูล</h3></div>;
    }
    return (
      <table className={`signature-table-exam ${isPrinting ? "is-printing" : ""}`}>
        <thead>
          <tr>
            <th className="purple-bg" style={{ width: "2%", textAlign: "center" }}>Ref</th>
            <th className="purple-bg" style={{ width: "7%", textAlign: "center" }}>เวลา</th>
            <th className="purple-bg" style={{ width: "5%", textAlign: "center" }}>วันที่สอบ</th>
            <th className="purple-bg" style={{ textAlign: "center" }}>ชม.</th>
            <th className="purple-bg" style={{ width: "25%", textAlign: "center" }}>ชื่อวิชา</th>
            <th className="purple-bg" style={{ textAlign: "center" }}>ห้องสอบ</th>
            <th className="purple-bg" style={{ width: "2%", textAlign: "center" }}>No_st</th>
            <th className="purple-bg" style={{ textAlign: "center" }}>กรรมการ</th>
            <th className="purple-bg" style={{ textAlign: "center" }}>จำนวนซองรับ</th>
            <th className="purple-bg" style={{ textAlign: "center", width: "4%" }}>เซ็นรับ</th>
            <th className="purple-bg" style={{ textAlign: "center", width: "4%" }}>จำนวนซองส่ง</th>
            <th className="purple-bg" style={{ textAlign: "center", width: "4%" }}>เซ็นส่ง</th>
            <th className="purple-bg" style={{ width: "2%", textAlign: "center" }}>Ref</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={item.Ref || `r-${idx}`} style={{ height: "60px" }}>
              <td style={{ textAlign: "center" }}>{item.Ref || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Etime || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Edate || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Hr || ""}</td>
              <td>{item.Course || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Room_name || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Num_st || item.No_st || ""}</td>
              <td style={{ whiteSpace: "pre-line", lineHeight: "2.3" }}>{item.fullnames || ""}</td>
              <td></td><td></td><td></td><td></td>
              <td style={{ textAlign: "center" }}>{item.Ref || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ตารางใบส่งต้นฉบับ
  function Sig2({ data, isPrinting }) {
    if (!Array.isArray(data) || data.length === 0) {
      return <div className="text-center p-5"><h3>ยังไม่มีข้อมูล</h3></div>;
    }
    return (
      <table className={`signature-table-exam ${isPrinting ? "is-printing" : ""}`}>
        <thead>
          <tr>
            <th className="orange-bg" style={{ width: "2%", textAlign: "center" }}>Ref</th>
            <th className="orange-bg" style={{ textAlign: "center", width: "7%" }}>เวลา</th>
            <th className="orange-bg" style={{ textAlign: "center", width: "7%" }}>วันที่สอบ</th>
            <th className="orange-bg" style={{ width: "2%", textAlign: "center" }}>ชม.</th>
            <th className="orange-bg" style={{ width: "40%", textAlign: "center" }}>ชื่อวิชา</th>
            <th className="orange-bg" style={{ textAlign: "center" }}>No_st</th>
            <th className="orange-bg" style={{ textAlign: "center" }}>ผู้สอน</th>
            <th className="orange-bg" style={{ width: "5.5%", textAlign: "center" }}>เซ็นส่ง</th>
            <th className="orange-bg" style={{ textAlign: "center", width: "4%" }}>ส่งวันที่</th>
            <th className="orange-bg" style={{ width: "5.5%", textAlign: "center" }}>เซ็นรับ</th>
            <th className="orange-bg" style={{ textAlign: "center", width: "4%" }}>รับวันที่</th>
            <th className="orange-bg" style={{ width: "2%", textAlign: "center" }}>ซอง</th>
            <th className="orange-bg" style={{ width: "2%", textAlign: "center" }}>Ref</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={item.Ref || `e-${idx}`} style={{ height: "60px", fontSize: "12px" }}>
              <td style={{ textAlign: "center" }}>{item.Ref || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Etime || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Edate || ""}</td>
              <td style={{ textAlign: "center" }}>{item.Hr || ""}</td>
              <td>{item.Course || ""}</td>
              <td style={{ textAlign: "center" }}>{item.No_st || ""}</td>
              <td>{item.Lecturer || ""}</td>
              <td></td><td></td><td></td><td></td><td></td>
              <td style={{ textAlign: "center" }}>{item.Ref || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (isLoading) return <div className="text-center p-5"><h3>กำลังโหลดข้อมูล...</h3></div>;
  if (hasError) return <div className="text-center p-5 text-danger"><h3>เกิดข้อผิดพลาดในการโหลดข้อมูล</h3></div>;

  return (
    <div className={`signature-container ${isPrinting ? "landscape" : ""}`}>
      <style jsx>{`
        .signature-container { width: 100%; }
        .signature-table-exam { width: 100%; border-collapse: collapse; }
        .signature-table-exam th, .signature-table-exam td {
          border: 1px solid black; padding: 2px;
        }
        .purple-bg { background-color: purple; color: white; }
        .orange-bg { background-color: orange; }
        @media screen { .signature-table-exam th, .signature-table-exam td { font-size: 12px; } }
        @media print {
          .no-print { display: none !important; }
          #printableTable { page-break-after: always; }
          .signature-table-exam { width: 100%; height: 100%; font-size: 10px; }
          .signature-table-exam th, .signature-table-exam td { padding: 1px 2px; border: .5px solid #000; }
          .purple-bg { background-color: purple !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .orange-bg { background-color: orange !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print">
        <h2>ใบรับ-ส่งข้อสอบ</h2>

        {/* Controls Top */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ width: "300px" }}
            disabled={(select === "ใบ1" && !hasAnyRoom) || (select === "ใบ2" && !hasAnyExam)}
          >
            พิมพ์ ใบรับ-ส่งข้อสอบ
          </button>

          <Select
            value={selectedDate}
            onChange={setSelectedDate}
            options={dateOptions}
            isClearable
            placeholder="กรองตามวันที่ (ไม่บังคับ)"
            styles={{
              control: (base) => ({ ...base, minWidth: 260 }),
              menu: (base) => ({ ...base, zIndex: 9999 }),
            }}
          />

          {/* เพิ่มแถวว่างแบบไม่ผูกวันที่ */}
          {select === "ใบ1" ? (
            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                min="1"
                value={addCountRoom}
                onChange={(e) => setAddCountRoom(e.target.value)}
                className="form-control"
                placeholder="จำนวนแถว(ใบรับ–ส่ง)"
                style={{ width: 200 }}
              />
              <button className="btn btn-outline-secondary" onClick={addEmptyRowsRoom}>
                เพิ่มแถว(ใบรับ–ส่ง)
              </button>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                min="1"
                value={addCountExam}
                onChange={(e) => setAddCountExam(e.target.value)}
                className="form-control"
                placeholder="จำนวนแถว(ใบส่งต้นฉบับ)"
                style={{ width: 220 }}
              />
              <button className="btn btn-outline-secondary" onClick={addEmptyRowsExam}>
                เพิ่มแถว(ใบส่งต้นฉบับ)
              </button>
            </div>
          )}

          <button className="btn btn-outline-danger" onClick={clearExtraRows}>
            ล้างแถวว่างทั้งหมด
          </button>
        </div>

        <select className="form-select form-select-lg mb-3" onChange={(e) => SetSelect(e.target.value)} value={select}>
          <option value="ใบ1">ใบเซ็นรับส่งข้อสอบ</option>
          <option value="ใบ2">ใบเซ็นส่งต้นฉบับ</option>
        </select>
      </div>

      <div id="printableTable" ref={tableRef}>
        {select === "ใบ1" ? (
          hasAnyRoom ? <Sig data={mergedRoomRows} isPrinting={isPrinting} /> :
          <div className="text-center p-5"><h3>ยังไม่มีข้อมูล</h3></div>
        ) : (
          hasAnyExam ? <Sig2 data={mergedExamRows} isPrinting={isPrinting} /> :
          <div className="text-center p-5"><h3>ยังไม่มีข้อมูล</h3></div>
        )}
      </div>
    </div>
  );
}
