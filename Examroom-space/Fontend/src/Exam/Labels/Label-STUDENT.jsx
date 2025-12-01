// Label-STUDENT.jsx
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Alert, Collapse, Toast, ToastContainer } from "react-bootstrap";
import { ExcelImportModal } from "./ExcelImportModal";

export default function StudentSig() {
  const [openItems, setOpenItems] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomData, setSelectedRoomData] = useState(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(localStorage.getItem("API") + "/DataRoomexam", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Network response was not ok");
        const dataRoom = await res.json();

        // รวมรายการที่มี Ref+room_id เดียวกัน (คง logic เดิม)
        const filtered = (Array.isArray(dataRoom) ? dataRoom : []).filter((it) => it?.rooms?.room_id);
        const groups = [], map = {};
        filtered.forEach((it) => {
          if (!it.roomexam || !it.rooms) return;
          const key = `${it.roomexam.Ref}-${it.rooms.room_id}`;
          if (!map[key]) {
            map[key] = { ...it, combinedItems: [it], totalStudents: parseInt(it.roomexam.Num_st) || 0 };
            groups.push(map[key]);
          } else {
            map[key].combinedItems.push(it);
            map[key].totalStudents += (parseInt(it.roomexam.Num_st) || 0);
          }
        });
        setData(groups);
      } catch (e) {
        setError("Failed to fetch data. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleItem = (i) => setOpenItems((prev) => ({ ...prev, [i]: !prev[i] }));
  const openModal = (roomData) => { setSelectedRoomData(roomData); setShowImportModal(true); };
  const closeModal = () => setShowImportModal(false);

  // Toast: แสดงจำนวนรายการที่นำเข้าสำเร็จ (คงเดิม)
  const handleImportSuccess = (resp) => {
    const count = typeof resp?.count === "number" ? resp.count : (resp?.students?.length || 0);
    setToastVariant("success");
    setToastMessage(`นำเข้าข้อมูลสำเร็จ (${count} รายการ)`);
    setShowToast(true);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">กำลังโหลดข้อมูล...</span>
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }
  if (!data?.length) {
    return (
      <Container className="mt-4">
        <Alert variant="info" className="text-center">
          <Alert.Heading>ยังไม่มีข้อมูล</Alert.Heading>
          <p>ไม่พบข้อมูลห้องสอบที่ตรงตามเงื่อนไข</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide bg={toastVariant}>
          <Toast.Header><strong className="me-auto">แจ้งเตือน</strong></Toast.Header>
          <Toast.Body className={toastVariant === "success" ? "text-white" : ""}>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      <h1 className="text-center mb-4 fw-bold">ข้อมูลห้องสอบ</h1>

      {data.map((item, idx) => {
        if (!item.roomexam || !item.rooms) return null;

        const totalStudents = item.totalStudents || parseInt(item.roomexam.Num_st) || 0;
        const roomCapacity = parseInt(item.rooms.capacity) || 0;

        return (
          <Card key={idx} className="mb-4 shadow">
            <Card.Header
              className="bg-light text-dark"
              style={{ cursor: "pointer" }}
              onClick={() => toggleItem(idx)}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="d-flex align-items-center">
                    {/* เอา Badge "มีรายการซ้ำ ..." ออกแล้ว ให้เหลือชื่อวิชาเหมือนเดิม */}
                    <h2 className="fs-4 fw-bold mb-0">{item.roomexam.Course}</h2>
                  </div>
                  <Row className="mt-2">
                    <Col>วันที่สอบ: {item.roomexam.Edate}</Col>
                    <Col className="text-end">เวลา: {item.roomexam.Etime}</Col>
                  </Row>
                </div>
                <div>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(idx);
                    }}
                  >
                    {openItems[idx] ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                  </Button>
                </div>
              </div>
            </Card.Header>

            <Collapse in={openItems[idx]}>
              <div>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h3 className="fs-5 fw-bold border-bottom pb-2 mb-3">รายละเอียดการสอบ</h3>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">อาจารย์ผู้สอน:</Col>
                        <Col xs={6}>{item.roomexam.Lecturer}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">จำนวนนักศึกษา:</Col>
                        <Col xs={6}>{totalStudents} คน</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">ระยะเวลาสอบ:</Col>
                        <Col xs={6}>{item.roomexam.Hr} ชั่วโมง</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">ประเภทการสอบ:</Col>
                        <Col xs={6}>{item.roomexam.type_exam}</Col>
                      </Row>
                    </Col>

                    <Col md={6}>
                      <h3 className="fs-5 fw-bold border-bottom pb-2 mb-3">รายละเอียดห้อง</h3>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">รหัสห้อง:</Col>
                        <Col xs={6}>{item.rooms.room_id}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">ชื่อห้อง:</Col>
                        <Col xs={6}>{item.rooms.room_name}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">ประเภทห้อง:</Col>
                        <Col xs={6}>{item.rooms.room_type}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">ความจุห้อง:</Col>
                        <Col xs={6}>{roomCapacity} ที่นั่ง</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="fw-medium">รหัสอ้างอิง:</Col>
                        <Col xs={6}>{item.roomexam.Ref}</Col>
                      </Row>
                    </Col>
                  </Row>
                </Card.Body>

                <Card.Footer className="bg-light">
                  <Row className="align-items-center">
                    <Col md={6}>
                      <div className="fw-medium mb-1">สถานะการใช้งาน:</div>
                      <div className="d-flex align-items-center">
                        {totalStudents <= roomCapacity ? (
                          <>
                            <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: 12, height: 12 }}></span>
                            <span>ใช้งานได้ ({totalStudents}/{roomCapacity} ที่นั่ง)</span>
                          </>
                        ) : (
                          <>
                            <span className="d-inline-block rounded-circle bg-danger me-2" style={{ width: 12, height: 12 }}></span>
                            <span>เกินความจุ ({totalStudents}/{roomCapacity} ที่นั่ง)</span>
                          </>
                        )}
                      </div>
                    </Col>
                    <Col md={6} className="text-md-end mt-3 mt-md-0">
                      <Button
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(item);
                        }}
                      >
                        <i className="bi bi-file-earmark-excel me-1"></i> นำเข้าข้อมูล Excel
                      </Button>
                    </Col>
                  </Row>
                </Card.Footer>
              </div>
            </Collapse>
          </Card>
        );
      })}

      <ExcelImportModal
        show={showImportModal}
        handleClose={closeModal}
        onImportSuccess={handleImportSuccess}
        datas={selectedRoomData}
      />
    </Container>
  );
}
