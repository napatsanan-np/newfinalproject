import React, { useState, useEffect } from 'react';
import { Container, Card, Alert, Table, Row, Col } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Select from 'react-select';
import SidebarMenu from '../Navbar/SidebarMenu';
import './Proctor-report-styles.css';

const ProctorReport = () => {
  const [academicYear, setAcademicYear] = useState(null);
  const [semester, setSemester] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProctor, setSelectedProctor] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filterDate, setFilterDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

  // เพิ่ม roomMapping สำหรับแสดงชื่อห้องแทนรหัส
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

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await fetch(localStorage.getItem("API") + '/select_data/exam_config', {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        
        const years = [...new Set(data.map(c => c.academic_year))].map(year => ({
          value: year,
          label: `ปีการศึกษา ${year}`
        }));
        const terms = [...new Set(data.map(c => c.semester))].map(term => ({
          value: term,
          label: term
        }));
        
        setAcademicYears(years);
        setSemesters(terms);
      } catch (err) {
        setError('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
      }
    };
    
    fetchConfigs();
  }, []);

  const fetchReport = async () => {
    if (!academicYear?.value || !semester?.value) return;

    setLoading(true);
    setError(null);

    try {
      const url = selectedProctor 
        ? `${localStorage.getItem("API")}/reports/proctor-stats/${academicYear.value}/${semester.value}/${selectedProctor.value}`
        : `${localStorage.getItem("API")}/reports/proctor-stats/${academicYear.value}/${semester.value}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error(`ไม่พบข้อมูลการคุมสอบสำหรับปีการศึกษา ${academicYear.value} ภาคการศึกษา ${semester.value} กรุณาตรวจสอบว่ามีการตั้งค่าการสอบในช่วงเวลานี้หรือไม่`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (academicYear?.value && semester?.value) {
      fetchReport();
    }
  }, [academicYear, semester, selectedProctor]);

  const calculateSummary = () => {
    if (!reportData?.proctors) return null;

    const summary = {
      totalProctors: reportData.proctors.length,
      totalAssignments: reportData.proctors.reduce((sum, p) => sum + p.total_assignments, 0),
      averageAssignments: (reportData.proctors.reduce((sum, p) => sum + p.total_assignments, 0) / reportData.proctors.length).toFixed(2)
    };

    return summary;
  };

  const getChartData = () => {
    if (!reportData?.proctors) return [];

    const dates = [...new Set(reportData.proctors.flatMap(p => 
      p.assignments.map(a => a.date)
    ))].sort();

    return dates.map(date => {
      const assignmentsOnDate = reportData.proctors.flatMap(p => 
        p.assignments.filter(a => a.date === date)
      );

      return {
        date,
        'จำนวนการคุมสอบ': assignmentsOnDate.length
      };
    });
  };

  const getDates = () => {
    if (!reportData?.proctors) return [];
    
    return [...new Set(reportData.proctors.flatMap(p => 
      p.assignments.map(a => a.date)
    ))].sort();
  };

  const sortAssignments = (assignments, proctor) => {
    return [...assignments].sort((a, b) => {
      let comparison = 0;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      switch (sortConfig.key) {
        case 'proctor':
          comparison = proctor.full_name.localeCompare(proctor.full_name); // จะถูกเรียงในระดับ outer loop
          break;
        case 'department':
          comparison = proctor.department.localeCompare(proctor.department); // จะถูกเรียงในระดับ outer loop
          break;
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'room':
          comparison = a.room.localeCompare(b.room);
          break;
        case 'course':
          comparison = a.course_code.localeCompare(b.course_code);
          break;
        default:
          comparison = 0;
      }
      
      return comparison * direction;
    });
  };

  const filterAndSortAssignments = (assignments, proctor) => {
    let filtered = assignments;
    
    if (filterDate) {
      filtered = filtered.filter(a => a.date === filterDate.value);
    }
    
    return sortAssignments(filtered, proctor);
  };

  // เพิ่มฟังก์ชันสำหรับเรียงลำดับ proctors
  const getSortedProctors = () => {
    if (!reportData?.proctors) return [];
    
    return [...reportData.proctors].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'proctor':
          return a.full_name.localeCompare(b.full_name) * direction;
        case 'department':
          return a.department.localeCompare(b.department) * direction;
        default:
          return 0;
      }
    });
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const SortableHeader = ({ id, label }) => (
    <th 
      onClick={() => handleSort(id)} 
      style={{ cursor: 'pointer', userSelect: 'none' }}
      className="sort-header"
    >
      {label}{renderSortIndicator(id)}
    </th>
  );

  return (
    <>
      <SidebarMenu />
      <div className="container-wide">
        <Container>
          <Card className="shadow">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Select
                    options={academicYears}
                    value={academicYear}
                    onChange={(selected) => {
                      setAcademicYear(selected);
                      setSelectedProctor(null);
                      setFilterDate(null);
                    }}
                    placeholder="เลือกปีการศึกษา"
                    isDisabled={loading}
                    className="basic-select"
                  />
                </Col>
                <Col md={6}>
                  <Select
                    options={semesters}
                    value={semester}
                    onChange={(selected) => {
                      setSemester(selected);
                      setSelectedProctor(null);
                      setFilterDate(null);
                    }}
                    placeholder="เลือกภาคการศึกษา"
                    isDisabled={loading}
                    className="basic-select"
                  />
                </Col>
              </Row>

              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}

              {loading && (
                <div className="text-center mt-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">กำลังโหลด...</span>
                  </div>
                </div>
              )}

              {reportData?.proctors && (
                <>
                  <div className="mt-4">
                    <Row className="g-3">
                      <Col md={4}>
                        <div className="stats-card">
                          <h6 className="text-muted">จำนวนกรรมการคุมสอบ</h6>
                          <h3>{calculateSummary()?.totalProctors || 0}</h3>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="stats-card">
                          <h6 className="text-muted">จำนวนการคุมสอบทั้งหมด</h6>
                          <h3>{calculateSummary()?.totalAssignments || 0}</h3>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="stats-card">
                          <h6 className="text-muted">ค่าเฉลี่ยการคุมสอบ</h6>
                          <h3>{calculateSummary()?.averageAssignments || 0}</h3>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <Card className="mt-4">
                    <Card.Header>
                      <h5 className="mb-0">สถิติการคุมสอบรายวัน</h5>
                    </Card.Header>
                    <Card.Body>
                      <div style={{ height: '400px' }}>
                        <ResponsiveContainer>
                          <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="จำนวนการคุมสอบ" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card.Body>
                  </Card>

                  <Card className="mt-4">
                    <Card.Header>
                      <h5 className="mb-0">รายละเอียดการคุมสอบ</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-3 mb-4">
                        <Col md={6}>
                          <Select
                            options={reportData.proctors.map(p => ({
                              value: p.user_id,
                              label: `${p.full_name} (${p.department})`
                            }))}
                            value={selectedProctor}
                            onChange={setSelectedProctor}
                            placeholder="เลือกกรรมการคุมสอบ"
                            isClearable
                            className="basic-select"
                          />
                        </Col>
                        <Col md={6}>
                          <Select
                            options={getDates().map(date => ({
                              value: date,
                              label: date
                            }))}
                            value={filterDate}
                            onChange={setFilterDate}
                            placeholder="เลือกวันที่"
                            isClearable
                            className="basic-select"
                          />
                        </Col>
                      </Row>

                      <div className="table-responsive">
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <SortableHeader id="proctor" label="กรรมการคุมสอบ" />
                              <SortableHeader id="department" label="ภาควิชา" />
                              <SortableHeader id="date" label="วันที่" />
                              <SortableHeader id="room" label="ห้องสอบ" />
                              <SortableHeader id="course" label="รายวิชาที่คุมสอบ" />
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedProctors().map(proctor => (
                              (!selectedProctor || selectedProctor.value === proctor.user_id) &&
                              filterAndSortAssignments(proctor.assignments, proctor).map((assignment, idx) => (
                                <tr key={`${proctor.user_id}-${idx}`}>
                                  <td>{proctor.full_name}</td>
                                  <td>{proctor.department}</td>
                                  <td>{assignment.date}</td>
                                  <td>{roomMapping[assignment.room] || assignment.room}</td>
                                  <td>{assignment.course_code}</td>
                                </tr>
                              ))
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};

export default ProctorReport;