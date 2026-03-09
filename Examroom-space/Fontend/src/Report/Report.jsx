import React, { useState, useEffect } from "react";
import { Container, Card, Alert, Table } from "react-bootstrap";
import {
  PieChart,
  Pie,
  Cell,
  Label,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Select from "react-select";
import SidebarMenu from "../Navbar/SidebarMenu";
import "./Report-styles.css";

const Report = () => {
  const COLORS = [
    "#3498db",
    "#2ecc71",
    "#f1c40f",
    "#e74c3c",
    "#9b59b6",
    "#1abc9c",
    "#34495e",
    "#e67e22",
    "#95a5a6",
    "#27ae60",
    "#2980b9",
    "#8e44ad",
    "#f39c12",
    "#d35400",
    "#c0392b",
    "#16a085",
  ];

  const OTHER_DEPT_CODE = "999";

  const [DEPARTMENT_ORDER, setDEPARTMENT_ORDER] = useState({});
  const [dep, setDep] = useState([]);
  const DEPARTMENTS = Object.fromEntries(
    dep.map(({ id_dept_code, id_dept }) => [
      id_dept_code.toString(),
      DEPARTMENT_ORDER[id_dept],
    ])
  );

  const DEPARTMENT_GROUPS = {};
  Object.entries(DEPARTMENTS).forEach(([code, name]) => {
    if (!DEPARTMENT_GROUPS[name]) {
      DEPARTMENT_GROUPS[name] = [];
    }
    DEPARTMENT_GROUPS[name].push(code);
  });

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    index,
    name,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.02) return null;

    return (
      <text
        x={x}
        y={y}
        fill={COLORS[index % COLORS.length]}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${name} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };

  const renderActiveShape = (props) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
    } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
      </g>
    );
  };

  const [academicYear, setAcademicYear] = useState(null);
  const [semester, setSemester] = useState(null);
  const [phase, setPhase] = useState(null);

  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [phases, setPhases] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);

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
          localStorage.getItem("API") + "/select_data/departments",
          {
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
        data2.forEach((d) => {
          map[d.id_dept] = d.name_th;
        });
        setDEPARTMENT_ORDER(map);
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

        const phaseList = [...new Set(data.map((c) => c.phase))]
          .filter((p) => p !== null && p !== undefined && String(p).trim() !== "")
          .map((p) => ({
            value: p,
            label: String(p),
          }));

        setAcademicYears(years);
        setSemesters(terms);
        setPhases(phaseList);
      } catch (err) {
        console.error("Error fetching configs:", err);
        setError("ไม่สามารถดึงข้อมูลการตั้งค่าได้");
      }
    };

    fetchConfigs();
  }, []);

  const formatData = (data) => {
    if (!data?.paper_usage) return { chartData: [], summary: null };

    const departmentData = new Map();
    let otherCourses = [];

    data.paper_usage.forEach((dept) => {
      if (DEPARTMENTS[dept.department_code]) {
        const deptName = DEPARTMENTS[dept.department_code];
        const existing = departmentData.get(deptName);

        if (existing) {
          existing.value += dept.total_pages;
          existing.deptCodes.push(dept.department_code);
          existing.courses = [...existing.courses, ...dept.courses];
        } else {
          departmentData.set(deptName, {
            name: deptName,
            value: dept.total_pages,
            deptCodes: [dept.department_code],
            courses: dept.courses,
            order: DEPARTMENT_ORDER[deptName] || 999,
          });
        }
      } else {
        otherCourses = [...otherCourses, ...dept.courses];
      }
    });

    if (otherCourses.length > 0) {
      const otherTotalPages = otherCourses.reduce(
        (sum, course) => sum + course.total_papers,
        0
      );
      departmentData.set("อื่นๆ", {
        name: "อื่นๆ",
        value: otherTotalPages,
        deptCodes: [OTHER_DEPT_CODE],
        courses: otherCourses,
        order: DEPARTMENT_ORDER["อื่นๆ"] || 999,
      });
    }

    const chartData = Array.from(departmentData.values()).sort(
      (a, b) => a.order - b.order
    );

    const summary = {
      totalPages: chartData.reduce((sum, dept) => sum + dept.value, 0),
      totalCourses: chartData.reduce((sum, dept) => sum + dept.courses.length, 0),
      departmentDetails: chartData,
    };

    return { chartData, summary };
  };

  const fetchReport = async () => {
    if (!academicYear?.value || !semester?.value || !phase?.value) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        localStorage.getItem("API") +
          `/reports/paper-usage/${academicYear.value}/${semester.value}/${phase.value}`,
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
            `ไม่พบข้อมูลการใช้กระดาษสำหรับปีการศึกษา ${academicYear.value} ภาคการศึกษา ${semester.value} (${phase.value}) กรุณาตรวจสอบว่ามีการตั้งค่าการสอบในช่วงเวลานี้หรือไม่`
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = formatData(data);
      setReportData(formattedData);
      setSelectedDepartment(null);
    } catch (err) {
      setError(err.message);
      setReportData(null);
      setSelectedDepartment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (academicYear?.value && semester?.value && phase?.value) {
      fetchReport();
    } else {
      setReportData(null);
      setSelectedDepartment(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, semester, phase]);

  const DepartmentDetails = ({ department }) => {
    if (!department) return null;

    const sortedCourses = [...department.courses].sort(
      (a, b) => b.total_papers - a.total_papers
    );

    return (
      <Card className="mt-4">
        <Card.Header>
          <h3 className="mb-0">{department.name}</h3>
          <p className="text-muted mb-0">
            จำนวนแผ่นรวม: {department.value.toLocaleString()} แผ่น | จำนวนวิชา:{" "}
            {sortedCourses.length} วิชา
          </p>
          <p className="text-muted mb-0">
            รหัสภาควิชา: {department.deptCodes.join(", ")}
          </p>
        </Card.Header>
        <Card.Body>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>รหัสวิชา</th>
                  <th className="text-end">จำนวนแผ่น</th>
                  <th className="text-end">จำนวนชุดข้อสอบ</th>
                  <th className="text-end">จำนวนกระดาษทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.map((course, idx) => (
                  <tr key={idx}>
                    <td>{course.course_code}</td>
                    <td className="text-end">{course.pages.toLocaleString()}</td>
                    <td className="text-end">
                      {course.students.toLocaleString()}
                    </td>
                    <td className="text-end">
                      {course.total_papers.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const getSortedDepartmentOptions = () => {
    if (!reportData?.chartData) return [];
    return reportData.chartData
      .map((dept) => ({
        value: dept.name,
        label: `${dept.name} - ${dept.value.toLocaleString()} แผ่น`,
        order: dept.order,
      }))
      .sort((a, b) => a.order - b.order);
  };

  return (
    <>
      <SidebarMenu />
      <div className="container-wide">
        <Container>
          <Card className="shadow">
            <Card.Body>
              <div className="row g-3">
                <div className="col-md-4">
                  <Select
                    options={academicYears}
                    value={academicYear}
                    onChange={(v) => {
                      setAcademicYear(v);
                      setSelectedDepartment(null);
                    }}
                    placeholder="เลือกปีการศึกษา"
                    isDisabled={loading}
                    className="basic-select h-100"
                  />
                </div>

                <div className="col-md-4">
                  <Select
                    options={semesters}
                    value={semester}
                    onChange={(v) => {
                      setSemester(v);
                      setSelectedDepartment(null);
                    }}
                    placeholder="เลือกภาคการศึกษา"
                    isDisabled={loading}
                    className="basic-select h-100"
                  />
                </div>

                <div className="col-md-4">
                  <Select
                    options={phases}
                    value={phase}
                    onChange={(v) => {
                      setPhase(v);
                      setSelectedDepartment(null);
                    }}
                    placeholder="เลือก Phase (ช่วงสอบ)"
                    isDisabled={loading}
                    className="basic-select h-100"
                  />
                </div>
              </div>

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

              {reportData?.chartData?.length > 0 && (
                <div className="mt-4">
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <div className="p-3 bg-light rounded h-100">
                        <h6 className="text-muted">จำนวนแผ่นรวมทั้งหมด</h6>
                        <h3>{reportData.summary.totalPages.toLocaleString()} แผ่น</h3>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 bg-light rounded h-100">
                        <h6 className="text-muted">จำนวนวิชาทั้งหมด</h6>
                        <h3>{reportData.summary.totalCourses} วิชา</h3>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 bg-light rounded h-100">
                        <h6 className="text-muted">จำนวนภาควิชา</h6>
                        <h3>{reportData.chartData.length} ภาควิชา</h3>
                      </div>
                    </div>
                  </div>

                  <div className="chart-container">
                    <div style={{ height: "600px", width: "100%" }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={reportData.chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={{
                              stroke: "#555",
                              strokeWidth: 1,
                              strokeDasharray: "3 3",
                            }}
                            label={renderCustomizedLabel}
                            outerRadius={180}
                            innerRadius={60}
                            paddingAngle={1}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            onClick={(d) => setSelectedDepartment(d.name)}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                          >
                            {reportData.chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                style={{ cursor: "pointer" }}
                                stroke="#fff"
                                strokeWidth={
                                  selectedDepartment === entry.name ? 2 : 0
                                }
                              />
                            ))}
                            <Label
                              position="center"
                              value="รายงานการใช้กระดาษแยกตามภาควิชา"
                              fontSize={14}
                              fontWeight="bold"
                            />
                          </Pie>

                          <Tooltip
                            formatter={(value) => `${value.toLocaleString()} แผ่น`}
                            labelFormatter={(name) => `${name}`}
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              padding: "10px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 p-3 bg-light rounded">
                      <p className="text-muted mb-2">
                        <i className="fas fa-info-circle me-2"></i>
                        คุณสามารถคลิกที่ส่วนต่างๆ ในกราฟ
                        หรือเลือกภาควิชาด้านล่างเพื่อดูรายละเอียดเพิ่มเติม
                      </p>
                      <div className="row align-items-center">
                        <div className="col-md-4">
                          <label className="form-label">
                            เลือกภาควิชาเพื่อดูรายละเอียด:
                          </label>
                        </div>
                        <div className="col-md-8">
                          <Select
                            options={getSortedDepartmentOptions()}
                            value={
                              selectedDepartment
                                ? {
                                    value: selectedDepartment,
                                    label: `${selectedDepartment} - ${reportData.chartData
                                      .find((d) => d.name === selectedDepartment)
                                      ?.value.toLocaleString()} แผ่น`,
                                  }
                                : null
                            }
                            onChange={(option) =>
                              setSelectedDepartment(option?.value || null)
                            }
                            isClearable
                            placeholder="เลือกภาควิชา..."
                            className="department-select"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedDepartment && (
                    <DepartmentDetails
                      department={reportData.chartData.find(
                        (d) => d.name === selectedDepartment
                      )}
                    />
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};

export default Report;