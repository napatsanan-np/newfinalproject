import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Button,
  Form,
  Container,
  Row,
  Col,
  Card,
  ProgressBar,
  Nav,
  Table,
  Modal,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useDropzone } from "react-dropzone";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import "./ProctorAsigner-styles.css";
import Select from "react-select";

export default function CombinedComponent() {
  const URL = window.API_URL;
  const token = localStorage.getItem("token");

  // File Upload States
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);

  // Tab and View States
  const [activeTab, setActiveTab] = useState("upload");
  const [viewMode, setViewMode] = useState("byRoom");

  const viewOptions = [
    { value: "byRoom", label: "ดูตามห้องสอบ" },
    { value: "byProctor", label: "ดูตามกรรมการ" },
  ];
  // --- State สำหรับแก้ไขเงื่อนไขกรรมการ ---
  const [showCondModal, setShowCondModal] = useState(false);
  const [editingCond, setEditingCond] = useState(null); // { user_id, full_name, base_condition, special_dates, time_period, special_courses, time_restriction }

  const openCondEdit = (row) => {
    // row มาจาก renderConditionsTab() ด้านล่าง
    const payload = {
      user_id: row.users.user_id,
      full_name: row.users.full_name,
      base_condition: row.condition_proctor.base_condition || "",
      special_dates: row.condition_proctor.special_dates || "",
      time_period: row.condition_proctor.time_period || "",
      special_courses: row.condition_proctor.special_courses || "",
      time_restriction: row.condition_proctor.time_restriction || "",
    };
    setEditingCond(payload);
    setShowCondModal(true);
  };

  const saveCondEdit = async () => {
    if (!editingCond) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${localStorage.getItem("API")}/admin/update/condition_proctor`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: editingCond.user_id,
          base_condition: editingCond.base_condition,
          special_dates: editingCond.special_dates,
          time_period: editingCond.time_period,
          special_courses: editingCond.special_courses,
          time_restriction: editingCond.time_restriction,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "update failed");
      }
      setShowCondModal(false);
      setEditingCond(null);
      await fetchAllData();       // รีเฟรชข้อมูลห้อง/มอบหมาย (ถ้าจำเป็น)
      await fetchProctorData();   // รีเฟรชแท็บนี้ให้เห็นค่าใหม่ทันที
      Swal.fire("สำเร็จ", "บันทึกเงื่อนไขกรรมการเรียบร้อย", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("ข้อผิดพลาด", e.message, "error");
    }
  };

  // hardcode แก้ไขเรื่องการแสดงผลข้อมูลห้องไม่ได้
  const roomMapping = {
    "-": "ไม่มีห้อง",
    R001: "ร.วท.1",
    R002: "ร.วท.2",
    R003: "ไววิทย์พุทธารี",
    R004: "หอประชุม",
    R005: "5406 ว.4",
    R006: "4103 ว.4",
    R007: "4203 ว.4",
    R008: "4204 ว.4",
    R009: "4205 ว.4",
    R010: "4206 ว.4",
    R011: "4319 ว.4",
    R012: "4320 ว.4",
    R013: "4415 ว.4",
    R014: "1238 ว.1",
    R015: "1239 ว.1",
    R016: "1240 ว.1",
    R017: "1241 ว.1",
    R018: "2103 ว.2",
    R019: "2201 ว.2",
    R020: "2202 ว.2",
    R021: "2203 ว.2",
    R022: "2204 ว.2",
    R023: "408A-B",
    R024: "414A-B",
    R025: "1227/1 ว.1 (คอม)",
    R026: "1227/2 ว.1 (คอม)",
    R027: "409A-B (คอม)",
    R028: "410A-B (คอม)",
    R029: "1331 ว.1 (สถิติ)",
    R030: "1334 ว.1 (สถิติ)",
    R031: "คอม ว.3 (คณะฯ)",
    R032: "1231 ว.1 (คณิต)",
    R033: "1227/1,1227/2 ว.1",
    R034: "410A-410B",
    R035: "1441 ว.1",
    R036: "4422,4423 ว.4",
  };

  // วันและสีที่กำหนดสำหรับแต่ละวัน
  const dayColors = {
    "อาทิตย์": "#ffcccc", // สีแดงอ่อน
    "จันทร์": "#ffffcc", // สีเหลืองอ่อน
    "อังคาร": "#ffccff", // สีชมพูอ่อน
    "พุธ": "#ccffcc", // สีเขียวอ่อน
    "พฤหัสบดี": "#ffdab9", // สีส้มอ่อน
    "ศุกร์": "#ccffff", // สีฟ้าอ่อน
    "เสาร์": "#ccccff", // สีม่วงอ่อน
  };

  //
  const getThaiDayFromDate = (dateStr) => {
    if (!dateStr) return null;

    try {
      // แยกวันที่ในรูปแบบ วว/ดด/ปปปป
      const [day, month, year] = dateStr
        .split("/")
        .map((part) => parseInt(part, 10));

      // สร้างอ็อบเจ็กต์วันที่ (แปลงปีพุทธศักราชเป็นคริสต์ศักราชถ้าจำเป็น)
      const date = new Date(year > 2400 ? year - 543 : year, month - 1, day);

      // รับชื่อวันในภาษาไทย
      const thaiDays = [
        "อาทิตย์",
        "จันทร์",
        "อังคาร",
        "พุธ",
        "พฤหัสบดี",
        "ศุกร์",
        "เสาร์",
      ];
      return thaiDays[date.getDay()];
    } catch (e) {
      console.error("เกิดข้อผิดพลาดในการแปลงวันที่:", e, dateStr);
      return null;
    }
  };

  const LoadingOverlay = () => {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <Spinner
            animation="border"
            variant="primary"
            className="loading-spinner"
          />
          <p className="loading-text">กำลังจัดกรรมการคุมสอบ...</p>
        </div>
      </div>
    );
  };

  const [isAssigning, setIsAssigning] = useState(false);

  // Data States
  const [dataExamTable, setDataExamTable] = useState([]);
  const [roomExamData, setRoomExamData] = useState([]);
  const [proctorData, setProctorData] = useState([]);
  const [proctorConditions, setProctorConditions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [departmentMap, setDepartmentMap] = useState({});
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  // Edit Proctor States
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedProctors, setSelectedProctors] = useState([]);
  const [savingChanges, setSavingChanges] = useState(false);

  const LoadingModal = ({ show }) => {
    return (
      <Modal
        show={show}
        centered
        backdrop="static"
        keyboard={false}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <Modal.Body className="text-center py-4">
          <Spinner
            animation="border"
            variant="primary"
            style={{
              width: "3rem",
              height: "3rem",
              marginBottom: "1rem",
            }}
          />
          <h5 className="mt-3">กำลังจัดกรรมการคุมสอบ...</h5>
          <p className="text-muted mb-0">กรุณารอสักครู่</p>
        </Modal.Body>
      </Modal>
    );
  };

  // API Functions
  const fetchAllData = async () => {
    try {
      const [roomExamRes, assignmentRes, usersRes, dept] = await Promise.all([
        // ดึงข้อมูลห้องสอบ
        fetch(`${localStorage.getItem("API")}/select_data/roomexam`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // ดึงข้อมูลการจัดกรรมการ
        fetch(
          `${localStorage.getItem("API")}/select_data/proctor_assignments`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        // ดึงข้อมูลผู้ใช้ทั้งหมด
        fetch(`${localStorage.getItem("API")}/select_data/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${localStorage.getItem("API")}/select_data/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!roomExamRes.ok || !assignmentRes.ok || !usersRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const roomExams = await roomExamRes.json();
      const assignments = await assignmentRes.json();
      const users = await usersRes.json();
      const dept1 = await dept.json();

      setAllUsers(users);
      const map = {};
      dept1.forEach(dep => {
        map[dep.id_dept] = dep.name_th;
        //console.log("user.id_dept" , dep.name_th)
        setDepartmentMap(map)
      });

      // จับคู่ข้อมูลห้องสอบกับกรรมการที่ถูกจัด
      const roomsWithProctors = roomExams.map((room) => {
        // แก้ปัญหาการสะกดชื่อไม่ตรงกัน โดยมั่นใจว่ามีทั้ง No และ no
        const no = room.No !== undefined ? room.No : room.no;

        const roomProctors = assignments.filter(
          (assign) => assign.ref === room.Ref && assign.no === no
        );

        // หาชื่อกรรมการจาก user_id
        const proctorNames = roomProctors
          .map((proctor) => {
            const user = users.find((u) => u.user_id === proctor.user_id);
            return user ? user.full_name : "ไม่พบข้อมูล";
          })
          .join(", ");

        // เพิ่มข้อมูลวันภาษาไทย
        const thaiDay = getThaiDayFromDate(room.Edate);

        return {
          ...room,
          No: no, // เพิ่มฟิลด์ No ให้แน่ใจว่ามีค่า
          proctors: roomProctors,
          proctor_names: proctorNames,
          thaiDay: thaiDay,
        };
      });

      console.log("Processed rooms:", roomsWithProctors);
      setRoomExamData(roomsWithProctors);
      setError(null);
    } catch (error) {
      setError("ไม่สามารถดึงข้อมูลจาก API ได้");
      console.error("API Error:", error);
    }
  };
  console.log("departmentMap", departmentMap[1])
  const fetchProctorData = async () => {
    try {
      setLoading(true);
      // ดึงข้อมูลการจัดกรรมการจาก API
      const [roomExamRes, assignmentsRes, usersRes, condition_proctorRes] =
        await Promise.all([
          fetch(`${localStorage.getItem("API")}/select_data/roomexam`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `${localStorage.getItem("API")}/select_data/proctor_assignments`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(`${localStorage.getItem("API")}/select_data/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${localStorage.getItem("API")}/ConditionWithproctor`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const [roomExams, assignments, users, condition] = await Promise.all([
        roomExamRes.json(),
        assignmentsRes.json(),
        usersRes.json(),
        condition_proctorRes.json(),
      ]);

      setAllUsers(users);

      // เพิ่มข้อมูลวันภาษาไทยสำหรับแต่ละห้องสอบ
      const roomsWithThaiDay = roomExams.map((room) => ({
        ...room,
        thaiDay: getThaiDayFromDate(room.Edate),
      }));

      // จัดรูปแบบข้อมูลสำหรับแสดงผล
      const formattedRooms = roomsWithThaiDay.map((room) => {
        const roomAssignments = assignments.filter((a) => a.ref === room.Ref);
        const proctors = roomAssignments
          .map((a) => {
            const user = users.find((u) => u.user_id === a.user_id);
            return user?.full_name || "";
          })
          .filter((name) => name);

        return {
          ...room,
          proctor_names: proctors.join(", "),
          proctors: roomAssignments,
        };
      });

      setProctorConditions(condition);
      setRoomExamData(formattedRooms);

      // จัดกลุ่มข้อมูลตามกรรมการ
      const proctorWorkload = users.map((user) => {
        const userAssignments = assignments.filter(
          (a) => a.user_id === user.user_id
        );
        const assignedRooms = userAssignments
          .map((a) => {
            const room = roomExams.find((r) => r.Ref === a.ref);
            return room;
          })
          .filter((r) => r);

        return {
          user_id: user.user_id,
          full_name: user.full_name,
          department: user.department,
          exam_count: assignedRooms.length,
          total_hours: assignedRooms.reduce(
            (sum, room) => sum + parseFloat(room.Hr || 0),
            0
          ),
          assignments: assignedRooms,
        };
      });

      setProctorData(proctorWorkload);
      setError(null);
    } catch (err) {
      console.error("Error fetching proctor data:", err);
      setError("ไม่สามารถดึงข้อมูลกรรมการคุมสอบได้");
      setProctorData([]);
    } finally {
      setLoading(false);
    }
  };

  // เพิ่มฟังก์ชันคำนวณชั่วโมงรวม
  const calculateTotalHours = (assignments) => {
    if (!assignments) return 0;
    return assignments.reduce((sum, assignment) => {
      const hours = parseFloat(assignment.Hr || assignment.hr || 0);
      return sum + (isNaN(hours) ? 0 : hours);
    }, 0);
  };

  // File Handlers
  const handleFileChange = useCallback((file) => {
    setFile(file);
    setFileName(file.name || "");
    setProgress(0);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      Swal.fire("ข้อผิดพลาด", "ไม่ได้เลือกไฟล์", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("Proctor_data", file);

      await axios.post(
        `${localStorage.getItem("API")}/upload/proctor_condition`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          },
        }
      );

      await Promise.all([fetchAllData(), fetchProctorData()]);

      Swal.fire("สำเร็จ", "อัพโหลดไฟล์สำเร็จ", "success");
      setFile(null);
      setFileName("");
      setProgress(0);
      setActiveTab("conditions"); 
    } catch (error) {
      console.error("Upload Error:", error);
      Swal.fire({
        title: "ข้อผิดพลาด",
        text: error.response?.data?.error || "การอัพโหลดไฟล์มีปัญหา",
        icon: "error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await axios.post(
        `${localStorage.getItem("API")}/DeltableCondition`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      await Promise.all([fetchAllData(), fetchProctorData()]);

      Swal.fire("สำเร็จ", "ลบไฟล์สำเร็จ", "success");
      setFile(null);
      setFileName("");
    } catch (error) {
      Swal.fire("ข้อผิดพลาด", "การลบไฟล์มีปัญหา", "error");
    }
  };

  // Auto Assign Handler
  // Auto Assign Handler
  const handleAutoAssign = async () => {
    try {
      // ตรวจสอบว่ามีข้อมูลเงื่อนไขกรรมการคุมสอบหรือไม่
      if (!proctorConditions || proctorConditions.length === 0) {
        Swal.fire({
          title: "ข้อมูลไม่ครบถ้วน",
          text: "กรุณานำเข้าเงื่อนไขกรรมการคุมสอบก่อนดำเนินการ",
          icon: "warning",
          confirmButtonText: "ตกลง"
        });
        return;
      }

      const result = await Swal.fire({
        title: "ยืนยันการจัดกรรมการอัตโนมัติ",
        text: "คุณต้องการจัดกรรมการคุมสอบอัตโนมัติใช่หรือไม่?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
      });

      if (result.isConfirmed) {
        setIsAssigning(true); // เริ่ม loading
        const response = await fetch(
          `${localStorage.getItem("API")}/AutoProctor`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Auto assign failed");

        await Promise.all([fetchProctorData()]);
        setIsAssigning(false); // หยุด loading
        Swal.fire("สำเร็จ", "จัดกรรมการคุมสอบเรียบร้อย", "success");
      }
    } catch (error) {
      console.error("Auto assign error:", error);
      setIsAssigning(false); // หยุด loading เมื่อเกิดข้อผิดพลาด
      Swal.fire({
        title: "ข้อผิดพลาด",
        text: "ไม่สามารถจัดกรรมการอัตโนมัติได้",
        icon: "error",
      });
    }
  };

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback(
      (acceptedFiles) => handleFileChange(acceptedFiles[0]),
      [handleFileChange]
    ),
    accept: ".xlsx",
  });

  // Edit proctor handlers
  const handleEditClick = (room) => {
    console.log("Selected room:", room); // ดูข้อมูลห้องที่เลือก
    setSelectedRoom(room);

    // ค้นหากรรมการที่ถูกจัดให้ห้องนี้
    const roomProctors = room.proctors || [];
    const proctorOptions = roomProctors.map((proctor) => {
      const user = allUsers.find((u) => u.user_id === proctor.user_id);
      return {
        value: proctor.user_id,
        label: user ? user.full_name : proctor.user_id,
      };
    });

    setSelectedProctors(proctorOptions);
    setShowEditModal(true);
  };

  // handleSaveProctors สำหรับบันทึกการแก้ไขกรรมการคุมสอบ
  const handleSaveProctors = async () => {
    if (!selectedRoom) return;

    try {
      setSavingChanges(true);

      // ดึงค่า id_config ที่ active อยู่
      const configResponse = await fetch(
        `${localStorage.getItem("API")}/select_data/exam_config`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!configResponse.ok) {
        throw new Error("Failed to get config");
      }

      const configData = await configResponse.json();
      const activeConfig = configData.find(
        (config) => config.Status === true || config.status === true
      );
      const idConfig = activeConfig?.Id_config || activeConfig?.id_config || 1;

      console.log("Selected room full data:", selectedRoom);

      // ค้นหาค่า no จากทุกความเป็นไปได้
      let roomNo = null;
      if (selectedRoom.No !== undefined) roomNo = selectedRoom.No;
      else if (selectedRoom.no !== undefined) roomNo = selectedRoom.no;
      else if (selectedRoom.NO !== undefined) roomNo = selectedRoom.NO;

      if (roomNo === null) {
        console.error(
          "Cannot find room number (no) field in selectedRoom:",
          selectedRoom
        );
        throw new Error("Missing room number");
      }

      const payload = {
        id_config: idConfig,
        ref: selectedRoom.Ref,
        no: roomNo,
        proctors: selectedProctors.map((proctor) => ({
          user_id: proctor.value,
        })),
      };

      console.log("Sending payload:", payload);

      const response = await fetch(
        `${localStorage.getItem("API")}/update_proctor_assignments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      await Promise.all([fetchAllData(), fetchProctorData()]);

      Swal.fire(
        "สำเร็จ",
        "บันทึกการเปลี่ยนแปลงกรรมการคุมสอบเรียบร้อย",
        "success"
      );
      setShowEditModal(false);
    } catch (error) {
      console.error("Error saving proctors:", error);
      Swal.fire(
        "ข้อผิดพลาด",
        `ไม่สามารถบันทึกการเปลี่ยนแปลงได้: ${error.message}`,
        "error"
      );
    } finally {
      setSavingChanges(false);
    }
  };

  // จัดกลุ่มข้อมูลห้องสอบตามวัน และช่วงเวลา
  const groupedRoomExamData = useMemo(() => {
    // จัดรายการตามวันก่อน
    const sortedByDate = [...roomExamData].sort((a, b) => {
      const dateA = a.Edate ? a.Edate.split(" ") : ["0", "January", "2568"];
      const dateB = b.Edate ? b.Edate.split(" ") : ["0", "January", "2568"];

      // เปรียบเทียบปี
      if (dateA[2] !== dateB[2]) return dateA[2] - dateB[2];

      const monthOrder = {
        January: 1,
        February: 2,
        March: 3,
        April: 4,
        May: 5,
        June: 6,
        July: 7,
        August: 8,
        September: 9,
        October: 10,
        November: 11,
        December: 12,
      };
      const monthA = monthOrder[dateA[1]] || 0;
      const monthB = monthOrder[dateB[1]] || 0;

      // เปรียบเทียบเดือน
      if (monthA !== monthB) return monthA - monthB;

      // เปรียบเทียบวัน
      return parseInt(dateA[0]) - parseInt(dateB[0]);
    });

    // จัดกลุ่มตามวันที่
    const groupedByDate = {};
    sortedByDate.forEach((room) => {
      const date = room.Edate || "Unknown";
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(room);
    });

    const result = {};
    Object.entries(groupedByDate).forEach(([date, rooms]) => {
      // จัดกลุ่มตามเวลาสอบ
      const byTime = {};
      rooms.forEach((room) => {
        const time = room.Etime || "Unknown";
        if (!byTime[time]) {
          byTime[time] = [];
        }
        byTime[time].push(room);
      });

      result[date] = byTime;
    });

    return result;
  }, [roomExamData]);

  // UI Components
  const renderUploadTab = () => (
    <>
      <div
        {...getRootProps()}
        className="dropzone text-center p-5"
        style={{
          cursor: "pointer",
          backgroundColor: "#f8f9fa",
          border: "2px dashed #6c757d",
          borderRadius: "0.375rem",
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>ปล่อยไฟล์เพื่ออัพโหลด...</p>
        ) : fileName ? (
          <p>ไฟล์ที่เลือก: {fileName}</p>
        ) : (
          <p>ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์ (เฉพาะไฟล์ .xlsx)</p>
        )}
      </div>

      {progress > 0 && (
        <Row className="mt-4">
          <Col>
            <ProgressBar now={progress} label={`${progress}%`} />
          </Col>
        </Row>
      )}

      <Row
        className="mt-4 justify-content-left"
        style={{ paddingLeft: "20px" }}
      >
        <Button
          type="button"
          className="btn btn-success"
          onClick={() => {
            Swal.fire({
              title: "คุณแน่ใจไหม?",
              text: `คุณต้องการอัพโหลดไฟล์ ${fileName}`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "ยืนยัน",
              cancelButtonText: "ยกเลิก",
            }).then((res) => {
              if (res.isConfirmed) handleUpload();
            });
          }}
          style={{ width: "120px", marginRight: "20px" }}
        >
          อัพโหลดไฟล์
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            Swal.fire({
              title: "คุณต้องการลบไฟล์ใช่ไหม",
              text: "ไฟล์ที่คุณนำเข้าก่อนหน้านี้จะหายไป",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "ยืนยัน",
              cancelButtonText: "ยกเลิก",
            }).then((res) => {
              if (res.isConfirmed) handleDelete();
            });
          }}
          style={{ width: "120px" }}
        >
          ลบไฟล์
        </Button>
      </Row>
    </>
  );

  const renderAssignmentTab = () => {
    return (
      <>
        {/* Controls section - แสดงตลอดเวลา */}
        <div className="d-flex justify-content-start align-items-center gap-3 mb-4">
          <Select
            options={viewOptions}
            placeholder="เลือกมุมมอง"
            value={viewOptions.find((option) => option.value === viewMode)}
            onChange={(selectedOption) => setViewMode(selectedOption.value)}
            isClearable={false}
            className="select-container"
            styles={{
              control: (base) => ({
                ...base,
                minWidth: "200px",
              }),
            }}
          />
          <Button
            variant="success"
            onClick={handleAutoAssign}
            style={{ width: "270px" }}
          >
            จัดกรรมการอัตโนมัติ
          </Button>
        </div>

        {/* Loading and error states */}
        {loading ? (
          <div className="loading-state">กำลังโหลดข้อมูล...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : viewMode === "byProctor" ? (
          renderProctorView()
        ) : (
          renderRoomGroupedView()
        )}
      </>
    );
  };

  // มุมมองที่แสดงห้องสอบแบบจัดกลุ่มตามวันและเวลา
  const renderRoomGroupedView = () => {
    return (
      <div className="room-grouped-view">
        {Object.entries(groupedRoomExamData).map(
          ([date, timeGroups], dateIndex) => {
            // หาวันของสัปดาห์จากวันที่
            const firstRoom = Object.values(timeGroups)[0]
              ? Object.values(timeGroups)[0][0]
              : null;
            const thaiDay = firstRoom?.thaiDay || getThaiDayFromDate(date); // พยายามรับชื่อวันภาษาไทยโดยตรงจากวันที่
            const dayColor = thaiDay ? dayColors[thaiDay] : "#f8f9fa";

            return (
              <div
                key={`date-${dateIndex}`}
                className="date-group mb-4"
                style={{
                  border: `2px solid ${dayColor}`,
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  className="date-header p-2"
                  style={{
                    backgroundColor: dayColor,
                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                >
                  {thaiDay && (
                    <Badge bg="secondary" className="me-2">
                      {thaiDay}
                    </Badge>
                  )}
                  {date}
                </div>

                {Object.entries(timeGroups).map(([time, rooms], timeIndex) => (
                  <div
                    key={`time-${dateIndex}-${timeIndex}`}
                    className="time-group mb-3 p-2"
                  >
                    <div
                      className="time-header mb-2 p-2"
                      style={{
                        backgroundColor: dayColor,
                        color:
                          thaiDay === "อาทิตย์" || thaiDay === "เสาร์"
                            ? "#333"
                            : "#000",
                      }}
                    >
                      <strong>ช่วงเวลา: {time}</strong>
                    </div>

                    <div className="table-responsive">
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr className="bg-light">
                            <th>ห้องสอบ</th>
                            <th>รหัสวิชา</th>
                            <th>จำนวน นศ.</th>
                            <th>กรรมการคุมสอบ</th>
                            <th>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map((room, roomIndex) => (
                            <tr
                              key={`room-${dateIndex}-${timeIndex}-${roomIndex}`}
                            >
                              <td>
                                {roomMapping[room.Room_id] || room.Room_id}
                              </td>
                              <td>{room.Course}</td>
                              <td>{room.Num_st || "-"}</td>
                              <td>{room.proctor_names || "-"}</td>
                              <td>
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => handleEditClick(room)}
                                  style={{
                                    minWidth: "100px",
                                    whiteSpace: "nowrap",
                                    padding: "4px 8px",
                                    fontSize: "14px",
                                  }}
                                >
                                  แก้ไขกรรมการ
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
        )}
      </div>
    );
  };

  // มุมมองกรรมการคุมสอบ (คงเดิม)
  const renderProctorView = () => {
    return (
      <div className="table-responsive mt-3">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ-นามสกุล</th>
              <th>ภาควิชา</th>
              <th>จำนวนห้องที่คุมสอบ</th>
              <th>รวมชั่วโมงคุมสอบ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {proctorData.map((proctor) => (
              <tr key={proctor.user_id}>
                <td>{proctor.user_id}</td>
                <td>{proctor.full_name}</td>
                <td>{departmentMap[proctor.department] || "--"}</td>
                <td>{proctor.exam_count} วิชา</td>
                <td>{proctor.total_hours} ชั่วโมง</td>
                <td>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setSelectedUserDetails(proctor);
                      setShowDetailsModal(true);
                    }}
                    style={{
                      minWidth: "120px",
                      whiteSpace: "nowrap",
                      padding: "4px 8px",
                      fontSize: "14px",
                    }}
                  >
                    ดูรายละเอียด
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const renderConditionsTab = () => (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อ-นามสกุล</th>
            <th>เงื่อนไขพื้นฐาน</th>
            <th>วันที่พิเศษ</th>
            <th>ช่วงเวลา</th>
            <th>วิชาพิเศษ</th>
            <th>ข้อจำกัดเวลา</th>
            <th>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {proctorConditions?.map((condition, index) => (
            <tr key={index}>
              <td>{condition.users.user_id}</td>
              <td>{condition.users.full_name}</td>
              <td>{condition.condition_proctor.base_condition}</td>
              <td>{condition.condition_proctor.special_dates || "-"}</td>
              <td>{condition.condition_proctor.time_period || "-"}</td>
              <td>{condition.condition_proctor.special_courses || "-"}</td>
              <td>{condition.condition_proctor.time_restriction || "-"}</td>
              <td>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => openCondEdit(condition)}
                  style={{ minWidth: 90 }}
                >
                  แก้ไข
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  // Initial data fetch
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchAllData(), fetchProctorData()]);
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  return (
    <>
      <SidebarMenu/>
      <LoadingModal show={isAssigning} />
      <Container
        fluid
        className="custom-background"
        style={{ paddingTop: "100px" }}
      >
        <Container className="d-flex justify-content-center align-items-center">
          <Card className="shadow-lg" style={{ width: "100%" }}>
            <Card.Body>
              <Card.Title as="h1" className="text-center mb-4">
                นำเข้าข้อมูลกรรมการคุมสอบ xlsx โดยผู้ดูแลห้องอำนวยการสอบ
              </Card.Title>
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "upload"}
                    onClick={() => setActiveTab("upload")}
                  >
                    นำเข้าข้อมูลกรรมการคุมสอบ xlsx
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "assignment"}
                    onClick={() => {
                      setActiveTab("assignment");
                      fetchProctorData();
                    }}
                  >
                    จัดการกรรมการคุมสอบ
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "conditions"}
                    onClick={() => {
                      setActiveTab("conditions");
                      fetchAllData();
                    }}
                  >
                    เงื่อนไขกรรมการคุมสอบ
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              <Form>
                {activeTab === "upload" && renderUploadTab()}
                {activeTab === "assignment" && renderAssignmentTab()}
                {activeTab === "conditions" && renderConditionsTab()}
              </Form>
            </Card.Body>
          </Card>
        </Container>

        {/* Modal แสดงรายละเอียดกรรมการ */}
        <Modal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          size="lg"
        >
          <Modal.Header closeButton className="bg-success text-white">
            <Modal.Title>
              รายละเอียดการคุมสอบ - {selectedUserDetails?.full_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="table-responsive">
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>วันที่สอบ</th>
                    <th>เวลา</th>
                    <th>รหัสวิชา</th>
                    <th>ห้องสอบ</th>
                    <th>ชั่วโมงคุมสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUserDetails?.assignments?.map(
                    (assignment, index) => (
                      <tr key={index}>
                        <td>{assignment.Edate}</td>
                        <td>{assignment.Etime}</td>
                        <td>{assignment.Course}</td>
                        <td>
                          {roomMapping[assignment.Room_id] ||
                            assignment.Room_id}
                        </td>

                        <td>{assignment.Hr} ชั่วโมง</td>
                      </tr>
                    )
                  )}
                </tbody>
              </Table>
            </div>
            <div className="summary-section">
              <h6>สรุปภาระงาน</h6>
              <p>
                จำนวนวิชาที่คุมสอบ: {selectedUserDetails?.exam_count || 0} วิชา
              </p>
              <p>
                รวมชั่วโมงคุมสอบ: {selectedUserDetails?.total_hours || 0}{" "}
                ชั่วโมง
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDetailsModal(false)}
            >
              ปิด
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal แก้ไขกรรมการคุมสอบ */}
        <Modal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          size="lg"
          backdrop="static"
        >
          <Modal.Header closeButton className="bg-warning">
            <Modal.Title>
              แก้ไขกรรมการคุมสอบ -{" "}
              {roomMapping[selectedRoom?.Room_id] || selectedRoom?.Room_id} วิชา{" "}
              {selectedRoom?.Course}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-4">
              <h6 className="mb-3">รายละเอียดการสอบ:</h6>
              <Table striped bordered size="sm">
                <tbody>
                  <tr>
                    <th style={{ width: "150px" }}>รหัสห้อง:</th>
                    <td>
                      {roomMapping[selectedRoom?.Room_id] ||
                        selectedRoom?.Room_id}
                    </td>
                  </tr>
                  <tr>
                    <th>วันที่:</th>
                    <td>{selectedRoom?.Edate}</td>
                  </tr>
                  <tr>
                    <th>เวลา:</th>
                    <td>{selectedRoom?.Etime}</td>
                  </tr>
                  <tr>
                    <th>รหัสวิชา:</th>
                    <td>{selectedRoom?.Course}</td>
                  </tr>
                  <tr>
                    <th>จำนวนนักศึกษา:</th>
                    <td>{selectedRoom?.Num_st || "ไม่ระบุ"} คน</td>
                  </tr>
                </tbody>
              </Table>
            </div>

            <div className="mb-4">
              <h6 className="mb-3">เลือกกรรมการคุมสอบ:</h6>
              <Select
                isMulti
                options={allUsers.map((user) => ({
                  value: user.user_id,
                  label: `${user.full_name} (${user.department || "ไม่ระบุภาควิชา"
                    })`,
                }))}
                value={selectedProctors}
                onChange={setSelectedProctors}
                placeholder="เลือกกรรมการคุมสอบ"
                noOptionsMessage={() => "ไม่พบข้อมูลกรรมการ"}
                className="mb-3"
                isClearable={true}
                isSearchable={true}
                closeMenuOnSelect={false}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={savingChanges}
            >
              ยกเลิก
            </Button>
            <Button
              variant="success"
              onClick={handleSaveProctors}
              disabled={savingChanges}
            >
              {savingChanges ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />{" "}
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกการเปลี่ยนแปลง"
              )}
            </Button>
          </Modal.Footer>
        </Modal>
        {/* Modal แก้ไขเงื่อนไขกรรมการ */}
        <Modal
          show={showCondModal}
          onHide={() => setShowCondModal(false)}
          size="lg"
          backdrop="static"
        >
          <Modal.Header closeButton className="bg-info text-white">
            <Modal.Title>แก้ไขเงื่อนไข - {editingCond?.full_name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>เงื่อนไขพื้นฐาน</Form.Label>
                    <Form.Control
                      value={editingCond?.base_condition || ""}
                      onChange={(e) =>
                        setEditingCond((p) => ({ ...p, base_condition: e.target.value }))
                      }
                      placeholder="เช่น ไม่มี / เวรเช้า / เวรบ่าย ฯลฯ"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>วันที่พิเศษ</Form.Label>
                    <Form.Control
                      value={editingCond?.special_dates || ""}
                      onChange={(e) =>
                        setEditingCond((p) => ({ ...p, special_dates: e.target.value }))
                      }
                      placeholder="เช่น 05/10/2025, 06/10/2025"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>ช่วงเวลา</Form.Label>
                    <Form.Control
                      value={editingCond?.time_period || ""}
                      onChange={(e) =>
                        setEditingCond((p) => ({ ...p, time_period: e.target.value }))
                      }
                      placeholder="เช่น เช้า, บ่าย, ทั้งวัน"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>วิชาพิเศษ</Form.Label>
                    <Form.Control
                      value={editingCond?.special_courses || ""}
                      onChange={(e) =>
                        setEditingCond((p) => ({ ...p, special_courses: e.target.value }))
                      }
                      placeholder="รหัสวิชาเฉพาะที่ทำได้/ทำไม่ได้"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>ข้อจำกัดเวลา</Form.Label>
                    <Form.Control
                      value={editingCond?.time_restriction || ""}
                      onChange={(e) =>
                        setEditingCond((p) => ({ ...p, time_restriction: e.target.value }))
                      }
                      placeholder="เช่น ห้ามเกิน 2 ชม./วัน, ไม่สะดวกวันจันทร์"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCondModal(false)}>
              ยกเลิก
            </Button>
            <Button variant="success" onClick={saveCondEdit}>
              บันทึก
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </>
  );
}
