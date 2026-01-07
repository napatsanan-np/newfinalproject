import React, { useEffect, useMemo, useState } from "react";
import { Container, Card, Alert, Table, Badge } from "react-bootstrap";
import SidebarMenu from "../Navbar/SidebarMenu";
import "./Report-styles.css"; // ใช้ไฟล์เดิมไปก่อน

function getRoles() {
  const raw = localStorage.getItem("roles");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return raw.split(",").map((x) => x.trim()).filter(Boolean);
  }
}

const ActivityLogs = () => {
  const token = localStorage.getItem("token");
  const apiBase = localStorage.getItem("API"); // ✅ ตามโปรเจคคุณ

  const roles = useMemo(() => getRoles(), []);
  const isAdmin = roles.includes("ผู้ดูแลระบบ");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // filters
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const limit = 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchLogs = async (toPage = page) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String((toPage - 1) * limit));
      if (username) params.set("username", username);
      if (role) params.set("role", role);
      if (action) params.set("action", action);
      if (status) params.set("status", status);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`${apiBase}/activity-logs?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "โหลดข้อมูลไม่สำเร็จ");

      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !apiBase || !isAdmin) return;
    fetchLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token, apiBase, isAdmin]);

  return (
    <>
      <SidebarMenu />

      <div className="container-wide py-4">
        <Container>
          <h2 className="mb-3 text-primary">รายงานบันทึกการใช้งานระบบ</h2>

          {!token || !apiBase ? (
            <Alert variant="warning">กรุณาเข้าสู่ระบบก่อน</Alert>
          ) : !isAdmin ? (
            <Alert variant="danger">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะผู้ดูแลระบบ)</Alert>
          ) : (
            <Card className="shadow-sm">
              <Card.Header className="bg-white">
                <div className="d-flex flex-wrap gap-2 align-items-end">
                  <div>
                    <label className="form-label mb-1">username</label>
                    <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label mb-1">role</label>
                    <input className="form-control" value={role} onChange={(e) => setRole(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label mb-1">action</label>
                    <input className="form-control" value={action} onChange={(e) => setAction(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label mb-1">status</label>
                    <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label mb-1">จากวันที่</label>
                    <input className="form-control" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label mb-1">ถึงวันที่</label>
                    <input className="form-control" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setPage(1);
                      fetchLogs(1);
                    }}
                    disabled={loading}
                  >
                    {loading ? "กำลังโหลด..." : "ค้นหา"}
                  </button>
                </div>

                {error && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    {error}
                  </Alert>
                )}
              </Card.Header>

              <Card.Body>
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>เวลา</th>
                        <th>user_id</th>
                        <th>username</th>
                        <th>role</th>
                        <th>action</th>
                        <th>status</th>
                        <th>ip</th>
                        <th>endpoint</th>
                        <th>method</th>
                        <th>description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.log_id}>
                          <td>{new Date(r.created_at).toLocaleString()}</td>
                          <td>{r.user_id}</td>
                          <td>{r.username}</td>
                          <td>{r.role}</td>
                          <td>{r.action}</td>
                          <td>
                            <Badge bg={r.status === "SUCCESS" ? "success" : "danger"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td>{r.ip_address}</td>
                          <td>{r.endpoint}</td>
                          <td>{r.method}</td>
                          <td style={{ maxWidth: 350, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.description}
                          </td>
                        </tr>
                      ))}

                      {items.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center">
                            ไม่พบข้อมูล
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-outline-secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                    ก่อนหน้า
                  </button>
                  <div>
                    หน้า {page} / {totalPages} (ทั้งหมด {total})
                  </div>
                  <button className="btn btn-outline-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                    ถัดไป
                  </button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Container>
      </div>
    </>
  );
};

export default ActivityLogs;
