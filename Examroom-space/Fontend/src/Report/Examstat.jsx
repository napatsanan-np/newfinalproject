import React, { useState, useEffect } from "react";
import { Container, Card, Alert, Table, Badge } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Select from "react-select";
import SidebarMenu from '../Navbar/SidebarMenu';
import "./Examstat-styles.css";


const Examstat = () => {
  const [academicYear, setAcademicYear] = useState(null);
  const [semester, setSemester] = useState(null);
  const [data, setData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const OTHER_DEPT_CODE = "999";
  const [dep, setDep] = useState([]);
  
  // สร้างข้อมูลสำหรับเรียงลำดับภาควิชา
   const [DEPARTMENT_ORDER, setDEPARTMENT_ORDER] = useState({});


  // สร้างกลุ่มรหัสของแต่ละภาควิชา
  const DEPARTMENT_GROUPS = {};
  const DEPARTMENTS = Object.fromEntries(dep.map(({ id_dept_code, id_dept }) => [id_dept_code , DEPARTMENT_ORDER[id_dept]]));

  Object.entries(DEPARTMENTS).forEach(([code, name]) => {
    if (!DEPARTMENT_GROUPS[name]) {
      DEPARTMENT_GROUPS[name] = [];
    }
    DEPARTMENT_GROUPS[name].push(code);
  });

  
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await fetch(
          localStorage.getItem("API") + "/select_data/exam_config",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );
        const response1 = await fetch(
          localStorage.getItem("API") + "/select_data/departments_group",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );
        const response2 = await fetch(
          localStorage.getItem("API") + "/select_data/departments", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        const data1 = await response1.json();
        const data2 = await response2.json();
        const map = {};
        data2.forEach(dep => {
          map[dep.id_dept] = dep.name_th;
          //console.log("user.id_dept" , dep.name_th)
         
        });
         setDEPARTMENT_ORDER(map)
        setDep(data1);
        const years = [...new Set(data.map((c) => c.academic_year))].map(
          (year) => ({
            value: year,
            label: `ปีการศึกษา ${year}`,
          })
        );
        const terms = [...new Set(data.map((c) => c.semester))].map((term) => ({
          value: term,
          label: term,
        }));

        setAcademicYears(years);
        setSemesters(terms);
      } catch (err) {
        console.error("Error fetching configs:", err);
        setError("ไม่สามารถดึงข้อมูลการตั้งค่าได้");
      }
    };

    fetchConfigs();
  }, []);

  // แปลงข้อมูลเพื่อรวมภาควิชาที่มีชื่อเดียวกัน
  const processSubmissionData = (data) => {
    if (!data?.submissions) return null;

    const departmentData = new Map();

    // รวมข้อมูลตามชื่อภาควิชา
    data.submissions.forEach((dept) => {
      const deptName = DEPARTMENTS[dept.department_code] || "อื่นๆ";

      if (departmentData.has(deptName)) {
        // ถ้าภาควิชานี้มีอยู่แล้ว ให้รวมข้อมูล
        const existing = departmentData.get(deptName);
        existing.submitted += Math.round(dept.submitted);
        existing.pending += Math.round(dept.pending);
        existing.total_exams += Math.round(dept.total_exams);
        existing.deptCodes.push(dept.department_code);
        existing.courses = [...existing.courses, ...dept.courses];
      } else {
        // ถ้าเป็นภาควิชาใหม่
        departmentData.set(deptName, {
          name: deptName,
          submitted: Math.round(dept.submitted),
          pending: Math.round(dept.pending),
          total_exams: Math.round(dept.total_exams),
          deptCodes: [dept.department_code],
          courses: dept.courses,
          order: DEPARTMENT_ORDER[deptName] || 999,
        });
      }
    });

    // แปลงข้อมูลให้เป็น array และเรียงลำดับตาม order
    const processedSubmissions = Array.from(departmentData.values()).sort(
      (a, b) => a.order - b.order
    );

    return {
      ...data,
      processedSubmissions,
    };
  };

  const fetchSubmissionData = async () => {
    if (!academicYear?.value || !semester?.value) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        localStorage.getItem("API") +
          `/reports/exam-submissions/${academicYear.value}/${semester.value}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error(
            `ไม่พบข้อมูลการสอบสำหรับปีการศึกษา ${academicYear.value} ภาคการศึกษา ${semester.value} กรุณาตรวจสอบว่ามีการตั้งค่าการสอบในช่วงเวลานี้หรือไม่`
          );
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const jsonData = await response.json();

      // แปลงข้อมูลเป็นจำนวนเต็ม (ไม่มีทศนิยม)
      if (jsonData.submissions) {
        jsonData.submissions = jsonData.submissions.map((dept) => ({
          ...dept,
          submitted: Math.round(dept.submitted),
          pending: Math.round(dept.pending),
          total_exams: Math.round(dept.total_exams),
          courses: dept.courses.map((course) => ({
            ...course,
          })),
        }));
      }

      setData(jsonData);
      const processed = processSubmissionData(jsonData);
      setProcessedData(processed);
      setSelectedDepartment(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (academicYear?.value && semester?.value) {
      fetchSubmissionData();
    }
  }, [academicYear, semester]);

  const getChartData = () => {
    if (!processedData?.processedSubmissions) return [];

    // แปลงข้อมูลสำหรับแสดงในกราฟ
    return processedData.processedSubmissions.map((dept) => ({
      name: dept.name,
      ส่งแล้ว: dept.submitted,
      ยังไม่ส่ง: dept.pending,
      รวม: dept.total_exams,
      deptCodes: dept.deptCodes.join(", "),
    }));
  };

  const DepartmentDetails = ({ department }) => {
    if (!department) return null;

    const sortedCourses = [...department.courses].sort((a, b) => {
      if (a.submit_status === b.submit_status) return 0;
      return a.submit_status === "ส่งแล้ว" ? -1 : 1;
    });

    return (
      <Card className="department-card shadow-sm">
        <Card.Header>
          <h3 className="mb-0">{department.name}</h3>
          <p className="text-white-50 mb-0">
            รหัสภาควิชา: {department.deptCodes.join(", ")}
          </p>
          <p className="text-white-50 mb-0">
            จำนวนวิชาทั้งหมด: {department.total_exams} วิชา | ส่งแล้ว:{" "}
            {department.submitted} วิชา | ยังไม่ส่ง: {department.pending} วิชา
          </p>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover className="custom-table">
              <thead>
                <tr>
                  <th>รหัสวิชา</th>
                  <th>อาจารย์</th>
                  <th>สถานะ</th>
                  <th>วันที่ส่ง</th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.map((course, idx) => (
                  <tr key={idx}>
                    <td className="fw-bold">{course.course_code}</td>
                    <td>{course.lecturer}</td>
                    <td>
                      <Badge
                        bg={
                          course.submit_status === "ส่งแล้ว"
                            ? "success"
                            : "warning"
                        }
                        className="badge-pill"
                      >
                        {course.submit_status}
                      </Badge>
                    </td>
                    <td>{course.submission_date || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const getTotalStats = () => {
    if (!processedData?.processedSubmissions)
      return { total: 0, submitted: 0, pending: 0 };

    return processedData.processedSubmissions.reduce(
      (acc, dept) => ({
        total: acc.total + dept.total_exams,
        submitted: acc.submitted + dept.submitted,
        pending: acc.pending + dept.pending,
      }),
      { total: 0, submitted: 0, pending: 0 }
    );
  };

  const getCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="examstat-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-subtitle">
            รหัสภาควิชา: {payload[0]?.payload?.deptCodes}
          </p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="tooltip-item"
              style={{ color: entry.color }}
            >
              <span>{entry.name}:</span>{" "}
              <span className="fw-bold">{entry.value} วิชา</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getSortedDepartmentOptions = () => {
    if (!processedData?.processedSubmissions) return [];

    // สร้าง options สำหรับ dropdown และเรียงลำดับตามชื่อภาควิชา
    return processedData.processedSubmissions
      .map((dept) => ({
        value: dept.name,
        label: `${dept.name} (${dept.deptCodes.join(", ")}) - ${
          dept.total_exams
        } วิชา`,
        order: dept.order,
      }))
      .sort((a, b) => a.order - b.order);
  };

  return (
    <>
      <SidebarMenu />
      <div className="container-wide py-4 examstat-container">
        <Container>
          <h2 className="mb-4 text-primary">รายงานสถิติการส่งข้อสอบ</h2>

          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">เลือกภาคการศึกษา</h5>
            </Card.Header>
            <Card.Body>
              <div className="row g-3">
                <div className="col-md-5">
                  <label className="form-label">ปีการศึกษา</label>
                  <Select
                    options={academicYears}
                    value={academicYear}
                    onChange={setAcademicYear}
                    placeholder="เลือกปีการศึกษา"
                    isDisabled={loading}
                    className="examstat-select"
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label">ภาคการศึกษา</label>
                  <Select
                    options={semesters}
                    value={semester}
                    onChange={setSemester}
                    placeholder="เลือกภาคการศึกษา"
                    isDisabled={loading}
                    className="examstat-select"
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-primary w-100"
                    onClick={fetchSubmissionData}
                    disabled={!academicYear || !semester || loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        กำลังโหลด...
                      </>
                    ) : (
                      "แสดงข้อมูล"
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="danger" className="mt-3">
                  <i className="bi bi-exclamation-triangle me-2"></i> {error}
                </Alert>
              )}
            </Card.Body>
          </Card>

          {loading && !error && (
            <div className="text-center my-5">
              <div
                className="spinner-border text-primary"
                role="status"
                style={{ width: "3rem", height: "3rem" }}
              >
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
              <p className="mt-3">กำลังโหลดข้อมูลการส่งข้อสอบ...</p>
            </div>
          )}

          {processedData?.processedSubmissions && (
            <div className="fade-in">
              <div className="row g-4 mb-4 summary-stats">
                {(() => {
                  const stats = getTotalStats();
                  return (
                    <>
                      <div className="col-md-4">
                        <div
                          className="stats-card shadow-sm"
                          style={{ backgroundColor: "#ffffff" }}
                        >
                          <h6 className="text-muted mb-2">จำนวนวิชาทั้งหมด</h6>
                          <h2 className="display-5 fw-bold text-primary">
                            {stats.total}
                          </h2>
                          <p className="mb-0">วิชา</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="stats-card success-card shadow-sm">
                          <h6 className="text-muted mb-2">ส่งแล้ว</h6>
                          <h2 className="display-5 fw-bold text-success">
                            {stats.submitted}
                          </h2>
                          <p className="mb-0">
                            วิชา (
                            {stats.total > 0
                              ? Math.round(
                                  (stats.submitted / stats.total) * 100
                                )
                              : 0}
                            %)
                          </p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="stats-card warning-card shadow-sm">
                          <h6 className="text-muted mb-2">ยังไม่ส่ง</h6>
                          <h2 className="display-5 fw-bold text-warning">
                            {stats.pending}
                          </h2>
                          <p className="mb-0">
                            วิชา (
                            {stats.total > 0
                              ? Math.round((stats.pending / stats.total) * 100)
                              : 0}
                            %)
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">สถานะการส่งข้อสอบแยกตามภาควิชา</h5>
                  <span className="text-muted small">
                    {academicYear?.label} {semester?.label}
                  </span>
                </Card.Header>
                <Card.Body>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getChartData()}
                        layout="vertical"
                        margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => Math.round(value)} // แสดงจำนวนเต็ม
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={180}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={getCustomTooltip} />
                        <Legend wrapperStyle={{ paddingTop: "10px" }} />
                        <Bar
                          dataKey="ส่งแล้ว"
                          stackId="a"
                          fill="#2ecc71"
                          name="ส่งแล้ว"
                          radius={[4, 0, 0, 4]}
                        />
                        <Bar
                          dataKey="ยังไม่ส่ง"
                          stackId="a"
                          fill="#e74c3c"
                          name="ยังไม่ส่ง"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>

              <div className="department-selector shadow-sm mb-4">
                <div className="row align-items-center">
                  <div className="col-md-3">
                    <label className="form-label mb-md-0">
                      เลือกภาควิชาเพื่อดูรายละเอียด:
                    </label>
                  </div>
                  <div className="col-md-9">
                    <Select
                      options={getSortedDepartmentOptions()}
                      value={
                        selectedDepartment
                          ? {
                              value: selectedDepartment,
                              label: `${selectedDepartment} - ${
                                processedData.processedSubmissions.find(
                                  (d) => d.name === selectedDepartment
                                )?.total_exams
                              } วิชา`,
                            }
                          : null
                      }
                      onChange={(option) =>
                        setSelectedDepartment(option?.value || null)
                      }
                      isClearable
                      placeholder="เลือกภาควิชา..."
                      className="examstat-select"
                    />
                  </div>
                </div>
              </div>

              {selectedDepartment && (
                <DepartmentDetails
                  department={processedData.processedSubmissions.find(
                    (d) => d.name === selectedDepartment
                  )}
                />
              )}
            </div>
          )}
        </Container>
      </div>
    </>
  );
};

export default Examstat;
