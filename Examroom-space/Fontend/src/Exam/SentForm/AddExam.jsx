import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Container,
  Row,
  Col,
  Form as BootstrapForm,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import useSWR, { mutate } from "swr";
import _ from "lodash";

const CourseManagementButton = () => {
  const url = localStorage.getItem("API");
  const token = localStorage.getItem("token");
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const [newNo, setNewNo] = useState(0);
  const [roomList, setRoomList] = useState([]);
  const [customLecturer, setCustomLecturer] = useState("");
  const [customProctor, setCustomProctor] = useState("");
  const [lecturerList, setLecturerList] = useState([]);
  const [newData, setnewData] = useState({
    Ref: "",
    No: "",
    Num_st: "",
    course: "",
    lecturer: "",
    Proctor: "",
    eDate: "",
    eTime: "",
    hr: "",
    room_id: "",
  });

  const [isOtherLecturerSelected, setIsOtherLecturerSelected] = useState(false);
  const [isOtherProctorSelected, setIsOtherProctorSelected] = useState(false);
  const [customRoom, setCustomRoom] = useState("");
  const [isOtherRoomSelected, setIsOtherRoomSelected] = useState(false);

  const EXAM_TABLE_KEY = `${url}/select_data/examtable`;
  const ROOM_EXAM_KEY = `${url}/select_data/roomexam`;
  const ROOMSKEY = `${url}/select_data/rooms`;

  const fetcher = async (url) => {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      return response.json();
    } catch (error) {
      return [];
    }
  };

  const { data: examTableData = [] } = useSWR(EXAM_TABLE_KEY, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  const { data: rooms = [] } = useSWR(ROOMSKEY, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  const {
    data: RoomData = [],
    error,
    mutate: mutateRoomData,
  } = useSWR(ROOM_EXAM_KEY, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (Array.isArray(examTableData) && examTableData.length > 0) {
      // Get all lecturers and split by comma
      const allLecturers = examTableData
        .map((item) => (item.lecturer || item.Lecturer || "").split(","))
        .flat()
        .map((name) => name.trim()) // Trim whitespace
        .filter(Boolean); // Remove empty strings

      // Remove duplicates and sort
      const uniqueLecturers = _.uniq(allLecturers).sort();
      setLecturerList(uniqueLecturers);
    }
  }, [examTableData]);

  // Handle lecturer selection
  const handleLecturerChange = (e) => {
    const value = e.target.value;
    if (value === "other") {
      setIsOtherLecturerSelected(true);
      setnewData((prev) => ({ ...prev, lecturer: "" }));
    } else {
      setIsOtherLecturerSelected(false);
      setnewData((prev) => ({ ...prev, lecturer: value }));
    }
  };

  // Handle proctor selection
  const handleProctorChange = (e) => {
    const value = e.target.value;
    if (value === "other") {
      setIsOtherProctorSelected(true);
      setnewData((prev) => ({ ...prev, Proctor: "" }));
    } else {
      setIsOtherProctorSelected(false);
      setnewData((prev) => ({ ...prev, Proctor: value }));
    }
  };
  // Handle custom lecturer input
  const handleCustomLecturerChange = (e) => {
    const value = e.target.value;
    setnewData((prev) => ({
      ...prev,
      lecturer: value,
    }));
  };
  // Handle custom proctor input
  const handleCustomProctorChange = (e) => {
    const value = e.target.value;
    setnewData((prev) => ({
      ...prev,
      Proctor: value,
    }));
  };

  const handleRoomChange = (e) => {
    const value = e.target.value;
    if (value === "other") {
      setIsOtherRoomSelected(true);
      setnewData((prev) => ({ ...prev, room_id: "" }));
    } else {
      setIsOtherRoomSelected(false);
      setnewData((prev) => ({ ...prev, room_id: value }));
    }
  };

  const handleCustomRoomChange = (e) => {
    const value = e.target.value;
    setnewData((prev) => ({
      ...prev,
      room_id: value,
    }));
  };

  useEffect(() => {
    if (Array.isArray(RoomData)) {
      if (RoomData.length > 0) {
        const maxNo = Math.max(...RoomData.map((item) => Number(item.No) || 0));
        const maxRef = Math.max(
          ...RoomData.map((item) => Number(item.Ref) || maxRef + 1)
        );
        setNewNo(maxNo + 1);

        const firstRoom = RoomData[0];
        setnewData({
          Ref: maxRef + 1,
          No: parseInt(firstRoom?.No) || "",
          NoSt: firstRoom?.NoSt || "",
          course: firstRoom?.course || "",
          lecturer: firstRoom?.lecturer || "",
          Proctor: firstRoom?.Proctor || "",
          eDate: firstRoom?.eDate || "",
          eTime: firstRoom?.eTime || "",
          hr: firstRoom?.hr || "",
          room_id: firstRoom?.room_id || "",
        });
      } else {
        setNewNo(1);
        setnewData({
          Ref: 1,
          No: 1,
          Num_st: "",
          course: "",
          lecturer: "",
          Proctor: "",
          eDate: "",
          eTime: "",
          hr: "",
          room_id: "",
        });
      }
    }
  }, [RoomData]);

  // Modified handleChange to validate number inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setnewData((prevData) => {
      let newValue = value;

      // For Ref and No fields, convert to integer
      if (name === "Ref" || name === "No") {
        newValue = parseInt(value) || 0;
      }

      // For hr and Num_st fields, ensure only numbers are entered
      if (name === "hr" || name === "Num_st") {
        // Replace any non-digit character with empty string
        newValue = value.replace(/\D/g, '');
      }

      return { ...prevData, [name]: newValue };
    });
  };

  const handleRefChange = (inputNo) => {
    inputNo = parseInt(inputNo);
    const selectedRef = RoomData?.find((item) => parseInt(item.No) === inputNo);
    const maxRef = Math.max(
      ...RoomData.map((item) => Number(item.Ref) || maxRef + 1)
    );

    if (inputNo > newNo) {
      inputNo = newNo;
    }

    if (selectedRef) {
      // หาชื่อห้องจาก room_id
      //  console.log('Selected reference data:', selectedRef);
      setnewData({
        No: parseInt(inputNo),
        Ref: selectedRef.Ref || maxRef + 1,
        Num_st: selectedRef.Num_st || selectedRef.NoSt || "",
        course: selectedRef.course || selectedRef.Course || "",
        lecturer: selectedRef.Lecturer || selectedRef.lecturer || "", // เพิ่ม Lecturer ตัวใหญ่
        Proctor: selectedRef.Proctor || "",
        eDate:
          selectedRef.Edate || selectedRef.edate || selectedRef.eDate || "", // เพิ่มตัวเล็ก
        eTime:
          selectedRef.Etime || selectedRef.etime || selectedRef.eTime || "",
        hr: selectedRef.Hr || selectedRef.hr || "",
        room_id: selectedRef.Room_id || selectedRef.room_id || "", // เพิ่ม Room_id ตัวใหญ่
      });
    } else {
      setnewData({
        No: parseInt(newNo),
        Ref: maxRef + 1,
        Num_st: "",
        course: "",
        lecturer: "",
        Proctor: "",
        eDate: "",
        eTime: "",
        hr: "",
        room_id: "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !newData.Num_st ||
      !newData.course ||
      !newData.lecturer ||
      !newData.Proctor ||
      !newData.eDate ||
      !newData.eTime ||
      !newData.hr ||
      !newData.room_id
    ) {
      alert("กรุณากรอกข้อมูลให้ครบทุกช่องสำหรับการเพิ่มรายวิชา");
      return;
    }

    // แปลงค่า Ref และ No เป็น integer ก่อนส่ง
    const maxRef = Math.max(
      ...RoomData.map((item) => Number(item.Ref) || maxRef + 1)
    );
    const dataToSubmit = {
      ...newData,
      Ref: maxRef + 1,
      No: parseInt(newData.No),
    };

    try {
      const response = await fetch(
        url + "/New_Insert_Exam",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSubmit)
        }
      );
      console.log(JSON.stringify(dataToSubmit))
      if (!response.ok) {
        throw new Error(await response.text());
      }

      await Promise.all([mutate(EXAM_TABLE_KEY), mutate(ROOM_EXAM_KEY)]);
      //    console.log("Datacheck : ", dataToSubmit);
      alert("บันทึกข้อมูลสำเร็จ");
      handleClose();
    } catch (error) {
      //  console.error("Insert error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };
  const handleShow = () => {
    resetForm();
    setIsOtherLecturerSelected(false); // รีเซ็ต state
    setIsOtherProctorSelected(false); // รีเซ็ต state
    setShow(true);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(url + "/DeleteTable/" + newData.Ref, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // อัพเดทข้อมูลใน SWR cache และ revalidate
      await Promise.all([mutate(EXAM_TABLE_KEY), mutate(ROOM_EXAM_KEY)]);

      alert("ลบข้อมูลสำเร็จ");
      resetForm();
    } catch (error) {
      //     console.error("Delete error:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const resetForm = () => {
    const maxRef = Math.max(
      ...RoomData.map((item) => Number(item.Ref) || maxRef + 1)
    );
    setnewData({
      No: newNo,
      Ref: maxRef + 1,
      Num_st: "",
      course: "",
      lecturer: "",
      Proctor: "",
      eDate: "",
      eTime: "",
      hr: "",
      room_id: "",
    });
    setIsOtherLecturerSelected(false);
    setIsOtherProctorSelected(false);
    setIsOtherRoomSelected(false);
    setCustomRoom("");
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={handleShow}
        style={{
          width: "160px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          height: "45px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        เพิ่มรายวิชา
      </Button>

      <Modal show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>เพิ่มรายวิชา</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={3}>
                <BootstrapForm.Group controlId="Ref" className="mb-3">
                  <BootstrapForm.Label>ลำดับ</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="number"
                    name="No"
                    value={newData.No}
                    onChange={(e) => handleRefChange(e.target.value)}
                    min="1"
                    max={newNo}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col md={3}>
                <BootstrapForm.Group controlId="Ref" className="mb-3">
                  <BootstrapForm.Label>Ref</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="number"
                    name="Ref"
                    value={newData.Ref}
                    onChange={(e) => handleRefChange(e.target.value)}
                    readOnly
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <BootstrapForm.Group controlId="course" className="mb-3">
                  <BootstrapForm.Label>ชื่อรายวิชา</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    name="course"
                    placeholder="กรอกชื่อรายวิชา"
                    value={newData.course}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <BootstrapForm.Group controlId="lecturer" className="mb-3">
                  <BootstrapForm.Label>อาจารย์ผู้สอน</BootstrapForm.Label>
                  <BootstrapForm.Select
                    name="lecturer"
                    value={newData.lecturer || ""}
                    onChange={handleLecturerChange}
                  >
                    <option value="">เลือกอาจารย์ผู้สอน</option>

                    {lecturerList.map((lecturer) => (
                      <option key={lecturer} value={lecturer}>
                        {lecturer}
                      </option>
                    ))}
                  </BootstrapForm.Select>
                  {isOtherLecturerSelected && (
                    <BootstrapForm.Control
                      type="text"
                      placeholder="กรอกชื่อผู้สอน"
                      value={newData.lecturer}
                      onChange={handleCustomLecturerChange}
                      className="mt-2"
                    />
                  )}
                </BootstrapForm.Group>
              </Col>
              <Col md={6}>
                <BootstrapForm.Group controlId="Proctor" className="mb-3">
                  <BootstrapForm.Label>กรรมการคุมสอบ</BootstrapForm.Label>
                  <BootstrapForm.Select
                    name="Proctor"
                    value={newData.Proctor || ""}
                    onChange={handleProctorChange}
                  >
                    <option value="">เลือกกรรมการคุมสอบ</option>

                    {lecturerList.map((lecturer) => (
                      <option key={lecturer} value={lecturer}>
                        {lecturer}
                      </option>
                    ))}
                  </BootstrapForm.Select>
                  {isOtherProctorSelected && (
                    <BootstrapForm.Control
                      type="text"
                      placeholder="กรอกชื่อกรรมการคุมสอบ"
                      value={newData.Proctor}
                      onChange={handleCustomProctorChange}
                      className="mt-2"
                    />
                  )}
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <BootstrapForm.Group controlId="eDate">
                  <BootstrapForm.Label>วันสอบ</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="date"
                    name="eDate"
                    value={newData.eDate || ""}
                    onChange={handleChange}
                    onKeyDown={(e) => e.preventDefault()}
                  />
                </BootstrapForm.Group>
              </Col>

              <Col md={3}>
                <BootstrapForm.Group controlId="eTime" className="mb-3">
                  <BootstrapForm.Label>เวลาสอบ</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    name="eTime"
                    value={newData.eTime}
                    onChange={handleChange}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col md={4}>
                <BootstrapForm.Group controlId="hr" className="mb-3">
                  <BootstrapForm.Label>ชั่วโมงการสอบ</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    name="hr"
                    value={newData.hr}
                    onChange={handleChange}
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="room">
                  <Form.Label>ห้องสอบ</Form.Label>
                  <Form.Select
                    name="room_id"
                    value={newData.room_id}
                    onChange={handleRoomChange}
                  >
                    <option value="">เลือกห้องสอบ</option>

                    {rooms.map((room) => (
                      <option key={room.room_id} value={room.room_id}>
                        {room.room_name}
                      </option>
                    ))}
                  </Form.Select>
                  {isOtherRoomSelected && (
                    <Form.Control
                      type="text"
                      placeholder="กรอกชื่อห้องสอบ"
                      value={newData.room_id}
                      onChange={handleCustomRoomChange}
                      className="mt-2"
                    />
                  )}
                </Form.Group>
              </Col>
              <Col md={4}>
                <BootstrapForm.Group controlId="Num_st" className="mb-3">
                  <BootstrapForm.Label>จำนวน นศ.</BootstrapForm.Label>
                  <BootstrapForm.Control
                    type="text"
                    name="Num_st"
                    value={newData.Num_st}
                    onChange={handleChange}
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row>
              <Col className="d-flex justify-content-start gap-2">
                <Button
                  variant="primary"
                  type="submit"
                  onClick={handleSubmit}
                  style={{
                    width: "160px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    height: "45px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  เพิ่มรายวิชา
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  ลบ
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  รีเซ็ต
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default CourseManagementButton;