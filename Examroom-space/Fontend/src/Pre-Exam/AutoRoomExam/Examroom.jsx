import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Row,
  Col,
  Spinner,
  Form,
  InputGroup,
} from "react-bootstrap";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import {
  FaSearch,
  FaBuilding,
  FaChair,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "./AvailableRooms.css";

const AvailableRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("room_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const token = localStorage.getItem("token");
  const API_URL = localStorage.getItem("API");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/select_data/rooms`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch rooms data");

      const roomsData = await response.json();
      setRooms(roomsData || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลห้องได้",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ===== ประเภทห้อง =====
  const roomTypes = ["ห้องบรรยาย(สโลป)", "ห้องบรรยาย(ปกติ)", "ห้องปฏิบัติการ"];
  const isSlopeType = (v) => String(v || "").trim() === "ห้องบรรยาย(สโลป)";

  // ===== helpers =====
  const toInt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  };

  // ===== Seat Plan API (NEW for option B) =====
  const fetchSeatPlanByRoomId = async (roomId) => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/seat-plan`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch seat plan");
    }

    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  // ✅ NEW: upsert seat plan (PUT /rooms/:id/seat-plan)
  const upsertSeatPlanByRoomId = async (roomId, seatPlan) => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/seat-plan`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // body ต้องเป็น { odd_pattern, even_pattern, extra_row_size }
      body: JSON.stringify(seatPlan),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || "Failed to update seat plan");
    }
  };

  // ✅ NEW: delete seat plan (DELETE /rooms/:id/seat-plan)
  const deleteSeatPlanByRoomId = async (roomId) => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/seat-plan`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // ถ้า backend คืน 404 ก็ถือว่า "ไม่มีผัง" อยู่แล้ว
    if (!res.ok && res.status !== 404) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || "Failed to delete seat plan");
    }
  };

  // แปลง seat_plan odd/even แบบ 0 สลับ -> rows[] เพื่อ prefill ตอน Edit
  const buildRowsFromSeatPlan = (seatPlan) => {
    const odd = Array.isArray(seatPlan?.odd_pattern) ? seatPlan.odd_pattern : [];
    const even = Array.isArray(seatPlan?.even_pattern) ? seatPlan.even_pattern : [];
    const len = Math.max(odd.length, even.length);
    const rows = [];

    for (let i = 0; i < len; i++) {
      const o = Number(odd[i]) || 0;
      const e = Number(even[i]) || 0;
      rows.push(o > 0 ? o : e);
    }
    return rows;
  };

  // split rows[] -> odd/even แบบ 0 สลับ ความยาวเท่าจำนวนแถว
  const splitRowsToOddEven = (rows) => {
    const odd = [];
    const even = [];
    rows.forEach((seat, idx) => {
      const rowNo = idx + 1;
      if (rowNo % 2 === 1) {
        odd.push(seat);
        even.push(0);
      } else {
        odd.push(0);
        even.push(seat);
      }
    });
    return { odd, even };
  };

  const toggleSeatPlanUI = () => {
    const sel = document.getElementById("room_type");
    const wrap = document.getElementById("seatplan_wrap");
    if (!sel || !wrap) return;
    wrap.style.display = isSlopeType(sel.value) ? "block" : "none";
  };

  const renderRowInputs = (count, initRows = []) => {
    const wrap = document.getElementById("row_inputs");
    if (!wrap) return;

    const c = Math.max(0, Math.min(200, Number(count) || 0));
    if (!c) {
      wrap.innerHTML = "";
      return;
    }

    let html = "";
    for (let i = 1; i <= c; i++) {
      const initVal = initRows[i - 1];
      html += `
        <div class="mb-2" style="display:flex; align-items:center; gap:10px;">
          <div style="width:110px; font-weight:600;">แถวที่ ${i} :</div>
          <span style="font-weight:700;">[</span>
          <input
            type="number"
            class="swal2-input seat-row-input"
            data-row="${i}"
            style="margin:0; height:36px; width:120px;"
            placeholder="0"
            value="${initVal ?? ""}"
          />
          <span style="font-weight:700;">]</span>
        </div>
      `;
    }
    wrap.innerHTML = html;
  };

  const readRowsFromDOM = () => {
    const countRaw = document.getElementById("row_count")?.value;
    const count = toInt(countRaw);

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("กรุณากรอกจำนวนแถวให้ถูกต้อง (ต้องเป็นตัวเลข > 0)");
    }

    const inputs = Array.from(document.querySelectorAll(".seat-row-input"));
    inputs.sort((a, b) => Number(a.dataset.row) - Number(b.dataset.row));

    if (inputs.length !== count) {
      throw new Error("จำนวนช่องแถวไม่ตรงกับจำนวนแถว (ลองปิดแล้วเปิดใหม่)");
    }

    const rows = inputs.map((el, idx) => {
      const raw = el.value;
      if (raw == null || String(raw).trim() === "") {
        throw new Error(`กรุณากรอกจำนวนที่นั่งของแถวที่ ${idx + 1} (ถ้าไม่ใช้ให้ใส่ 0)`);
      }
      const seat = toInt(raw);
      if (!Number.isFinite(seat) || seat < 0) {
        throw new Error(`แถวที่ ${idx + 1} ต้องเป็นตัวเลข >= 0 เท่านั้น`);
      }
      return seat;
    });

    return rows;
  };

  const seatPlanSectionHTML = (initRowCount = "", initRows = [], initExtra = 10) => `
    <div id="seatplan_wrap" style="display:none; text-align:left; margin-top:12px; padding:12px; border:1px dashed #d9d9d9; border-radius:8px;">
      <div style="font-weight:600; margin-bottom:8px;">ตั้งค่าผังที่นั่ง (เฉพาะห้องบรรยายสโลป)</div>
      <div style="font-size:12px; color:#6b7280; margin-bottom:10px;">
        กรอกจำนวนที่นั่ง "ตามลำดับแถว" เช่น แถวที่ 1=10, แถวที่ 2=10, แถวที่ 3=12 (ถ้าไม่ใช้แถวนั้นให้ใส่ 0)
      </div>

      <div class="mb-3">
        <label for="row_count" class="form-label">จำนวนแถว</label>
        <input id="row_count" type="number" class="swal2-input" value="${initRowCount}" placeholder="เช่น 7">
      </div>

      <div id="row_inputs" class="mb-3"></div>

      <div class="mb-3">
        <label for="extra_row_size" class="form-label">จำนวนที่นั่งแถวเสริม</label>
        <input id="extra_row_size" type="number" class="swal2-input" value="${initExtra}" placeholder="เช่น 10">
      </div>
    </div>
  `;

  const handleAddRoom = () => {
    Swal.fire({
      title: "เพิ่มห้องใหม่",
      html: `
        <div class="mb-3">
          <label for="room_name" class="form-label">ชื่อห้อง</label>
          <input id="room_name" class="swal2-input" placeholder="ชื่อห้อง">
        </div>

        <div class="mb-3">
          <label for="room_type" class="form-label">ประเภทห้อง</label>
          <select id="room_type" class="swal2-select" style="width: 30%; padding: 8px; border-radius: 4px; border: 1px solid #d9d9d9;">
            <option value="" disabled selected>เลือกประเภทห้อง</option>
            ${roomTypes.map((type) => `<option value="${type}">${type}</option>`).join("")}
          </select>
        </div>

        <div class="mb-3">
          <label for="capacity" class="form-label">ความจุ (คน)</label>
          <input id="capacity" type="number" class="swal2-input" placeholder="จำนวนที่นั่ง">
        </div>

        ${seatPlanSectionHTML("", [], 10)}
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#dc3545",
      didOpen: () => {
        const sel = document.getElementById("room_type");
        if (sel) sel.addEventListener("change", toggleSeatPlanUI);
        toggleSeatPlanUI();

        const rowCountEl = document.getElementById("row_count");
        if (rowCountEl) {
          rowCountEl.addEventListener("input", () => {
            renderRowInputs(rowCountEl.value, []);
          });
        }
      },
      preConfirm: () => {
        const roomName = document.getElementById("room_name")?.value;
        const roomType = document.getElementById("room_type")?.value;
        const capacity = document.getElementById("capacity")?.value;

        if (!roomName || !roomType || !capacity) {
          Swal.showValidationMessage("กรุณากรอกข้อมูลให้ครบทุกช่อง");
          return false;
        }

        const payload = {
          room_name: roomName.trim(),
          room_type: roomType,
          capacity: parseInt(capacity, 10),
        };

        if (isSlopeType(roomType)) {
          try {
            const extraRaw = document.getElementById("extra_row_size")?.value;

            const rows = readRowsFromDOM();
            const { odd, even } = splitRowsToOddEven(rows);

            const extra = Number(extraRaw);
            if (!Number.isFinite(extra) || extra <= 0) {
              Swal.showValidationMessage("extra_row_size ต้องเป็นตัวเลข > 0");
              return false;
            }

            payload.seat_plan = {
              odd_pattern: odd,
              even_pattern: even,
              extra_row_size: Math.trunc(extra),
            };
          } catch (e) {
            Swal.showValidationMessage(e.message || "รูปแบบผังไม่ถูกต้อง");
            return false;
          }
        }

        return payload;
      },
    }).then((result) => {
      if (result.isConfirmed) addNewRoom(result.value);
    });
  };

  const addNewRoom = async (roomData) => {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomData),
      });

      if (!response.ok) throw new Error("Failed to add new room");

      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: "เพิ่มห้องใหม่เรียบร้อยแล้ว",
        confirmButtonColor: "#28a745",
      });

      fetchRooms();
    } catch (error) {
      console.error("Error adding room:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มห้องใหม่ได้",
        confirmButtonColor: "#dc3545",
      });
    }
  };

  // ทำให้เป็น async เพื่อดึง seat plan ก่อนเปิด modal
  const handleEditRoom = async (room) => {
    let seatPlan = null;

    if (isSlopeType(room.room_type)) {
      try {
        seatPlan = await fetchSeatPlanByRoomId(room.room_id);
      } catch (e) {
        console.error("fetchSeatPlanByRoomId error:", e);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ดึงผังที่นั่งไม่สำเร็จ",
          confirmButtonColor: "#dc3545",
        });
        return;
      }
    }

    const initRows = seatPlan ? buildRowsFromSeatPlan(seatPlan) : [];
    const initRowCount = initRows.length ? String(initRows.length) : "";
    const initExtra = Number(seatPlan?.extra_row_size || 10);

    Swal.fire({
      title: "แก้ไขข้อมูลห้อง",
      html: `
        <div class="mb-3">
          <label for="room_name" class="form-label">ชื่อห้อง</label>
          <input id="room_name" class="swal2-input" value="${room.room_name || ""}" placeholder="ชื่อห้อง">
        </div>

        <div class="mb-3">
          <label for="room_type" class="form-label">ประเภทห้อง</label>
          <select id="room_type" class="swal2-select" style="width: 30%; padding: 8px; border-radius: 4px; border: 1px solid #d9d9d9;">
            <option value="" disabled>เลือกประเภทห้อง</option>
            ${roomTypes
              .map(
                (type) =>
                  `<option value="${type}" ${room.room_type === type ? "selected" : ""}>${type}</option>`
              )
              .join("")}
          </select>
        </div>

        <div class="mb-3">
          <label for="capacity" class="form-label">ความจุ (คน)</label>
          <input id="capacity" type="number" class="swal2-input" value="${room.capacity ?? ""}" placeholder="จำนวนที่นั่ง">
        </div>

        ${seatPlanSectionHTML(initRowCount, initRows, initExtra)}
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#dc3545",
      didOpen: () => {
        const sel = document.getElementById("room_type");
        if (sel) sel.addEventListener("change", toggleSeatPlanUI);

        toggleSeatPlanUI();

        const rowCountEl = document.getElementById("row_count");
        if (rowCountEl && isSlopeType(sel?.value)) {
          if (String(rowCountEl.value || "").trim() !== "") {
            renderRowInputs(rowCountEl.value, initRows);
          }
          rowCountEl.addEventListener("input", () => {
            renderRowInputs(rowCountEl.value, initRows);
          });
        }
      },
      preConfirm: () => {
        const roomName = document.getElementById("room_name")?.value;
        const roomType = document.getElementById("room_type")?.value;
        const capacity = document.getElementById("capacity")?.value;

        if (!roomName || !roomType || !capacity) {
          Swal.showValidationMessage("กรุณากรอกข้อมูลให้ครบทุกช่อง");
          return false;
        }

        const payload = {
          room_id: room.room_id,
          room_name: roomName.trim(),
          room_type: roomType,
          capacity: parseInt(capacity, 10),
        };

        if (isSlopeType(roomType)) {
          try {
            const extraRaw = document.getElementById("extra_row_size")?.value;

            const rows = readRowsFromDOM();
            const { odd, even } = splitRowsToOddEven(rows);

            const extra = Number(extraRaw);
            if (!Number.isFinite(extra) || extra <= 0) {
              Swal.showValidationMessage("extra_row_size ต้องเป็นตัวเลข > 0");
              return false;
            }

            payload.seat_plan = {
              odd_pattern: odd,
              even_pattern: even,
              extra_row_size: Math.trunc(extra),
            };
          } catch (e) {
            Swal.showValidationMessage(e.message || "รูปแบบผังไม่ถูกต้อง");
            return false;
          }
        } else {
          payload.seat_plan = null;
        }

        return payload;
      },
    }).then((result) => {
      if (result.isConfirmed) updateRoom(result.value);
    });
  };

  // ✅ CHANGED: อัปเดต rooms ก่อน แล้วค่อย PUT/DELETE seat-plan ตามเส้นใหม่
  const updateRoom = async (roomData) => {
    try {
      // 1) update ตาราง rooms เท่านั้น (ไม่ส่ง seat_plan ไปเส้นนี้)
      const roomOnly = {
        room_id: roomData.room_id,
        room_name: roomData.room_name,
        room_type: roomData.room_type,
        capacity: roomData.capacity,
      };

      const response = await fetch(`${API_URL}/rooms/${roomData.room_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomOnly),
      });

      if (!response.ok) throw new Error("Failed to update room");

      // 2) update/delete seat plan ตามประเภทห้อง
      if (isSlopeType(roomData.room_type)) {
        if (!roomData.seat_plan) {
          throw new Error("seat_plan is required for slope room");
        }
        await upsertSeatPlanByRoomId(roomData.room_id, roomData.seat_plan);
      } else {
        // ถ้าไม่ใช่สโลป ให้ล้างผัง (ถ้าไม่มีก็ไม่เป็นไร)
        await deleteSeatPlanByRoomId(roomData.room_id);
      }

      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: "แก้ไขข้อมูลห้องเรียบร้อยแล้ว",
        confirmButtonColor: "#28a745",
      });

      fetchRooms();
    } catch (error) {
      console.error("Error updating room:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error?.message || "ไม่สามารถแก้ไขข้อมูลห้องได้",
        confirmButtonColor: "#dc3545",
      });
    }
  };

  const handleDeleteRoom = (room) => {
    Swal.fire({
      title: "ยืนยันการลบห้อง",
      text: `ต้องการลบห้อง ${room.room_name} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) deleteRoom(room.room_id);
    });
  };

  const deleteRoom = async (room_id) => {
    try {
      // (ไม่บังคับ) ล้าง seat plan ก่อน เผื่อมี FK/constraint
      try {
        await deleteSeatPlanByRoomId(room_id);
      } catch (e) {
        // ไม่ให้ล้มทั้ง flow ถ้าลบผังไม่ได้/ไม่มี
        console.warn("deleteSeatPlanByRoomId warning:", e);
      }

      const response = await fetch(`${API_URL}/rooms/${room_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to delete room");

      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: "ลบห้องเรียบร้อยแล้ว",
        confirmButtonColor: "#28a745",
      });

      fetchRooms();
    } catch (error) {
      console.error("Error deleting room:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถลบห้องได้",
        confirmButtonColor: "#dc3545",
      });
    }
  };

  // ===== search + sort =====
  const filteredRooms = rooms.filter((room) => {
    const t = searchTerm.toLowerCase();
    return (
      String(room.room_id || "").toLowerCase().includes(t) ||
      String(room.room_name || "").toLowerCase().includes(t) ||
      String(room.room_type || "").toLowerCase().includes(t)
    );
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const va = a?.[sortField];
    const vb = b?.[sortField];
    if (va == null && vb == null) return 0;
    if (va == null) return sortDirection === "asc" ? -1 : 1;
    if (vb == null) return sortDirection === "asc" ? 1 : -1;

    if (typeof va === "number" && typeof vb === "number") {
      return sortDirection === "asc" ? va - vb : vb - va;
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    if (sa < sb) return sortDirection === "asc" ? -1 : 1;
    if (sa > sb) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return <FaSort className="ms-1" />;
    return sortDirection === "asc" ? (
      <FaSortUp className="ms-1" />
    ) : (
      <FaSortDown className="ms-1" />
    );
  };

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="content-wrapper">
        <Container fluid className="py-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaBuilding className="text-primary" />
                <h5 className="mb-0">ข้อมูลห้องเรียน/ห้องสอบ</h5>
              </div>

              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleAddRoom}>
                  <FaPlus className="me-2" />
                  เพิ่มห้องใหม่
                </Button>
                <Button variant="outline-secondary" onClick={fetchRooms}>
                  <FaSyncAlt className="me-2" />
                  รีเฟรช
                </Button>
              </div>
            </Card.Header>

            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="ค้นหาตามชื่อห้องหรือประเภทห้อง..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={6} className="text-end">
                  <Badge bg="info" className="px-3 py-2">
                    <FaChair className="me-2" />
                    {sortedRooms.length} ห้อง
                  </Badge>
                </Col>
              </Row>

              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <div className="mt-3">กำลังโหลดข้อมูล...</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "80px" }}>ลำดับ</th>
                        <th style={{ cursor: "pointer" }} onClick={() => handleSort("room_id")}>
                          รหัสห้อง {sortIcon("room_id")}
                        </th>
                        <th style={{ cursor: "pointer" }} onClick={() => handleSort("room_name")}>
                          ชื่อห้อง {sortIcon("room_name")}
                        </th>
                        <th style={{ cursor: "pointer" }} onClick={() => handleSort("room_type")}>
                          ประเภทห้อง {sortIcon("room_type")}
                        </th>
                        <th style={{ cursor: "pointer" }} onClick={() => handleSort("capacity")}>
                          ความจุ {sortIcon("capacity")}
                        </th>
                        <th style={{ width: "160px" }}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRooms.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            ไม่พบข้อมูล
                          </td>
                        </tr>
                      ) : (
                        sortedRooms.map((room, idx) => (
                          <tr key={room.room_id}>
                            <td>{idx + 1}</td>
                            <td>
                              <Badge bg="secondary">{room.room_id}</Badge>
                            </td>
                            <td className="fw-semibold">{room.room_name}</td>
                            <td>{room.room_type}</td>
                            <td>
                              <Badge bg="light" text="dark">
                                {room.capacity} คน
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline-warning"
                                  onClick={() => handleEditRoom(room)}
                                >
                                  <FaEdit className="me-1" />
                                  แก้ไข
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => handleDeleteRoom(room)}
                                >
                                  <FaTrash className="me-1" />
                                  ลบ
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default AvailableRooms;