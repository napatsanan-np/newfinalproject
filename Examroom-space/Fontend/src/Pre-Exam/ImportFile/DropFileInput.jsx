import React, { useEffect, useState, useCallback } from "react";
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
  Badge,
} from "react-bootstrap";
import { useDropzone } from "react-dropzone";
import { FaFileUpload, FaTrashAlt, FaTable, FaDoorOpen, FaFileExcel, FaEdit } from "react-icons/fa"; // >>> ADD (FaEdit)
import ExamTable from "./ExamTable";
import RoomExam from "./RoomExam";
import EditImportedData from "./EditImportedData";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import "./DropFileInput-styles.css";
import { useLocation } from "react-router-dom";
export default function UploadFile() {
  const URL = localStorage.getItem("API");
  const token = localStorage.getItem("token");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dataExamTable, setDataExamTable] = useState([]);
  const [roomExamData, setRoomExamData] = useState([]);
  const [selectedOption, setSelectedOption] = useState("examTable");
  const [progress, setProgress] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  console.log("API",)
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.endsWith("/edit") ? "edit" : "import"
  );
  useEffect(() => {
    if (location.pathname.endsWith("/edit")) {
      setActiveTab("edit");
    } else {
      setActiveTab("import");
    }
  }, [location.pathname]);
  async function GetDataFromApi() {
    setIsLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(localStorage.getItem("API") + "/select_data/examtable", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(localStorage.getItem("API") + "/DataRoomexam", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);
      const dataExam = await res1.json();
      const dataRoomExam = await res2.json();
      setRoomExamData(dataRoomExam || []);
      setDataExamTable(dataExam || []);
      setLastUpdated(new Date());
    } catch (error) {
      Swal.fire({
        title: "ข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลจาก API ได้",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    GetDataFromApi();
  }, []);

  const handleFileChange = (file) => {
    setFile(file);
    setFileName(file.name || "");
    setProgress(0);
  };

  const DeletePopUp = () => {
    Swal.fire({
      title: "คุณต้องการลบไฟล์ใช่ไหม",
      text: "ไฟล์ที่คุณนำเข้าก่อนหน้านี้จะหายไป",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      customClass: {
        confirmButton: 'btn btn-primary mx-2',
        cancelButton: 'btn btn-danger mx-2'
      },
      buttonsStyling: false
    }).then((res) => {
      if (res.isConfirmed) {
        handleDelete();
      }
    });
  };

  const UploadPopUp = () => {
    if (!file) {
      Swal.fire({
        title: "ข้อผิดพลาด",
        text: "กรุณาเลือกไฟล์ก่อนอัพโหลด",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    Swal.fire({
      title: "คุณแน่ใจไหม?",
      text: `คุณต้องการอัพโหลดไฟล์ ${fileName}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      customClass: {
        confirmButton: 'btn btn-success mx-2',
        cancelButton: 'btn btn-secondary mx-2'
      },
      buttonsStyling: false
    }).then((res) => {
      if (res.isConfirmed) {
        handleUpload();
      }
    });
  };

  const handleUpload = async () => {
    try {
      if (file) {
        setIsLoading(true);
        const formData = new FormData();
        formData.append("FileExcel", file);
        await axios.post(`${localStorage.getItem("API")}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        });
        GetDataFromApi();
        Swal.fire({
          title: "สำเร็จ",
          text: "อัพโหลดไฟล์สำเร็จ",
          icon: "success",
          confirmButtonColor: "#28a745"
        });
        setProgress(0);
        setFile(null);
        setFileName("");
      } else {
        Swal.fire({
          title: "ข้อผิดพลาด",
          text: "ไม่ได้เลือกไฟล์",
          icon: "error",
          confirmButtonColor: "#dc3545"
        });
      }
    } catch (error) {
      console.log("ERROR FROM UPLOAD csv ::", error.response?.data);
      Swal.fire({
        title: "ข้อผิดพลาด",
        text: error.response?.data?.error || "การอัพโหลดไฟล์มีปัญหา",
        icon: "error",
        confirmButtonColor: "#dc3545"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${localStorage.getItem("API")}/DeleteTable`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      GetDataFromApi();
      Swal.fire({
        title: "สำเร็จ",
        text: "ลบไฟล์สำเร็จ",
        icon: "success",
        confirmButtonColor: "#28a745"
      });
      setFile(null);
      setFileName("");
    } catch (error) {
      Swal.fire({
        title: "ข้อผิดพลาด",
        text: "การลบไฟล์มีปัญหา",
        icon: "error",
        confirmButtonColor: "#dc3545"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    handleFileChange(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ".xlsx",
  });

  const SelectTable = () => {
    if (isLoading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary custom-spinner" role="status">
            <span className="visually-hidden">กำลังโหลด...</span>
          </div>
          <p className="mt-3">กำลังโหลดข้อมูล...</p>
        </div>
      );
    }

    if (dataExamTable.length !== 0) {
      return selectedOption === "examTable" ? (
        <ExamTable data={dataExamTable} />
      ) : (
        <RoomExam data={roomExamData} />
      );
    } else {
      return (
        <div className="text-center py-5 empty-data">
          <FaFileExcel size={60} className="text-muted mb-3" />
          <h4 className="text-muted">ยังไม่มีข้อมูล</h4>
          <p className="text-muted">กรุณาอัพโหลดไฟล์ข้อมูลในแท็บ "นำเข้าข้อมูลไฟล์ xlsx"</p>
        </div>
      );
    }
  };

  const handleChange = (event) => {
    setSelectedOption(event.target.value);
  };

  // สร้าง ref สำหรับ input file
  const importFileInputRef = React.useRef(null);

  // ฟังก์ชันสำหรับการ Import File
  const handleImportFile = () => {
    // เรียกใช้ click event ของ input file
    if (importFileInputRef.current) {
      importFileInputRef.current.click();
    }
  };

  // ฟังก์ชัน handle การเลือกไฟล์จาก input
  const handleImportFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name || "");
      setProgress(0);

      // แสดง popup แจ้งการเลือกไฟล์สำเร็จ
      Swal.fire({
        title: "เลือกไฟล์สำเร็จ",
        text: `คุณได้เลือกไฟล์ ${selectedFile.name}`,
        icon: "success",
        confirmButtonText: "อัพโหลดตอนนี้",
        showCancelButton: true,
        cancelButtonText: "ภายหลัง",
        confirmButtonColor: "#28a745",
      }).then((result) => {
        if (result.isConfirmed) {
          handleUpload();
        }
      });

      // รีเซ็ต input file เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
      event.target.value = "";
    }
  };

  const renderUploadTab = () => (
    <>
      <div
        {...getRootProps()}
        className={`dropzone text-center p-5 ${isDragActive ? 'active-dropzone' : ''} ${fileName ? 'has-file' : ''}`}
        style={{
          cursor: "pointer",
          backgroundColor: isDragActive ? "#e8f4ff" : "#f8f9fa",
          border: isDragActive ? "2px dashed #007bff" : "2px dashed #6c757d",
          borderRadius: "0.75rem",
          transition: "all 0.3s ease",
          paddingTop: "3rem",
          paddingBottom: "3rem",
        }}
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <div>
            <FaFileUpload size={50} className="text-primary mb-3" />
            <h4>ปล่อยไฟล์เพื่ออัพโหลด</h4>
          </div>
        ) : fileName ? (
          <div>
            <FaFileExcel size={50} className="text-success mb-3" />
            <h4>ไฟล์ที่เลือก</h4>
            <p className="mt-2 file-name">
              <Badge bg="light" text="dark" className="p-2 custom-badge">
                {fileName}
              </Badge>
            </p>
          </div>
        ) : (
          <div>
            <FaFileUpload size={50} className="text-secondary mb-3" />
            <h4>อัพโหลดไฟล์ Excel</h4>
            <p className="mt-2">ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
            <Badge bg="secondary" className="mt-2 p-2 custom-badge">
              เฉพาะไฟล์ .xlsx เท่านั้น
            </Badge>
          </div>
        )}
      </div>

      {progress > 0 && (
        <Row className="mt-4">
          <Col>
            <label htmlFor="upload-progress" className="form-label">กำลังอัพโหลด: {progress}%</label>
            <ProgressBar
              id="upload-progress"
              now={progress}
              label={`${progress}%`}
              variant="success"
              animated
              style={{ height: "25px" }}
            />
          </Col>
        </Row>
      )}

      {/* Hidden input for file import */}
      <input
        type="file"
        ref={importFileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx"
        onChange={handleImportFileChange}
      />

      <Row className="mt-4 justify-content-center">
        <Col xs={12} md={8} className="d-flex justify-content-center gap-3 flex-wrap">
          <Button
            type="button"
            className="upload-btn upload-btn-success py-2 px-4"
            onClick={UploadPopUp}
            disabled={isLoading || !file}
          >
            <FaFileUpload className="me-2" />
            อัพโหลดไฟล์
          </Button>
          <Button
            variant="danger"
            className="upload-btn upload-btn-danger py-2 px-4"
            onClick={DeletePopUp}
            disabled={isLoading}
          >
            <FaTrashAlt className="me-2" />
            ลบไฟล์
          </Button>
          <Button
            variant="primary"
            className="upload-btn py-2 px-4"
            onClick={handleImportFile}
            disabled={isLoading}
          >
            <FaFileExcel className="me-2" />
            Import File
          </Button>
        </Col>
      </Row>
    </>
  );

  const renderViewTab = () => (
    <>
      <Row className="mt-4 justify-content-center">
        <Col xs={12} md={6}>
          <div className="d-flex view-controls">
            <Form.Group controlId="dropdown" className="w-100">
              <div className="input-group">
                <span className="input-group-text bg-primary text-white custom-input-group-text">
                  {selectedOption === "examTable" ? <FaTable className="me-2" /> : <FaDoorOpen className="me-2" />}
                </span>
                <Form.Select
                  value={selectedOption}
                  onChange={handleChange}
                  className="form-select form-select-lg custom-select"
                >
                  <option value="examTable">ตารางสอบ</option>
                  <option value="roomExam">ห้องสอบ</option>
                </Form.Select>
              </div>
            </Form.Group>
          </div>
        </Col>
      </Row>
      <Row className="mt-4">{SelectTable()}</Row>
    </>
  );

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container fluid style={{ minHeight: "100vh" }}>
          <Container className="py-4" fluid >
            <Card className="upload-card shadow-lg border-0 rounded-lg overflow-hidden">
              <Card.Header className="bg-primary text-white p-4">
                <h2 className="text-center m-0">
                  <FaFileExcel className="me-2" />
                  ระบบนำเข้าข้อมูลไฟล์ xlsx โดยผู้ดูแลห้องอำนวยการสอบ
                </h2>
              </Card.Header>
              <Card.Body className="p-4">
                <Nav variant="pills" className="mb-4 nav-fill">
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "upload"}
                      onClick={() => setActiveTab("upload")}
                      className={activeTab === "upload" ? "bg-primary" : ""}
                    >
                      <FaFileUpload className="me-2" />
                      นำเข้าข้อมูลไฟล์ xlsx
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "view"}
                      onClick={() => setActiveTab("view")}
                      className={activeTab === "view" ? "bg-primary" : ""}
                    >
                      <FaTable className="me-2" />
                      ดูข้อมูลที่ถูกนำเข้าโดยผู้ดูแลห้องอำนวยการสอบ
                    </Nav.Link>
                  </Nav.Item>

                  {/* >>> ADD: แท็บแก้ไขข้อมูล */}
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "edit"}
                      onClick={() => setActiveTab("edit")}
                      className={activeTab === "edit" ? "bg-primary" : ""}
                    >
                      <FaEdit className="me-2" />
                      แก้ไขข้อมูล
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                <Form>
                  {activeTab === "upload" && renderUploadTab()}
                  {activeTab === "view" && renderViewTab()}
                  {activeTab === "edit" && (
                    <div className="mt-3">
                      {/* >>> ADD: ใช้หน้าแก้ไขข้อมูลแบบใหม่ */}
                      <EditImportedData />
                    </div>
                  )}
                </Form>
              </Card.Body>

              <Card.Footer className="bg-light p-3 text-center">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <small className="text-muted">
                    ระบบจัดการข้อมูลการสอบ © {new Date().getFullYear()}
                  </small>
                  {/* >>> ADD: แสดงเวลาที่ดึงข้อมูลล่าสุด*/}
                  <small className="text-muted">
                    อัปเดตล่าสุด: {lastUpdated.toLocaleString()}
                  </small>
                </div>
              </Card.Footer>
            </Card>
          </Container>
        </Container>
      </div>
    </>
  );
}
