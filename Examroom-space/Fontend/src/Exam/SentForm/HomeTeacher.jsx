import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Card,
  Tabs,
  Tab,
  Alert
} from "react-bootstrap";
import { Link } from "react-router-dom";
import Select from "react-select";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
const HomeTeacher = () => {
  const url = localStorage.getItem("API");
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || '{"full_name":""}');
  console.log(token)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // สำหรับข้อมูลการคุมสอบ
  const [roomData, setRoomData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState(null);

  // Fetcher function for SWR
  const fetcher = async (url) => {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  };

  // Fetch the exam table data
  const { data: examTableData = [], error: examTableError } = useSWR(
    token? `${url}/teacher/GetExamtable` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  // Fetch the exam details data
  const { data: examDetailData = [], error: examDetailError } = useSWR(
    token ? `${url}/teacher/fetch/detail_exam` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  // ฟังก์ชั่นดึงข้อมูลการคุมสอบ
  useEffect(() => {
    async function readDataExamRoom() {
      if (!token) {
        setError("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบ");
        return;
      }

      try {
        const response = await fetch(url + "/proctor/GetExamtableProctor", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const dataDetail = await response.json();
        
        if (Array.isArray(dataDetail) && dataDetail.length > 0) {
          setRoomData(dataDetail);
          const groupedData = groupDataByCourse(dataDetail);
          setSearchResults(groupedData);
          setError(null);
        } else {
          setRoomData([]);
          setSearchResults([]);
          setError("ไม่พบข้อมูลห้องสอบสำหรับท่าน");
        }
      } catch (error) {
        console.error("Error fetching RoomExam data:", error);
        setRoomData([]);
        setSearchResults([]);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง");
      }
    }
    readDataExamRoom();
  }, [token, url ]);

  // Combine data from both API endpoints
  const combinedData = Array.isArray(examTableData) 
    ? examTableData.map(examTable => {
        const matchingDetail = Array.isArray(examDetailData) 
          ? examDetailData.find(detail => detail && examTable && detail.Ref === examTable.Ref)
          : null;
        
        return {
          Ref: examTable?.Ref || "",
          Course: examTable?.Course || "",
          Lecturer: examTable?.Lecturer || "",
          Edate: examTable?.Edate || "",
          Etime: examTable?.Etime || "",
          Hr: examTable?.Hr || "",
          No_st: examTable?.No_st || 0,
          submit: matchingDetail?.submit || "ยังไม่ส่ง"
        };
      })
    : [];

  // Filter the data based on search term and status filter
  const filteredData = combinedData.filter(exam => {
    const matchesSearch = 
      (exam.Course && exam.Course.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exam.Lecturer && exam.Lecturer.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Apply status filter
    const matchesStatus = 
      filterStatus === "all" || 
      (exam.submit && exam.submit === filterStatus);
    
    return matchesSearch && matchesStatus;
  });

  // ฟังก์ชันสำหรับจัดกลุ่มข้อมูลการคุมสอบ
  const groupDataByCourse = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const grouped = data.reduce((acc, curr) => {
      if (!curr) return acc;
      
      const existing = acc.find(item => 
        item.Course === curr.Course && 
        item.Edate === curr.Edate &&
        item.Room_name === curr.Room_name
      );
      
      if (existing) {
        // ถ้ามีวิชานี้อยู่แล้ว ให้เพิ่มชื่อที่ไม่ซ้ำ
        const existingNames = existing.fullnames ? existing.fullnames.split(', ') : [];
        const newNames = curr.fullnames ? curr.fullnames.split(', ') : [];
        const allNames = [...new Set([...existingNames, ...newNames])];
        existing.fullnames = allNames.join(', ');
      } else {
        // ถ้ายังไม่มีวิชานี้ ให้เพิ่มข้อมูลใหม่
        acc.push({...curr});
      }
      return acc;
    }, []);
    
    // เรียงลำดับตาม No
    return grouped.sort((a, b) => {
      if (!a.No || !b.No) return 0;
      return a.No - b.No;
    });
  };

  // ฟังก์ชันค้นหาตามวันที่
  const handleSearch = () => {
    if (selectedDate) {
      const filtered = roomData.filter((item) => item && item.Edate === selectedDate.value);
      const groupedData = groupDataByCourse(filtered);
      setSearchResults(groupedData);
    }
  };

  // ฟังก์ชันรีเซ็ทการค้นหา
  const handleReset = () => {
    setSelectedDate(null);
    const groupedData = groupDataByCourse(roomData);
    setSearchResults(groupedData);
  };

  // ฟังก์ชันดึงวันที่ไม่ซ้ำกัน
  const getUniqueDates = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const uniqueDates = [...new Set(data.filter(item => item && item.Edate).map(item => item.Edate))];
    return uniqueDates.map((date) => ({
      label: date || "ไม่ระบุ",
      value: date,
    }));
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container>
          <Tabs defaultActiveKey="examList" className="mb-4 bg-white rounded-top">
            <Tab eventKey="examList" title="รายการข้อสอบ">
              <Card className="shadow border-0">
                <Card.Body>
                  <Row className="mb-4">
                    <Col>
                      <h2 className="text-center">รายการข้อสอบของ:::{user.full_name}</h2>
                    </Col>
                  </Row>

                  {examTableError ? (
                    <Alert variant="danger">
                      เกิดข้อผิดพลาดในการโหลดข้อมูล: {examTableError.message || "กรุณาลองใหม่อีกครั้ง"}
                    </Alert>
                  ) : !Array.isArray(examTableData) || examTableData.length === 0 ? (
                    <Alert variant="info">
                      ไม่พบข้อมูลข้อสอบสำหรับอาจารย์ท่านนี้
                    </Alert>
                  ) : (
                    <>
                      <Row className="mb-3">
                        <Col md={6}>
                          <InputGroup>
                            <Form.Control
                              placeholder="ค้นหาตามชื่อวิชาหรืออาจารย์"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Button variant="outline-secondary" onClick={() => setSearchTerm("")}>
                              ล้าง
                            </Button>
                          </InputGroup>
                        </Col>
                        <Col md={4}>
                          <Form.Select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                          >
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="ส่งแล้ว">ส่งแล้ว</option>
                            <option value="รอการยืนยัน">รอการยืนยัน</option>
                            <option value="ยังไม่ส่ง">ยังไม่ส่ง</option>
                          </Form.Select>
                        </Col>
                      </Row>

                      <div className="exam-search">
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>ลำดับ</th>
                              <th>ชื่อวิชา</th>
                              <th>อาจารย์ผู้ออกข้อสอบ</th>
                              <th>วันสอบ</th>
                              <th style={{width: "130px"}}>เวลาสอบ</th>
                              <th>จำนวนชั่วโมง</th>
                              <th>จำนวนนักศึกษา</th>
                      
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.length > 0 ? (
                              filteredData.map((exam, index) => (
                                <tr key={`exam-${index}`}>
                                  <td>{index + 1}</td>
                                  <td>{exam.Course}</td>
                                  <td>{exam.Lecturer}</td>
                                  <td>{exam.Edate}</td>
                                  <td>{exam.Etime}</td>
                                  <td>{exam.Hr}</td>
                                  <td>{exam.No_st}</td>
                              
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="9" className="text-center">
                                  ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="proctorList" title="ตารางคุมสอบ">
              <Card className="shadow border-0">
                <Card.Body>
                  <Row className="mb-4">
                    <Col>
                      <h3 className="text-center">ตรวจสอบวันที่คุมสอบ :: {user.full_name}</h3>
                    </Col>
                  </Row>

                  {error ? (
                    <Alert variant="info">
                      {error}
                    </Alert>
                  ) : !Array.isArray(searchResults) || searchResults.length === 0 ? (
                    <Alert variant="info">
                      ไม่พบข้อมูลตารางคุมสอบ
                    </Alert>
                  ) : (
                    <>
                      <Row className="mb-3">
                        <Col md={6}>
                          <Select
                            options={getUniqueDates(roomData)}
                            onChange={setSelectedDate}
                            value={selectedDate}
                            noOptionsMessage={() => "ไม่พบข้อมูลวันที่"}
                            isClearable
                            placeholder="เลือกวันที่ต้องการตรวจสอบ"
                          />
                        </Col>
                        <Col md={6}>
                          <div className="d-flex">
                            <Button onClick={handleSearch} disabled={!selectedDate} className="me-2">
                              ค้นหา
                            </Button>
                            <Button onClick={handleReset} variant="secondary">
                              รีเซ็ท
                            </Button>
                          </div>
                        </Col>
                      </Row>

                      {searchResults.length > 0 ? (
                        <div className="table-container">
                          <Table striped bordered hover>
                            <thead>
                              <tr>
                                <th>ลำดับ</th>
                                <th>ชื่อวิชา</th>
                                <th>ห้องสอบ</th>
                                <th>วันสอบ</th>
                                <th>จำนวนชั่วโมง</th>
                                <th>จำนวนนักศึกษา</th>
                                <th>กรรมการคุมสอบ</th>
                                <th>สถานะการส่งข้อสอบ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {searchResults.map((item, index) => (
                                <tr key={`proctor-${index}`}>
                                  <td>{item.No || index + 1}</td>
                                  <td>{item.Course || ""}</td>
                                  <td>{item.Room_name || ""}</td>
                                  <td>{item.Edate || ""}</td>
                                  <td>{item.Hr || ""}</td>
                                  <td>{item.Num_st || 0}</td>
                                  <td>{item.fullnames || ""}</td>
                                  <td>
                                    {item.Submit === "ส่งแล้ว"
                                      ? "ส่งแล้ว"
                                      : item.Submit === "รอการยืนยัน"
                                      ? "รอการยืนยัน"
                                      : "ยังไม่ส่ง"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <Alert variant="info" className="mt-3">
                          ไม่พบผลลัพธ์สำหรับเกณฑ์ที่เลือก
                        </Alert>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Container>
      </div>
    </>
  );
};

export default HomeTeacher;