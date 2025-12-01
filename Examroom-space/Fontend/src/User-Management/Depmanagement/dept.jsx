import React, { useState, useEffect } from 'react';
import { 
  Container, Card, Table, Button, 
  Form, Modal, Badge, Spinner,
  Row, Col
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import axios from 'axios';

function DepartmentManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [notification, setNotification] = useState(null);

  const [deptCodesTemp, setDeptCodesTemp] = useState([]);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [departmentsGroup, setDepartmentsGroup] = useState([]);
  const [initialDepartmentsData, SetinitialDepartmentsData] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchDept = async () => {
    try {
      const departmentsResponse = await axios.get(`${localStorage.getItem("API")}/select_data/departments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      SetinitialDepartmentsData(departmentsResponse.data);

      const departmentsGroupResponse = await axios.get(`${localStorage.getItem("API")}/select_data/departments_group`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      setDepartmentsGroup(departmentsGroupResponse.data);
    } catch (error) {
      console.error('Error fetching departments or department groups:', error);
      alert('ไม่สามารถดึงข้อมูลได้');
    }
  };

  useEffect(() => {
    fetchDept();
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  useEffect(() => {
    if (initialDepartmentsData.length > 0 && departmentsGroup.length > 0) {
      const updatedDepartments = initialDepartmentsData.map(dept => {
        const deptGroups = departmentsGroup
          .filter(group => group.id_dept === dept.id_dept)
          .map(group => group.id_dept_code);
        
        return {
          id: dept.id_dept,
          name: dept.name_th,
          id_dept_codes: deptGroups,
        };
      });
      setDepartments(updatedDepartments);
    }
  }, [initialDepartmentsData, departmentsGroup]);

  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'active' && dept.status === 'active') ||
                      (activeTab === 'inactive' && dept.status === 'inactive');
    return matchesSearch && matchesTab;
  });

  const handleAddDepartment = () => {
    setNewDepartmentName('');
    setShowAddModal(true);
  };

  const handleEditDepartment = (dept) => {
    setCurrentDepartment({ ...dept });
    setDeptCodesTemp([...dept.id_dept_codes]);
    setNewDeptCode('');
    setShowEditModal(true);
  };

  const handleAddDeptCode = () => {
    if (newDeptCode.trim() && !deptCodesTemp.includes(newDeptCode.trim())) {
      setDeptCodesTemp([...deptCodesTemp, newDeptCode.trim()]);
      setNewDeptCode('');
    }
  };

  const handleRemoveDeptCode = (code) => {
    setDeptCodesTemp(deptCodesTemp.filter(c => c !== code));
  };

  const handleSaveEditDepartment = async () => {
    setLoading(true);

    try {
      if (departments.some(d => d.name === currentDepartment.name && d.id !== currentDepartment.id)) {
        setNotification({
          type: 'warning',
          message: `มีภาควิชาชื่อ "${currentDepartment.name}" อยู่แล้ว`
        });
        setLoading(false);
        return;
      }

      // ส่งข้อมูลแก้ไขพร้อมรหัสกลุ่ม
      const updatedDept = {
        ...currentDepartment,
        id_dept_codes: deptCodesTemp,
      };
      
      await axios.put(`${localStorage.getItem("API")}/edit_department/${currentDepartment.id}`, updatedDept, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      setDepartments(departments.map(dept => dept.id === currentDepartment.id ? updatedDept : dept));
      setNotification({
        type: 'success',
        message: `แก้ไขภาควิชา "${currentDepartment.name}" เรียบร้อยแล้ว`
      });

    } catch (error) {
      console.error('Error updating department:', error);
      setNotification({ type: 'danger', message: 'ไม่สามารถแก้ไขข้อมูลได้' });
    } finally {
      setLoading(false);
      setShowEditModal(false);
    }
  };

  const handleSaveNewDepartment = async () => {
    if (!newDepartmentName.trim()) {
      setNotification({
        type: 'warning',
        message: 'กรุณากรอกชื่อภาควิชา'
      });
      return;
    }

    if (departments.some(d => d.name === newDepartmentName.trim())) {
      setNotification({
        type: 'warning',
        message: `มีภาควิชาชื่อ "${newDepartmentName}" อยู่แล้ว`
      });
      return;
    }

    setLoading(true);
    try {
      const newDeptId = Math.max(...departments.map(dept => dept.id), 0) + 1;
      
      // ส่งเฉพาะ id_dept และ name_th
      const newDept = {
        id_dept: newDeptId,
        name_th: newDepartmentName
      };
      
      await axios.post(`${localStorage.getItem("API")}/add_department`, newDept, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      // อัพเดทข้อมูลที่แสดงในตาราง
      const addedDept = {
        id: newDeptId,
        name: newDepartmentName,
        id_dept_codes: []
      };
      
      setDepartments([...departments, addedDept]);
      setNotification({
        type: 'success',
        message: `เพิ่มภาควิชา "${newDepartmentName}" เรียบร้อยแล้ว`
      });
    } catch (error) {
      console.error('Error adding department:', error);
      setNotification({ type: 'danger', message: 'ไม่สามารถเพิ่มข้อมูลได้' });
    } finally {
      setLoading(false);
      setShowAddModal(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm('คุณต้องการลบภาควิชานี้ใช่หรือไม่?')) {
      setLoading(true);
      try {
        const deptToDelete = departments.find(d => d.id === id);
        await axios.delete(`${localStorage.getItem("API")}/delete_department/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });

        setDepartments(departments.filter(d => d.id !== id));
        setNotification({
          type: 'warning',
          message: `ลบภาควิชา "${deptToDelete.name}" เรียบร้อยแล้ว`
        });
      } catch (error) {
        console.error('Error deleting department:', error);
        setNotification({ type: 'danger', message: 'ไม่สามารถลบภาควิชาได้' });
      } finally {
        setLoading(false);
      }
    }
  };

  const closeNotification = () => setNotification(null);

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container fluid className="p-0">
          <Container>
            {notification && (
              <div className="my-3">
                <div className={`alert alert-${notification.type} alert-dismissible fade show`} role="alert">
                  {notification.message}
                  <button type="button" className="btn-close" onClick={closeNotification}></button>
                </div>
              </div>
            )}

            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4>จัดการข้อมูลภาควิชา</h4>
                  <Button variant="success" onClick={handleAddDepartment}>
                    <i className="fas fa-plus me-1"></i> เพิ่มภาควิชา
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">กำลังโหลดข้อมูล...</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>รหัส</th>
                        <th>ภาควิชา</th>
                        <th>รหัสกลุ่ม</th>
                        <th className="text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDepartments.length > 0 ? (
                        filteredDepartments.map(dept => (
                          <tr key={dept.id}>
                            <td>{dept.id}</td>
                            <td>{dept.name}</td>
                            <td>
                              {dept.id_dept_codes.length > 0 ? (
                                dept.id_dept_codes.map((code, index) => (
                                  <Badge bg="info" key={index} className="me-1">{code}</Badge>
                                ))
                              ) : (
                                <Badge bg="light" text="dark">ไม่มีรหัสกลุ่ม</Badge>
                              )}
                            </td>
                            <td className="text-center">
                              <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEditDepartment(dept)}>
                                แก้ไข
                              </Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteDepartment(dept.id)}>
                                ลบ
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-4">ไม่พบข้อมูลภาควิชา</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            {/* Modal สำหรับเพิ่มภาควิชาใหม่ */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>เพิ่มภาควิชาใหม่</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group controlId="newDepartmentName">
                    <Form.Label>ชื่อภาควิชา</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="กรอกชื่อภาควิชา"
                      value={newDepartmentName}
                      onChange={(e) => setNewDepartmentName(e.target.value)}
                    />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  ปิด
                </Button>
                <Button variant="primary" onClick={handleSaveNewDepartment}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Modal สำหรับแก้ไขภาควิชา */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>แก้ไขภาควิชา</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group controlId="departmentName">
                    <Form.Label>ชื่อภาควิชา</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="กรอกชื่อภาควิชา"
                      value={currentDepartment?.name || ''}
                      onChange={(e) => setCurrentDepartment({ ...currentDepartment, name: e.target.value })}
                    />
                  </Form.Group>

                  <Form.Group controlId="deptCodes" className="mt-3">
                    <Form.Label>รหัสกลุ่ม</Form.Label>
                    <div>
                      {deptCodesTemp.map((code, index) => (
                        <Badge bg="info" key={index} className="me-1">
                          {code}
                          <span
                            className="ms-2 text-danger"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleRemoveDeptCode(code)}
                          >
                            ×
                          </span>
                        </Badge>
                      ))}
                    </div>
                    <Row className="mt-3">
                      <Col sm={9}>
                        <Form.Control
                          type="text"
                          placeholder="กรอกรหัสกลุ่ม"
                          value={newDeptCode}
                          onChange={(e) => setNewDeptCode(e.target.value)}
                        />
                      </Col>
                      <Col sm={3}>
                        <Button variant="outline-primary" block onClick={handleAddDeptCode}>
                          เพิ่ม
                        </Button>
                      </Col>
                    </Row>
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  ปิด
                </Button>
                <Button variant="primary" onClick={handleSaveEditDepartment}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        </Container>
      </div>
    </>
  );
}

export default DepartmentManagement;