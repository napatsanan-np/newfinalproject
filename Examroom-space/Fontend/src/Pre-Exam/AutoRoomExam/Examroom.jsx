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

  // รับได้ 2 แบบ: JSON array หรือ "10,0,10,0"
  const parsePattern = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return null;

    // ถ้าเป็น JSON array
    if (s.startsWith("[") && s.endsWith("]")) {
      let arr;
      try {
        arr = JSON.parse(s);
      } catch {
        throw new Error("รูปแบบผังต้องเป็น JSON array เช่น [10,0,10,0,12]");
      }
      if (!Array.isArray(arr)) {
        throw new Error("รูปแบบผังต้องเป็น JSON array เช่น [10,0,10,0,12]");
      }
      const out = arr.map((x) => Number(x));
      if (out.some((n) => !Number.isFinite(n) || n < 0)) {
        throw new Error("ผังต้องเป็นตัวเลข >= 0 เท่านั้น");
      }
      return out.map((n) => Math.trunc(n));
    }

    // ถ้าเป็น comma-separated
    const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
    const out = parts.map((x) => Number(x));
    if (!out.length) return null;
    if (out.some((n) => !Number.isFinite(n) || n < 0)) {
      throw new Error("ผังต้องเป็นตัวเลข >= 0 เท่านั้น");
    }
    return out.map((n) => Math.trunc(n));
  };

  const seatPlanSectionHTML = (initOdd = "", initEven = "", initExtra = 10) => `
    <div id="seatplan_wrap" style="display:none; text-align:left; margin-top:12px; padding:12px; border:1px dashed #d9d9d9; border-radius:8px;">
      <div style="font-weight:600; margin-bottom:8px;">ตั้งค่าผังที่นั่ง (เฉพาะห้องบรรยายสโลป)</div>
      <div style="font-size:12px; color:#6b7280; margin-bottom:10px;">
        ใส่เป็น JSON array เช่น <code>[10,0,10,0,12]</code> (0 คือแถวที่ไม่ใช้) หรือใส่แบบคอมม่า <code>10,0,10,0,12</code>
      </div>

      <div class="mb-3">
        <label for="odd_pattern" class="form-label">แถวคี่ (odd_pattern)</label>
        <textarea id="odd_pattern" class="swal2-textarea" placeholder='เช่น [10,0,10,0,12]' style="min-height:80px;">${initOdd}</textarea>
      </div>

      <div class="mb-3">
        <label for="even_pattern" class="form-label">แถวคู่ (even_pattern)</label>
        <textarea id="even_pattern" class="swal2-textarea" placeholder='เช่น [0,10,0,12,0,12]' style="min-height:80px;">${initEven}</textarea>
      </div>

      <div class="mb-3">
        <label for="extra_row_size" class="form-label">จำนวนที่นั่งแถวเสริม (extra_row_size)</label>
        <input id="extra_row_size" type="number" class="swal2-input" value="${initExtra}" placeholder="เช่น 10">
      </div>
    </div>
  `;

  const toggleSeatPlanUI = () => {
    const sel = document.getElementById("room_type");
    const wrap = document.getElementById("seatplan_wrap");
    if (!sel || !wrap) return;
    wrap.style.display = isSlopeType(sel.value) ? "block" : "none";
  };

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

        ${seatPlanSectionHTML("", "", 10)}
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

        // ถ้าเป็นสโลป ให้ต้องมีผัง
        if (isSlopeType(roomType)) {
          try {
            const oddRaw = document.getElementById("odd_pattern")?.value;
            const evenRaw = document.getElementById("even_pattern")?.value;
            const extraRaw = document.getElementById("extra_row_size")?.value;

            const odd = parsePattern(oddRaw);
            const even = parsePattern(evenRaw);
            const extra = Number(extraRaw);

            if (!odd || !even) {
              Swal.showValidationMessage("กรุณากรอกผังแถวคี่/แถวคู่ ให้ครบ");
              return false;
            }
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

  const handleEditRoom = (room) => {
    const initOdd = room?.seat_plan?.odd_pattern
      ? JSON.stringify(room.seat_plan.odd_pattern)
      : "";
    const initEven = room?.seat_plan?.even_pattern
      ? JSON.stringify(room.seat_plan.even_pattern)
      : "";
    const initExtra = Number(room?.seat_plan?.extra_row_size || 10);

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

        ${seatPlanSectionHTML(initOdd, initEven, initExtra)}
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
        toggleSeatPlanUI(); // โชว์/ซ่อนตามค่าเริ่มต้น
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

        // สโลป => ต้องมีผัง / ไม่ใช่สโลป => ล้างผังได้
        if (isSlopeType(roomType)) {
          try {
            const oddRaw = document.getElementById("odd_pattern")?.value;
            const evenRaw = document.getElementById("even_pattern")?.value;
            const extraRaw = document.getElementById("extra_row_size")?.value;

            const odd = parsePattern(oddRaw);
            const even = parsePattern(evenRaw);
            const extra = Number(extraRaw);

            if (!odd || !even) {
              Swal.showValidationMessage("กรุณากรอกผังแถวคี่/แถวคู่ ให้ครบ");
              return false;
            }
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
          // ไม่ใช่สโลป: ส่ง seat_plan เป็น null เพื่อให้ backend ตัด/ล้างได้ (ถ้า backend รองรับ)
          payload.seat_plan = null;
        }

        return payload;
      },
    }).then((result) => {
      if (result.isConfirmed) updateRoom(result.value);
    });
  };

  const updateRoom = async (roomData) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomData.room_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomData),
      });

      if (!response.ok) throw new Error("Failed to update room");

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
        text: "ไม่สามารถแก้ไขข้อมูลห้องได้",
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
                        <th
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSort("room_id")}
                        >
                          รหัสห้อง {sortIcon("room_id")}
                        </th>
                        <th
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSort("room_name")}
                        >
                          ชื่อห้อง {sortIcon("room_name")}
                        </th>
                        <th
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSort("room_type")}
                        >
                          ประเภทห้อง {sortIcon("room_type")}
                        </th>
                        <th
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSort("capacity")}
                        >
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