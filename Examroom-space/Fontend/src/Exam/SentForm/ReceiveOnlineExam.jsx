import { useState } from "react";
import useSWR from "swr";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Table,
} from "react-bootstrap";
import axios from "axios";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import "./NewForm-styles.css";
import "./NewForm-fonts.css";

const ReceiveOnlineExam = () => {
  const url = localStorage.getItem("API");
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [message, setMessage] = useState({ type: "", text: "" });
  const [loadingRef, setLoadingRef] = useState(null);

  const fetcher = async (apiUrl) => {
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  };

  const {
    data: pendingExamList = [],
    error,
    isLoading,
    mutate,
  } = useSWR(`${url}/online-exam/pending`, fetcher, {
    revalidateOnFocus: false,
  });

  const handleReceiveExam = async (item) => {
    setMessage({ type: "", text: "" });
    setLoadingRef(`${item.ref}-${item.id_config}`);

    try {
      await axios.put(
        `${url}/online-exam/receive`,
        {
          ref: item.ref,
          id_config: item.id_config,
          receiver: user?.full_name || user?.username || "เจ้าหน้าที่ห้องข้อสอบ",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      setMessage({ type: "success", text: "รับข้อสอบออนไลน์สำเร็จ" });
      await mutate();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "เกิดข้อผิดพลาดในการรับข้อสอบ";

      setMessage({ type: "danger", text: errorMessage });
    } finally {
      setLoadingRef(null);
    }
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={11} lg={12}>
              <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                  <h2 className="text-center mb-4">รับข้อสอบออนไลน์</h2>

                  {message.text && (
                    <Alert
                      variant={message.type}
                      dismissible
                      onClose={() => setMessage({ type: "", text: "" })}
                    >
                      {message.text}
                    </Alert>
                  )}

                  {isLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                      <div className="mt-2">กำลังโหลดข้อมูล...</div>
                    </div>
                  )}

                  {error && (
                    <Alert variant="danger">
                      ไม่สามารถดึงข้อมูลรายการรอการยืนยันได้
                    </Alert>
                  )}

                  {!isLoading && !error && (
                    <>
                      {pendingExamList.length === 0 ? (
                        <Alert variant="secondary" className="mb-0">
                          ไม่มีรายการข้อสอบออนไลน์ที่รอการยืนยัน
                        </Alert>
                      ) : (
                        <div className="table-responsive">
                          <Table bordered hover>
                            <thead>
                              <tr>
                                <th>ลำดับ</th>
                                <th>ชื่อวิชา</th>
                                <th>อาจารย์ผู้ออกข้อสอบ</th>
                                <th>วันสอบ</th>
                                <th>เวลาสอบ</th>
                                <th>ห้องสอบ</th>
                                <th>จำนวนหน้า</th>
                                <th>สถานะการสอบ</th>
                                <th>สถานะการส่งข้อสอบ</th>
                                <th>จัดการ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingExamList.map((item, index) => {
                                const rowKey = `${item.ref}-${item.id_config}`;
                                const isSubmitting = loadingRef === rowKey;

                                return (
                                  <tr key={rowKey}>
                                    <td>{index + 1}</td>
                                    <td>{item.course}</td>
                                    <td>{item.lecturer || "-"}</td>
                                    <td>{item.eDate || "-"}</td>
                                    <td>{item.eTime || "-"}</td>
                                    <td>{item.room_name || "-"}</td>
                                    <td>{item.page || "-"}</td>
                                    <td>{item.exam_type || "-"}</td>
                                    <td>{item.submit || "-"}</td>
                                    <td style={{ minWidth: "140px" }}>
                                      <Button
                                        variant="success"
                                        size="sm"
                                        disabled={isSubmitting}
                                        onClick={() => handleReceiveExam(item)}
                                      >
                                        {isSubmitting ? "กำลังบันทึก..." : "รับข้อสอบ"}
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default ReceiveOnlineExam;