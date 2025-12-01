import { useState, useEffect } from 'react';
import {
  Container, Card, Button, Table, Form, InputGroup, Modal
} from 'react-bootstrap';
import {
  Search, PersonPlusFill, PencilSquare, Trash, PersonCheckFill
} from 'react-bootstrap-icons';
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import axios from 'axios';


export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [searchTerm, setSearchTerm] = useState(''); 
const [departments, setdepartments] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    department: ''
  });
  const [users, setUsers] = useState([]);

  const [filteredUsers, setFilteredUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${localStorage.getItem("API")}/select_data/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      const response1 = await axios.get(`${localStorage.getItem("API")}/select_data/departments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      setUsers(response.data);
      setdepartments(response1.data)
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id_dept === deptId);
    return dept ? dept.name_th : 'ไม่ระบุภาควิชา';
  };

  useEffect(() => {
    const results = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDepartmentName(user.department).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(results);
  }, [searchTerm, users]);

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      username: '',
      full_name: '',
      department: departments[0].id_dept
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      department: user.department
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'department' ? parseInt(value, 10) : value
    });
  };

  const handleSubmit = async () => {
    try {
      if (modalMode === 'add') {
        await axios.post(`${localStorage.getItem("API")}/insert_data/users`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        alert("เพิ่มผู้ใช้สำเร็จ");
      } else {
        await axios.put(`${localStorage.getItem("API")}/update_data/users/${selectedUser.user_id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        alert("แก้ไขผู้ใช้สำเร็จ");
      }
      fetchUsers();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting user:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?')) {
      try {
        await axios.delete(`${localStorage.getItem("API")}/delete_data/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        alert("ลบผู้ใช้สำเร็จ");
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('ไม่สามารถลบผู้ใช้ได้');
      }
    }
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container className="mt-4" fluid style={{ minHeight: "500px" }}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">ระบบจัดการผู้ใช้งาน</h5>
                <Button variant="light" onClick={openAddModal}>
                  <PersonPlusFill className="me-1" /> เพิ่มผู้ใช้ใหม่
                </Button>
              </div>
            </Card.Header>

            <Card.Body>
              <Form className="mb-3">
                <InputGroup>
                  <InputGroup.Text className="bg-light">
                    <Search />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="ค้นหาผู้ใช้..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Form>

              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr style={{ textAlign: 'center' }}>
                      <th>รหัส</th>
                      <th>ชื่อผู้ใช้</th>
                      <th>ชื่อเต็ม</th>
                      <th>ภาควิชา</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody style={{ textAlign: 'center' }}>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <tr key={user.user_id}>
                          <td>{user.user_id}</td>
                          <td>{user.username}</td>
                          <td>{user.full_name}</td>
                          <td>{getDepartmentName(user.department)}</td>
                          <td>
                            <Button
                              variant="info"
                              size="sm"
                              className="me-1 text-white"
                              onClick={() => openEditModal(user)}
                            >
                              <PencilSquare />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(user.user_id)}
                            >
                              <Trash />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">ไม่พบข้อมูลผู้ใช้</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="mt-3 text-muted small">
                แสดง {filteredUsers.length} จาก {users.length} รายการ
              </div>
            </Card.Body>
          </Card>

          {/* Modal */}
          <Modal show={isModalOpen} onHide={() => setIsModalOpen(false)} centered backdrop="static">
            <Modal.Header closeButton className="bg-primary text-white">
              <Modal.Title>{modalMode === 'add' ? 'เพิ่มผู้ใช้ใหม่' : 'แก้ไขข้อมูลผู้ใช้'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>ชื่อผู้ใช้</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>ชื่อเต็ม</Form.Label>
                  <Form.Control
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>ภาควิชา</Form.Label>
                  <Form.Select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    {departments.map(dept => (
                      <option key={dept.id_dept} value={dept.id_dept}>
                        {dept.name_th}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {modalMode === 'add' ? (
                  <>
                    <PersonPlusFill className="me-1" /> เพิ่มผู้ใช้
                  </>
                ) : (
                  <>
                    <PersonCheckFill className="me-1" /> บันทึกการแก้ไข
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </>
  );
}
