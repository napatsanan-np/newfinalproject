import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import { Button, Container, Card, Table, Badge, Row, Col } from "react-bootstrap";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import { FaEdit, FaTrash, FaMagic, FaSearch, FaCalendarAlt, FaClock, FaChalkboardTeacher, FaFilter, FaTimes, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./ExamRoomManagement.css";

const ExamRoomManagement = () => {
  const [selectedRoomsForAutoAssign, setSelectedRoomsForAutoAssign] = useState([]);

  const [examRooms, setExamRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [dates, setDates] = useState([]);
  const [times, setTimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltered, setIsFiltered] = useState(false);
  const token = localStorage.getItem("token");
  const URL = window.API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    fetchExamRooms();
    fetchAvailableRooms();
  }, [selectedDate, selectedTime]);

  const fetchAvailableRooms = async () => {
    try {
      const response = await fetch(localStorage.getItem("API") + "/select_data/rooms", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch available rooms");
      
      const rooms = await response.json();
      setAvailableRooms(rooms);
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลห้องได้",
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const fetchExamRooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(localStorage.getItem("API") + "/DataRoomexam", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!res.ok) throw new Error("Failed to fetch exam room data");
  
      const dataRoomExam = await res.json();
      
      // ตรวจสอบว่าข้อมูลมี room_id หรือไม่ ถ้าไม่มีให้เพิ่มจาก rooms.room_id
      const processedData = dataRoomExam.map(item => {
        if (!item.roomexam.room_id && item.rooms && item.rooms.room_id) {
          return {
            ...item,
            roomexam: {
              ...item.roomexam,
              room_id: item.rooms.room_id
            }
          };
        }
        return item;
      });
      
      setExamRooms(processedData || []);
      
      // กรองข้อมูลตามตัวกรองที่เลือก หรือแสดงทั้งหมดถ้าไม่มีการเลือกตัวกรอง
      handleFilterRooms(processedData || [], selectedDate, selectedTime);
  
      const uniqueDates = [...new Set(processedData.map((exam) => exam.roomexam.Edate))];
      const uniqueTimes = [...new Set(processedData.map((exam) => exam.roomexam.Etime))];
  
      setDates(uniqueDates.map((date) => ({ value: date, label: date })));
      setTimes(uniqueTimes.map((time) => ({ value: time, label: time })));
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);

    }
  };

  // แยกฟังก์ชันกรองข้อมูลออกมา เพื่อให้สามารถใช้กับข้อมูลที่ส่งมาได้
  const handleFilterRooms = (rooms, date, time) => {
    let filtered = [...rooms];
    let isCurrentlyFiltered = false;

    if (date) {
      filtered = filtered.filter((exam) => exam.roomexam.Edate === date.value);
      isCurrentlyFiltered = true;
    }
    if (time) {
      filtered = filtered.filter((exam) => exam.roomexam.Etime === time.value);
      isCurrentlyFiltered = true;
    }

    // ถ้าไม่มีตัวกรองทั้งวันและเวลา ให้แสดงรายการทั้งหมด
    if (!date && !time) {
      filtered = [...rooms];
      isCurrentlyFiltered = false;
    }

    setFilteredRooms(filtered);
    setIsFiltered(isCurrentlyFiltered);
  };

  useEffect(() => {
    handleFilterRooms(examRooms, selectedDate, selectedTime);
  }, [examRooms, selectedDate, selectedTime]);

  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setFilteredRooms(examRooms);
    setIsFiltered(false);
  };
  const handleUpdateRoom = async (examNo, currentSeatrow, currentRoomId) => {
    try {
      // สร้างตัวเลือกห้องสอบ
      const inputOptions = Object.fromEntries(
        availableRooms.map(room => [room.room_id, `${room.room_name} (ความจุ: ${room.capacity} คน)`])
      );
    
      // ฟังก์ชันช่วยในการกำหนดรูปแบบแถวเริ่มต้น
      function determineInitialRowPattern(seatrow) {
        if (!seatrow) return 'all';
        if (seatrow === '-') return 'all';
        if (seatrow === 'คี่') return 'odd';
        if (seatrow === 'คู่') return 'even';
    
        return 'custom';
      }
  
      // กำหนดค่าเริ่มต้นของ seatrow สำหรับการแสดงผล
      let displaySeatrow = '';
      if (currentSeatrow === '-') {
        displaySeatrow = '';
      } else {
        displaySeatrow = currentSeatrow || '';
      }
    
      // สร้างฟอร์ม HTML สำหรับการเลือกห้องและรูปแบบแถว
      const formHtml = `
        <form id="updateRoomForm" class="text-left">
          <div class="form-group mb-3">
            <label for="roomSelect" class="form-label">เลือกห้องสอบ:</label>
            <select id="roomSelect" class="form-select">
              <option value="">-- เลือกห้องสอบ --</option>
              ${Object.entries(inputOptions).map(([id, name]) => 
                `<option value="${id}" ${id === currentRoomId ? 'selected' : ''}>${name}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="row mb-3">
            <div class="col-md-6">
              <label for="rowPatternSelect" class="form-label">รูปแบบแถว:</label>
              <select id="rowPatternSelect" class="form-select">
                <option value="all">ทุกแถว</option>
                <option value="odd">แถวคี่</option>
                <option value="even">แถวคู่</option>
                <option value="custom">กำหนดเอง</option>
              </select>
            </div>
            
            <div class="col-md-6" id="customRowContainer">
              <label for="customRowInput" class="form-label">ระบุแถว:</label>
              <input 
                type="text" 
                id="customRowInput" 
                class="form-control" 
                value="${displaySeatrow}"
                placeholder=""
              />
            </div>
          </div>
        </form>
      `;
    
      const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'แก้ไขข้อมูลห้องสอบ',
        html: formHtml,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        confirmButtonText: 'ยืนยัน',
        confirmButtonColor: '#3085d6',
        didOpen: () => {
          // ตั้งค่ารูปแบบแถวเริ่มต้นตาม currentSeatrow (ถ้ามี)
          const initialPattern = determineInitialRowPattern(currentSeatrow);
          const patternSelect = document.getElementById('rowPatternSelect');
          const customInput = document.getElementById('customRowInput');
          
          patternSelect.value = initialPattern;
          
          // กำหนดค่า input ตามรูปแบบที่เลือกเริ่มต้น
          if (initialPattern === 'all') {
            customInput.value = 'ทุกแถว';
          } else if (initialPattern === 'odd') {
            customInput.value = 'คี่';
          } else if (initialPattern === 'even') {
            customInput.value = 'คู่';
          } else if (initialPattern === 'custom') {
            // ถ้าเป็น custom แต่ค่าเป็น '-' ให้แสดงเป็นค่าว่าง
            if (currentSeatrow === '-') {
              customInput.value = '';
            } else {
              customInput.value = currentSeatrow || '';
            }
          }
          
          // เมื่อกดเลือกช่องกรอก และเป็นค่าเริ่มต้น ให้เคลียร์ข้อความ
          customInput.addEventListener('focus', function() {
            if (customInput.value === 'ทุกแถว' || customInput.value === 'คี่' || customInput.value === 'คู่') {
              customInput.value = '';
            }
          });
          
          // เพิ่ม event listener เพื่อซิงค์ระหว่าง dropdown และ input field
          patternSelect.addEventListener('change', function() {
            if (patternSelect.value === 'all') {
              customInput.value = 'ทุกแถว';
            } else if (patternSelect.value === 'odd') {
              customInput.value = 'คี่';
            } else if (patternSelect.value === 'even') {
              customInput.value = 'คู่';
            } else if (patternSelect.value === 'custom') {
              customInput.value = '';
            }
          });
        },
        customClass: {
          container: 'my-swal-container',
          popup: 'my-swal-popup',
          title: 'my-swal-title',
          confirmButton: 'my-swal-confirm-button',
          cancelButton: 'my-swal-cancel-button',
        },
        preConfirm: () => {
          const roomId = document.getElementById('roomSelect').value;
          const seatrow = document.getElementById('customRowInput').value.trim();
          const rowPattern = document.getElementById('rowPatternSelect').value;
          
          if (!roomId) {
            Swal.showValidationMessage('กรุณาเลือกห้องสอบ');
            return false;
          }
          
          return {
            roomId,
            seatrow,
            rowPattern
          };
        }
      });
    
      if (isConfirmed && formValues) {
        // แสดงสถานะกำลังโหลด
        Swal.fire({
          title: 'กำลังอัพเดทข้อมูล',
          text: 'กรุณารอสักครู่...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
    
        const response = await fetch(`${localStorage.getItem("API")}/UpdateExamRoom`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            room_id: formValues.roomId,
            No: examNo,
            seatrow:  formValues.seatrow,
            pattern: formValues.rowPattern
          })
        });
    
        if (response.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'อัพเดทข้อมูลห้องสอบเรียบร้อยแล้ว',
            confirmButtonColor: '#28a745',
          });
          await fetchExamRooms();
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update exam room');
        }
      }
    } catch (error) {
      console.error('Error updating room:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถอัพเดทห้องสอบได้',
        confirmButtonColor: '#dc3545',
      });
    }
  };

  const handleDeleteRoom = async (examNo) => {
    try {
      const result = await Swal.fire({
        title: 'ยืนยันการลบ',
        text: 'คุณต้องการลบห้องสอบนี้ใช่หรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, ลบเลย',
        cancelButtonText: 'ยกเลิก'
      });
      
      if (result.isConfirmed) {
        const response = await fetch(`${localStorage.getItem("API")}/DeleteExamRoom`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            No: examNo
          })
        });

        if (response.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'ลบห้องสอบเรียบร้อยแล้ว',
            confirmButtonColor: '#28a745',
          });
          await fetchExamRooms();
        } else {
          throw new Error('Failed to delete exam room');
        }
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถลบห้องสอบได้',
        confirmButtonColor: '#dc3545',
      });
    }
  };
  
// แก้ไข 2: ปรับปรุงฟังก์ชัน AutoRoomExam เพื่อให้ผู้ใช้เลือกห้องที่ต้องการใช้
const AutoRoomExam = async () => {
  try {


    // เพิ่มขั้นตอนให้ผู้ใช้เลือกห้องที่ต้องการใช้ในการจัดสอบ
    const { value: selectedRooms, isConfirmed } = await Swal.fire({
      title: 'เลือกห้องที่ไม่ต้องการใช้ในการจัดสอบ',
      html: `
        <div class="rooms-selection-container">
          <p class="text-muted mb-3">กรุณาเลือกห้องที่ไม่ต้องการให้ระบบใช้ในการจัดสอบอัตโนมัติ</p>
          <div class="room-grid-container">
            ${availableRooms.map(room => `
              <div class="room-item">
                <label class="room-card">
                  <input type="checkbox" value="${room.room_id}" class="room-checkbox">
                  <div class="room-card-content">
                    <div class="room-name">${room.room_name}</div>
                    <div class="room-capacity">
                      <i class="fa fa-users"></i> ${room.capacity} คน
                    </div>
                  </div>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'จัดห้องสอบ',
      cancelButtonText: 'ยกเลิก',
      width: '650px',
      confirmButtonColor: '#28a745',
      preConfirm: () => {
        const selectedRoomIds = Array.from(document.querySelectorAll('.room-checkbox:checked'))
          .map(input => input.value);
        

        
        return selectedRoomIds;
      },
      didOpen: () => {
        // เพิ่ม CSS แบบ inline สำหรับการแสดงผล
        const style = document.createElement('style');
        style.innerHTML = `
          .rooms-selection-container {
            max-height: 450px;
            overflow-y: auto;
            padding: 10px 5px;
          }
          .room-grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 12px;
          }
          .room-item {
            position: relative;
          }
          .room-card {
            display: block;
            border: 2px solid #e4e7ea;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.2s;
            cursor: pointer;
            width: 100%;
            margin: 0;
          }
          .room-card:hover {
            border-color: #80bdff;
            box-shadow: 0 0 0 3px rgba(0,123,255,.1);
          }
          .room-checkbox {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 20px;
            z-index: 1;
          }
          .room-card-content {
            padding: 15px;
          }
          .room-name {
            font-weight: bold;
            font-size: 1.1em;
            color: #495057;
            margin-bottom: 5px;
          }
          .room-capacity {
            color: #6c757d;
            font-size: 0.95em;
          }
          .room-checkbox:checked + .room-card-content {
            background-color: rgba(40, 167, 69, 0.1);
          }
          .room-checkbox:checked + .room-card-content .room-name {
            color: #28a745;
          }
        `;
        document.head.appendChild(style);
      }
    });
    
    if (!isConfirmed || !selectedRooms) {
      return; // ผู้ใช้กดยกเลิกหรือไม่ได้เลือกห้อง
    }
    
    // เก็บห้องที่เลือกไว้ใน state
    setSelectedRoomsForAutoAssign(selectedRooms);
    
    // แสดงกำลังดำเนินการ
    Swal.fire({
      title: 'กำลังจัดห้องสอบ',
      text: 'กรุณารอสักครู่...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // แสดงว่ามีการส่งข้อมูลไปยัง server
    console.log('Sending data:', {
      date: selectedDate ? selectedDate.value : null,
      time: selectedTime ? selectedTime.value : null,
      selectedRooms: selectedRooms // ไม่ได้ส่งไปยัง API แต่แสดงใน console เพื่อการตรวจสอบ
    });
    
    // เรียก API เดิมโดยไม่ส่งข้อมูลห้องที่เลือก (เนื่องจาก API ยังไม่รองรับ)
    const response = await fetch(localStorage.getItem("API") + "/AutoExamRoom", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: selectedDate ? selectedDate.value : null,
        time: selectedTime ? selectedTime.value : null,
        selectedRooms:  selectedRooms ? selectedRooms : null ,// ไม่ได้ส่งไปยัง API แต่แสดงใน console เพื่อการตรวจสอบ
      }),
    });

    if (response.ok) {
      const result = await response.json();
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        html: `
          <div class="text-left">
            <p>การจัดห้องสอบกึ่งอัตโนมัติสำเร็จ</p>
            <p class="text-muted small">เวลาที่ใช้ในการประมวลผล: ${result.execution_time_seconds} วินาที</p>
          </div>
        `,
        confirmButtonColor: '#28a745',
      });
      await fetchExamRooms();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: `Request failed: ${response.statusText}`,
        confirmButtonColor: '#dc3545',
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: error.message,
      confirmButtonColor: '#dc3545',
    });
  }
};

  // เพิ่มฟังก์ชันในการนำทางไปยังหน้าเพิ่มห้องสอบ
  const navigateToAddExamRoom = () => {
    navigate('/add-exam-room');
  };

  // เพิ่มฟังก์ชันในการแสดงจำนวนรายการ
  const getTotalItems = () => {
    return filteredRooms.length;
  };

  // เพิ่มฟังก์ชันในการแสดงสถานะการโหลด
  const renderLoadingState = () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">กำลังโหลด...</span>
      </div>
      <p className="mt-3">กำลังโหลดข้อมูล กรุณารอสักครู่...</p>
    </div>
  );

  // สร้างคอมโพเนนต์สำหรับการแสดงสถานะเมื่อไม่มีข้อมูล
  const renderEmptyState = () => (
    <div className="text-center py-5">
      <FaSearch size={40} className="text-muted mb-3" />
      <h5>ไม่พบข้อมูลห้องสอบ</h5>
      <p className="text-muted">
        ลองเปลี่ยนตัวกรองหรือล้างการค้นหาเพื่อดูข้อมูลทั้งหมด
      </p>
      {isFiltered && (
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={clearFilters}
          className="mt-2"
        >
          <FaTimes className="me-1" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );

  // Custom styling for react-select
  const customSelectStyles = {
    control: (base) => ({
      ...base,
      boxShadow: 'none',
      borderColor: '#ced4da',
      '&:hover': {
        borderColor: '#80bdff'
      }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : null,
      color: state.isSelected ? 'white' : 'black'
    })
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
      <Container fluid style={{ minHeight: "500px" }}>

          <Card className="exam-management-card shadow-sm border-0" style={{ minHeight: "500px" }}>
            <Card.Header className="bg-gradient d-flex justify-content-between align-items-center py-3">
              <h4 className="mb-0 fw-bold text-primary">
                <FaChalkboardTeacher className="me-2" />
                ระบบจัดการห้องสอบ
              </h4>
              <div className="d-flex align-items-center">
                {/* เพิ่มปุ่มเพิ่มห้องสอบ */}
                <Button 
                  variant="primary" 
                  className="me-2 d-flex align-items-center" 
                  onClick={navigateToAddExamRoom}
                >
                  <FaPlus className="me-2" />
                  เพิ่มห้องสอบ
                </Button>
                {isFiltered && (
                  <Badge bg="primary" className="me-2 py-2 px-3">
                    <FaFilter className="me-1" />
                    กรองข้อมูลแล้ว
                  </Badge>
                )}
                <Badge bg="info" className="p-2 fs-6">
                  {isLoading ? "กำลังโหลด..." : `${getTotalItems()} รายการ`}
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <Row className="mb-4">
                <Col md={4}>
                  <div className="mb-3 mb-md-0">
                    <label className="form-label d-flex align-items-center">
                      <FaCalendarAlt className="me-2 text-primary" />
                      <span>วันที่สอบ</span>
                    </label>
                    <Select
                      options={dates}
                      placeholder="เลือกวันที่สอบ"
                      value={selectedDate}
                      onChange={setSelectedDate}
                      isClearable
                      styles={customSelectStyles}
                      className="select-container"
                      isDisabled={isLoading}
                    />
                  </div>
                </Col>
                <Col md={4}>
                  <div className="mb-3 mb-md-0">
                    <label className="form-label d-flex align-items-center">
                      <FaClock className="me-2 text-primary" />
                      <span>เวลาสอบ</span>
                    </label>
                    <Select
                      options={times}
                      placeholder="เลือกเวลาสอบ"
                      value={selectedTime}
                      onChange={setSelectedTime}
                      isClearable
                      styles={customSelectStyles}
                      className="select-container"
                      isDisabled={isLoading}
                    />
                  </div>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <div className="d-flex w-100 gap-2">
                    <Button
                      variant="success"
                      className="auto-assign-button flex-grow-1"
                      onClick={AutoRoomExam}
                      disabled={isLoading}
                    >
                      <FaMagic className="me-2" />
                      จัดห้องสอบกึ่งอัตโนมัติ
                    </Button>
                    {isFiltered && (
                      <Button
                        variant="outline-secondary"
                        className="flex-shrink-0"
                        onClick={clearFilters}
                        disabled={isLoading}
                      >
                        <FaTimes />
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>

              {selectedDate && selectedTime && (
                <div className="alert alert-info d-flex align-items-center mb-4">
                  <FaFilter className="me-2" />
                  <div>
                    กำลังแสดงข้อมูลสำหรับ <strong>วันที่: {selectedDate.label}</strong> และ <strong>เวลา: {selectedTime.label}</strong>
                  </div>
                </div>
              )}
              
              {selectedDate && !selectedTime && (
                <div className="alert alert-info d-flex align-items-center mb-4">
                  <FaFilter className="me-2" />
                  <div>
                    กำลังแสดงข้อมูลสำหรับ <strong>วันที่: {selectedDate.label}</strong>
                  </div>
                </div>
              )}
              
              {!selectedDate && selectedTime && (
                <div className="alert alert-info d-flex align-items-center mb-4">
                  <FaFilter className="me-2" />
                  <div>
                    กำลังแสดงข้อมูลสำหรับ <strong>เวลา: {selectedTime.label}</strong>
                  </div>
                </div>
              )}
              
              {!selectedDate && !selectedTime && filteredRooms.length > 0 && (
                <div className="alert alert-info d-flex align-items-center mb-4">
                  <FaFilter className="me-2" />
                  <div>
                    กำลังแสดงข้อมูลทั้งหมด <strong>({filteredRooms.length} รายการ)</strong>
                  </div>
                </div>
              )}

              {isLoading ? (
                renderLoadingState()
              ) : filteredRooms.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="table-responsive exam-room-table-container">
                  <Table hover className="exam-room-table align-middle">
                    <thead>
                      <tr className="bg-light">
                        <th className="text-center">Ref</th>
                        <th>วันที่สอบ</th>
                        <th>เวลาสอบ</th>
                        <th>รายวิชา</th>
                        <th>แถว</th>
                        <th className="text-center">นศ.</th>
                        <th>ห้องสอบ</th>
                        <th className="text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.map((exam, index) => (
                        <tr key={exam.roomexam.Ref}>
                          <td className="text-center">{exam.roomexam.Ref}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaCalendarAlt className="me-2 text-info" size={14} />
                              {exam.roomexam.Edate}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaClock className="me-2 text-info" size={14} />
                              {exam.roomexam.Etime}
                            </div>
                          </td>
                          <td>
                            <span className="course-name">{exam.roomexam.Course}</span>
                            <small className="d-block text-muted">No: {exam.roomexam.No}</small>
                          </td>
                          <td>
                          
                            <small className="d-block text-muted"> {exam.roomexam.Seatrow}</small>
                          </td>
                          <td className="text-center">
                            <Badge 
                              bg="warning"
                              pill
                            >
                              {exam.roomexam.Num_st} คน
                            </Badge>
                          </td>
                          <td>
                            <Badge
                              bg={exam.rooms.room_name === "ไม่มีห้อง" ? "danger" : "success"} 
                              className="room-badge px-3 py-2" 
                            >
                              {exam.rooms.room_name}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex justify-content-center gap-2">
                            <Button
  variant="outline-warning"
  size="sm"
  className="edit-button"
  onClick={() => handleUpdateRoom(exam.roomexam.No, exam.roomexam.Seatrow, exam.roomexam.room_id)}
>
  <FaEdit /> แก้ไข
</Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="delete-button"
                                onClick={() => handleDeleteRoom(exam.roomexam.No)}
                              >
                                <FaTrash /> ลบ
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
    </>
  );
};

export default ExamRoomManagement;