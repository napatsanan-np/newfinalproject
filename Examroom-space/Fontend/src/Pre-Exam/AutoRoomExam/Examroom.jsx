import React, { useEffect, useState } from "react";
import { Container, Card, Table, Badge, Button, Row, Col, Spinner, Form, InputGroup } from "react-bootstrap";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import { 
  FaSearch, 
  FaBuilding, 
  FaChair, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSyncAlt, 
  FaFilter, 
  FaSort, 
  FaSortUp, 
  FaSortDown
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
      console.log("roomsData", roomsData);
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

  // ข้อมูลประเภทห้อง
  const roomTypes = [
    "ห้องปฏิบัติการ",
    "ห้องบรรยาย",
  ];
  
  const handleAddRoom = () => {
    Swal.fire({
      title: 'เพิ่มห้องใหม่',
      html: `
        <div class="mb-3">
          <label for="room_name" class="form-label">ชื่อห้อง</label>
          <input id="room_name" class="swal2-input" placeholder="ชื่อห้อง">
        </div>
        <div class="mb-3">
          <label for="room_type" class="form-label">ประเภทห้อง</label>
          <select id="room_type" class="swal2-select" style="width: 30%; padding: 8px; border-radius: 4px; border: 1px solid #d9d9d9;">
            <option value="" disabled selected>เลือกประเภทห้อง</option>
            ${roomTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label for="capacity" class="form-label">ความจุ (คน)</label>
          <input id="capacity" type="number" class="swal2-input" placeholder="จำนวนที่นั่ง">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      preConfirm: () => {
        const roomName = document.getElementById('room_name').value;
        const roomType = document.getElementById('room_type').value;
        const capacity = document.getElementById('capacity').value;
        
        if (!roomName || !roomType || !capacity) {
          Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
          return false;
        }
        
        return {
          room_name: roomName,
          room_type: roomType,
          capacity: parseInt(capacity)
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        addNewRoom(result.value);
      }
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
    Swal.fire({
      title: 'แก้ไขข้อมูลห้อง',
      html: `
        <div class="mb-3">
          <label for="room_name" class="form-label">ชื่อห้อง</label>
          <input id="room_name" class="swal2-input" value="${room.room_name}" placeholder="ชื่อห้อง">
        </div>
        <div class="mb-3">
          <label for="room_type" class="form-label">ประเภทห้อง</label>
          <select id="room_type" class="swal2-select" style="width: 30%; padding: 8px; border-radius: 4px; border: 1px solid #d9d9d9;">
            <option value="" disabled>เลือกประเภทห้อง</option>
            ${roomTypes.map(type => `<option value="${type}" ${room.room_type === type ? 'selected' : ''}>${type}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label for="capacity" class="form-label">ความจุ (คน)</label>
          <input id="capacity" type="number" class="swal2-input" value="${room.capacity}" placeholder="จำนวนที่นั่ง">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      preConfirm: () => {
        const roomName = document.getElementById('room_name').value;
        const roomType = document.getElementById('room_type').value;
        const capacity = document.getElementById('capacity').value;
        
        if (!roomName || !roomType || !capacity) {
          Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
          return false;
        }
        
        return {
          room_id: room.room_id,
          room_name: roomName,
          room_type: roomType,
          capacity: parseInt(capacity)
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        updateRoom(result.value);
      }
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
        text: "อัพเดทข้อมูลห้องเรียบร้อยแล้ว",
        confirmButtonColor: "#28a745",
      });
      
      fetchRooms();
    } catch (error) {
      console.error("Error updating room:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถอัพเดทข้อมูลห้องได้",
        confirmButtonColor: "#dc3545",
      });
    }
  };

  const handleDeleteRoom = (roomId) => {
    Swal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบห้องนี้ใช่หรือไม่?\nถ้าเกิดลบห้องที่เลือกรายวิชาที่ใช้ห้องสอบนี้จะหายไปด้วย',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteRoom(roomId);
      }
    });
  };

  const deleteRoom = async (roomId) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}`, {
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

  // Handle sorting
  const handleSort = (field) => {
    const newDirection = field === sortField 
      ? sortDirection === "asc" ? "desc" : "asc" 
      : "asc";
    
    setSortField(field);
    setSortDirection(newDirection);
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (field !== sortField) return <FaSort className="ms-1 text-muted" />;
    return sortDirection === "asc" 
      ? <FaSortUp className="ms-1 text-primary" /> 
      : <FaSortDown className="ms-1 text-primary" />;
  };

  // Filter and sort rooms
  const filteredAndSortedRooms = rooms
    .filter(room => 
      room.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.room_type && room.room_type.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      if (typeof fieldA === 'string') {
        const comparison = fieldA.localeCompare(fieldB);
        return sortDirection === "asc" ? comparison : -comparison;
      } else {
        const comparison = fieldA - fieldB;
        return sortDirection === "asc" ? comparison : -comparison;
      }
    });

  // Loading state
  const renderLoadingState = () => (
    <div className="text-center py-5">
      <Spinner animation="border" variant="primary" />
      <p className="mt-3">กำลังโหลดข้อมูล กรุณารอสักครู่...</p>
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="text-center py-5">
      <FaSearch size={40} className="text-muted mb-3" />
      <h5>ไม่พบข้อมูลห้อง</h5>
      <p className="text-muted">
        {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีข้อมูลห้องในระบบ'}
      </p>
      {searchTerm && (
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={() => {
            setSearchTerm("");
          }}
          className="mt-2"
        >
          ล้างการค้นหา
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div className="available-rooms-page">
        <div className="custom-background">
          <Container fluid  style={{ minHeight: "500px" }}>
            <SidebarMenu />

            {/* Main Card */}
            <Card className="available-rooms-card shadow border-0" style={{ minHeight: "500px" }}>
              <Card.Header className="bg-white border-bottom p-3">
                <Row className="align-items-center">
                  <Col md={6}>
                    <h4 className="mb-0 fw-bold text-primary d-flex align-items-center">
                      <FaBuilding className="me-2" />
                      ข้อมูลห้องเรียน/ห้องสอบ
                    </h4>
                  </Col>
                  <Col md={6} className="text-md-end mt-3 mt-md-0">
                    <Button 
                      variant="primary" 
                      className="me-2 d-inline-flex align-items-center action-btn" 
                      onClick={handleAddRoom}
                    >
                      <FaPlus className="me-2" />
                      เพิ่มห้องใหม่
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      className="d-inline-flex align-items-center action-btn" 
                      onClick={fetchRooms}
                    >
                      <FaSyncAlt className="me-2 refresh-icon" />
                      รีเฟรช
                    </Button>
                  </Col>
                </Row>
              </Card.Header>

              <Card.Body className="p-4">
                {/* Search and Filters */}
                <Row className="mb-4 g-3">
                  <Col md={6} lg={4}>
                    <InputGroup className="search-container shadow-sm rounded">
                      <InputGroup.Text className="bg-white border-end-0">
                        <FaSearch className="text-muted" />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="ค้นหาตามชื่อห้องหรือประเภทห้อง..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-start-0 search-input"
                      />
                    </InputGroup>
                  </Col>

                  <Col md={12} lg={8} className="d-flex align-items-center justify-content-lg-end">
                    <div className="d-flex align-items-center ms-lg-auto">
                      <Badge 
                        bg="info" 
                        className="py-2 px-3 rounded-pill me-2 d-flex align-items-center"
                      >
                        <FaBuilding className="me-2" size={14} />
                        <span>
                          {isLoading 
                            ? "กำลังโหลด..." 
                            : `${filteredAndSortedRooms.length} ห้อง`
                          }
                        </span>
                      </Badge>
                      
                      {searchTerm && (
                        <Badge 
                          bg="primary" 
                          className="py-2 px-3 rounded-pill filter-badge"
                        >
                          <FaFilter className="me-1" size={10} />
                          มีการกรองข้อมูล
                        </Badge>
                      )}
                    </div>
                  </Col>
                </Row>

                {/* Table */}
                {isLoading ? (
                  renderLoadingState()
                ) : filteredAndSortedRooms.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <div className="table-responsive custom-table-container">
                    <Table hover className="room-table align-middle">
                      <thead>
                        <tr>
                          <th width="5%" className="text-center">ลำดับ</th>
                          <th 
                            width="25%" 
                            onClick={() => handleSort('room_name')}
                            className="sortable-header"
                          >
                            รหัสห้อง {getSortIcon('room_name')}
                          </th>
                          <th 
                            width="25%"
                            onClick={() => handleSort('room_type')}
                            className="sortable-header"
                          >
                            ประเภทห้อง {getSortIcon('room_type')}
                          </th>
                          <th 
                            width="15%" 
                            className="text-center sortable-header"
                            onClick={() => handleSort('capacity')}
                          >
                            ความจุ {getSortIcon('capacity')}
                          </th>
                          
                          <th width="15%" className="text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedRooms.map((room, index) => (
                          <tr key={room.room_id} className="room-row">
                            <td className="text-center">{index + 1}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="room-icon-wrapper">
                                  <FaBuilding className="room-icon" />
                                </div>
                                <span className="fw-medium ms-2">{room.room_name}</span>
                              </div>
                            </td>
                            <td>{room.room_type}</td>
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center">
                                <FaChair className="me-1 text-secondary" size={14} />
                                <span>{room.capacity} คน</span>
                              </div>
                            </td>
      
                            <td>
                              <div className="d-flex justify-content-center gap-2">
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => handleEditRoom(room)}
                                >
                                  แก้ไข
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteRoom(room.room_id)}
                                >
                                  ลบ
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Container>
        </div>
      </div>
    </>
  );
};

export default AvailableRooms;