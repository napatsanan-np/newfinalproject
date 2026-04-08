// EditImportedData.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Table,
  Button,
  Form,
  Spinner,
  Row,
  Col,
  Modal,
} from "react-bootstrap";

const URL = localStorage.getItem("API");
const token = localStorage.getItem("token");
const authHeaders = { Authorization: `Bearer ${token}` };

const showErrorMessenger = ({
  title = "เกิดข้อผิดพลาด",
  message = "ระบบทำรายการไม่สำเร็จ",
  solutions = [],
  icon = "error",
  confirmButtonColor = "#dc3545",
}) => {
  const solutionHtml =
    solutions && solutions.length
      ? `
        <hr/>
        <p class="text-start">
          <strong>วิธีแก้ปัญหา:</strong><br/>
          ${solutions.map((s) => `- ${s}<br/>`).join("")}
        </p>
      `
      : "";

  Swal.fire({
    title,
    html: `
      <p>${message}</p>
      ${solutionHtml}
    `,
    icon,
    confirmButtonColor,
  });
};

const alertError = (err, contextAction = "ทำรายการ") => {
  const status = err?.response?.status;
  const backendMsg =
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    "";

  console.error("API ERROR ::", err?.response || err);

  // 1) Network / server ไม่ตอบ
  if (!err?.response) {
    showErrorMessenger({
      title: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
      message: `ระบบไม่สามารถ${contextAction}ได้ในขณะนี้`,
      solutions: [
        "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ",
        "ลองรีเฟรชหน้าเว็บ แล้วทำรายการใหม่อีกครั้ง",
        "หากยังมีปัญหา อาจเกิดจากเซิร์ฟเวอร์ กรุณาแจ้งผู้ดูแลระบบ",
      ],
      icon: "error",
      confirmButtonColor: "#dc3545",
    });
    return;
  }

  // 2) Token / สิทธิ์
  if (status === 401 || status === 403) {
    showErrorMessenger({
      title: "หมดอายุการเข้าสู่ระบบ หรือไม่มีสิทธิ์ใช้งาน",
      message: `ระบบไม่สามารถ${contextAction}ได้ เพราะสิทธิ์ไม่เพียงพอ หรือ Token หมดอายุ`,
      solutions: [
        "ออกจากระบบ แล้วเข้าสู่ระบบใหม่อีกครั้ง",
        "ตรวจสอบว่าใช้บัญชีที่มีสิทธิ์เข้าถึงฟีเจอร์นี้ได้ไหม",
        "หากยังใช้งานไม่ได้ กรุณาแจ้งผู้ดูแลระบบ",
      ],
      icon: "error",
      confirmButtonColor: "#dc3545",
    });
    return;
  }

  // 3) ไม่พบ API / path ผิด
  if (status === 404) {
    showErrorMessenger({
      title: "ไม่พบบริการที่ต้องใช้ ( ไม่พบ API)",
      message: `ระบบไม่สามารถ${contextAction}ได้ เพราะไม่พบเส้น API ที่เรียกใช้งาน`,
      solutions: [
        "ตรวจสอบว่า backend เปิดทำงานอยู่",
      ],
      icon: "error",
      confirmButtonColor: "#dc3545",
    });
    return;
  }

  // 4) Server error
  if (status >= 500) {
    showErrorMessenger({
      title: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์",
      message: backendMsg || `ระบบไม่สามารถ${contextAction}ได้ (Server Error)`,
      solutions: [
        "ลองทำรายการซ้ำอีกครั้งในภายหลัง",
        "รีเฟรชหน้าเว็บแล้วลองใหม่",
        "หากยังเกิดซ้ำ กรุณาแจ้งผู้ดูแลระบบพร้อมภาพหน้าจอ/เวลาที่เกิดปัญหา",
      ],
      icon: "error",
      confirmButtonColor: "#dc3545",
    });
    return;
  }

  // 5) เคสทั่วไป (400/422/etc.)
  showErrorMessenger({
    title: "เกิดข้อผิดพลาด",
    message: backendMsg || `ระบบไม่สามารถ${contextAction}ได้`,
    solutions: [
      "ตรวจสอบข้อมูลที่กรอก/แก้ไขว่าถูกต้องครบถ้วน",
      "ลองรีเฟรชหน้าเว็บแล้วทำรายการใหม่อีกครั้ง",
      "หากยังมีปัญหา กรุณาแจ้งผู้ดูแลระบบ",
    ],
    icon: "error",
    confirmButtonColor: "#dc3545",
  });
};

// แปลงคีย์ตัวเลขให้เป็น number
const toIntIfNeeded = (obj, numberKeys = []) => {
  const out = { ...obj };
  numberKeys.forEach((k) => {
    if (k in out && out[k] !== "" && out[k] !== null && out[k] !== undefined) {
      const n = Number(out[k]);
      out[k] = Number.isNaN(n) ? out[k] : n;
    }
  });
  return out;
};

/* =========================================================
 * 1) ตารางสอบ (examtable)  -> มี No_st
 * ========================================================= */
const Examtable = () => {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    Ref: "",
    Edate: "",
    Etime: "",
    Hr: "",
    Course: "",
    Lecturer: "",
    No_st: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔹 ใช้ API ใหม่ที่มี No_st
      const res = await axios.get(`${URL}/select_data/examtable_all`, {
        headers: authHeaders,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      alertError(e, "โหลดข้อมูลตารางสอบ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((r) =>
      String(r.Course ?? "").toLowerCase().includes(key)
    );
  }, [rows, q]);

  const openModal = (row) => {
    setForm({
      Ref: row.Ref ?? row.ref ?? "",
      Edate: row.Edate ?? row.edate ?? "",
      Etime: row.Etime ?? row.etime ?? "",
      Hr: row.Hr ?? row.hr ?? "",
      Course: row.Course ?? row.course ?? "",
      Lecturer: row.Lecturer ?? row.lecturer ?? "",
      No_st: row.No_st ?? row.no_st ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = toIntIfNeeded(form, ["Ref", "Hr", "No_st"]);
      await axios.post(`${URL}/admin/update/examtable`, payload, {
        headers: authHeaders,
      });
      Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกข้อมูลแล้ว",
        icon: "success",
        confirmButtonColor: "#28a745",
      });
      setOpen(false);
      fetchData();
    } catch (e) {
      alertError(e, "อัปเดตข้อมูลตารางสอบ");
    }
  };

  return (
    <>
      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Control
            placeholder="ค้นหาโดยชื่อวิชา (Course)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-3">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Ref</th>
              <th>Course</th>
              <th style={{ width: 90 }}>No_st</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.Ref ?? r.ref}>
                <td>{r.Ref ?? r.ref}</td>
                <td>{r.Course ?? r.course}</td>
                <td>{r.No_st ?? r.no_st}</td>
                <td>
                  <Button size="sm" onClick={() => openModal(r)}>
                    แก้ไข
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={open} onHide={() => setOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>แก้ไข – {form.Course}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(form).map((k) => (
            <Form.Group className="mb-3" key={k}>
              <Form.Label>{k}</Form.Label>
              <Form.Control
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="success" onClick={save}>
            บันทึก
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

/* =========================================================
 * 2) ห้องสอบ (roomexam) -> ใช้ Num_st
 * ========================================================= */
const Roomexam = () => {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    No: "",
    Ref: "",
    Edate: "",
    Etime: "",
    Hr: "",
    Course: "",
    Lecturer: "",
    Room_id: "",
    Seatrow: "",
    Type_exam: "",
    Group_exam: "",
    Num_st: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔹 ใช้ API ใหม่ที่มี Num_st
      const res = await axios.get(`${URL}/select_data/roomexam_all`, {
        headers: authHeaders,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      alertError(e, "โหลดข้อมูลห้องสอบ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((r) =>
      String(r.Course ?? "").toLowerCase().includes(key)
    );
  }, [rows, q]);

  const openModal = (row) => {
    setForm({
      No: row.No ?? row.no ?? "",
      Ref: row.Ref ?? row.ref ?? "",
      Edate: row.Edate ?? row.edate ?? "",
      Etime: row.Etime ?? row.etime ?? "",
      Hr: row.Hr ?? row.hr ?? "",
      Course: row.Course ?? row.course ?? "",
      Lecturer: row.Lecturer ?? row.lecturer ?? "",
      Room_id: row.Room_id ?? row.room_id ?? "",
      Seatrow: row.Seatrow ?? row.seatrow ?? "",
      Type_exam: row.Type_exam ?? row.type_exam ?? "",
      Group_exam: row.Group_exam ?? row.group_exam ?? "",
      Num_st: row.Num_st ?? row.num_st ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = toIntIfNeeded(form, ["No", "Ref", "Hr", "Room_id", "Num_st"]);
      await axios.post(`${URL}/admin/update/roomexam`, payload, {
        headers: authHeaders,
      });
      Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกข้อมูลแล้ว",
        icon: "success",
        confirmButtonColor: "#28a745",
      });
      setOpen(false);
      fetchData();
    } catch (e) {
      alertError(e, "อัปเดตข้อมูลห้องสอบ");
    }
  };

  return (
    <>
      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Control
            placeholder="ค้นหาโดยชื่อวิชา (Course)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-3">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{ width: 70 }}>No</th>
              <th style={{ width: 70 }}>Ref</th>
              <th>Course</th>
              <th style={{ width: 90 }}>Num_st</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={`${r.No ?? r.no}-${r.Ref ?? r.ref}-${idx}`}>
                <td>{r.No ?? r.no}</td>
                <td>{r.Ref ?? r.ref}</td>
                <td>{r.Course ?? r.course}</td>
                <td>{r.Num_st ?? r.num_st}</td>
                <td>
                  <Button size="sm" onClick={() => openModal(r)}>
                    แก้ไข
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={open} onHide={() => setOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>แก้ไข – {form.Course}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(form).map((k) => (
            <Form.Group className="mb-3" key={k}>
              <Form.Label>{k}</Form.Label>
              <Form.Control
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="success" onClick={save}>
            บันทึก
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

/* ===== 3) รายละเอียดข้อสอบ (detail_exam) ===== */
const DetailExam = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    Ref: "",
    Submit: "",
    Sub_date: "",
    Copy: "",
    Page: "",
    Recive: "",
    Rec_date: "",
    Qty: "",
    Staple_conner: "",
    Staple_apart: "",
    Calculator: "",
    Answesheet: "",
    Answerbook_use: "",
    Remark: "",
    Color: "",
    Lecturer: "",
    No_st: "",
    Fileexam: "",
    Exam_type: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${URL}/select_data/detail_exam_all`, {
        headers: authHeaders,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      alertError(e, "โหลดรายละเอียดข้อสอบ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (r) => {
    setForm({
      Ref: r.Ref ?? r.ref ?? "",
      Submit: r.Submit ?? r.submit ?? "",
      Sub_date: r.Sub_date ?? r.sub_date ?? "",
      Copy: r.Copy ?? r.copy ?? "",
      Page: r.Page ?? r.page ?? "",
      Recive: r.Recive ?? r.recive ?? "",
      Rec_date: r.Rec_date ?? r.rec_date ?? "",
      Qty: r.Qty ?? r.qty ?? "",
      Staple_conner: r.Staple_conner ?? r.staple_conner ?? "",
      Staple_apart: r.Staple_apart ?? r.staple_apart ?? "",
      Calculator: r.Calculator ?? r.calculator ?? "",
      Answesheet: r.Answesheet ?? r.answesheet ?? "",
      Answerbook_use: r.Answerbook_use ?? r.answerbook_use ?? "",
      Remark: r.Remark ?? r.remark ?? "",
      Color: r.Color ?? r.color ?? "",
      Lecturer: r.Lecturer ?? r.lecturer ?? "",
      No_st: r.No_st ?? r.no_st ?? "",
      Fileexam:
        r.Fileexam ??
        (Array.isArray(r.Files) ? r.Files.join(", ") : r.Files ?? ""),
      Exam_type: r.Exam_type ?? r.exam_type ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = toIntIfNeeded(form, ["Ref", "Copy", "Page", "Qty", "No_st"]);
      await axios.post(`${URL}/admin/update/detail_exam`, payload, {
        headers: authHeaders,
      });
      Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกข้อมูลแล้ว",
        icon: "success",
        confirmButtonColor: "#28a745",
      });
      setOpen(false);
      fetchData();
    } catch (e) {
      alertError(e, "อัปเดตรายละเอียดข้อสอบ");
    }
  };

  return (
    <>
      {loading ? (
        <div className="text-center py-3">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Ref</th>
              <th>Submit</th>
              <th>Exam_type</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.Ref ?? r.ref}-${idx}`}>
                <td>{r.Ref ?? r.ref}</td>
                <td>{r.Submit ?? r.submit}</td>
                <td>{r.Exam_type ?? r.exam_type}</td>
                <td>
                  <Button size="sm" onClick={() => openModal(r)}>
                    แก้ไข
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={open} onHide={() => setOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>แก้ไขรายละเอียดข้อสอบ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(form).map((k) => (
            <Form.Group className="mb-3" key={k}>
              <Form.Label>{k}</Form.Label>
              <Form.Control
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="success" onClick={save}>
            บันทึก
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
const EditImportedData = () => {
  return (
    <div>
      <h4 className="mb-3">แก้ไขข้อมูล</h4>
      <Examtable />
    </div>
  );
};

export default EditImportedData;