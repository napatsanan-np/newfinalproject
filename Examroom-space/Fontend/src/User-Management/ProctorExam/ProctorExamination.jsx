import React, { useEffect, useState } from 'react';
import { 
  Container, Card, Form, Button, Table, Row, Col, Modal, Badge, 
  Spinner, InputGroup, FormControl, Dropdown, OverlayTrigger, Tooltip 
} from 'react-bootstrap';
import Select from "react-select";
import Swal from 'sweetalert2';
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import { SWAL_CONFIG } from './sweetAlertConfig';
import { FiSearch, FiUserPlus, FiTrash2, FiFilter, FiUser } from 'react-icons/fi';

// Custom styling for Select component
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#80bdff' : provided.borderColor,
    boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)' : provided.boxShadow,
    '&:hover': {
      borderColor: state.isFocused ? '#80bdff' : '#ced4da',
    },
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
    height: '40px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? '#007bff' 
      : state.isFocused 
        ? '#f8f9fa' 
        : provided.backgroundColor,
    color: state.isSelected ? 'white' : provided.color,
    '&:active': {
      backgroundColor: state.isSelected ? '#007bff' : '#e9ecef',
    },
    fontSize: '0.95rem',
    padding: '8px 12px',
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e9ecef',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#495057',
    fontSize: '0.9rem',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    '&:hover': {
      backgroundColor: '#dc3545',
      color: 'white',
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    borderRadius: '0.25rem',
  }),
};

// Custom animation CSS for hover effects (to be added to your CSS file)
const customAnimationCSS = `
  .hover-scale:hover {
    transform: scale(1.03);
    transition: transform 0.2s ease-in-out;
  }
  
  .btn-action {
    transition: all 0.2s ease-in-out;
  }
  
  .btn-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .committee-card {
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border-radius: 8px;
  }
  
  .committee-card:hover {
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }
  
  .fade-in {
    animation: fadeIn 0.5s;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .member-row {
    transition: background-color 0.2s;
  }
  
  .member-row:hover {
    background-color: rgba(0, 123, 255, 0.05) !important;
  }
  
  .custom-background {
    background-color: #f8f9fa;
    min-height: 100vh;
    padding-bottom: 2rem;
  }
  
  .search-container {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
  }
  
  .no-data-message {
    padding: 2rem;
    text-align: center;
    color: #6c757d;
  }
`;

const CommitteeManagement = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMemberwithuser, setSelectedMemberwithuser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userWithRole, setUserWithRole] = useState([]);
  const [filteredUserWithRole, setFilteredUserWithRole] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'department'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [departmentMap, setDepartmentMap] = useState({});

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, rolesResponse, depResponse] = await Promise.all([
        fetch(localStorage.getItem("API") + "/select_data/users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(localStorage.getItem("API") + "/GetUserWithRole", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(localStorage.getItem("API") + "/select_data/departments", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        })
      ]);

      if (!usersResponse.ok || !rolesResponse.ok || !depResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const userData = await usersResponse.json();
      const rolesData = await rolesResponse.json();
      const depData = await depResponse.json();

      // สร้าง Map สำหรับ lookup ชื่อแผนกจาก id_dept
      const deptMap = {};
      depData.forEach(dep => {
        deptMap[dep.id_dept] = dep.name_th;
      });
      setDepartmentMap(deptMap);

      // Process users data พร้อมชื่อแผนกภาษาไทย
      const processedUsers = userData.map(user => {
        const departmentName = deptMap[user.department] || "ไม่ทราบแผนก";
        return {
          value: user.user_id,
          label: `${user.full_name} (${departmentName})`,
          full_name: user.full_name,
          department: user.department,
          department_name: departmentName,
          user_id: user.user_id
        };
      });

      // Filter และแมปข้อมูล role พร้อมชื่อแผนก
      const filteredRolesData = rolesData
        .filter(user => user.user_role && user.user_role.role_id === "PROCTOREXAMROOOM")
        .map(user => {
          const deptName = deptMap[user.users.department] || "ไม่ทราบแผนก";
          return {
            value: user.user_id,
            label: `${user.users.full_name} (${deptName})`,
            full_name: user.users.full_name,
            department: user.users.department,
            department_name: deptName,
            user_id: user.users.user_id,
            role: user.role_type?.role_name || "กรรมการห้องอำนวยการสอบ",
            added_date: new Date().toISOString()
          };
        });

      // Set state with fetched data
      setUsers(processedUsers);
      setUserWithRole(filteredRolesData);
      setFilteredUserWithRole(filteredRolesData);
      
      // Remove any selected member who no longer exists in the list
      if (selectedMemberwithuser && !filteredRolesData.some(user => user.user_id === selectedMemberwithuser.user_id)) {
        setSelectedMemberwithuser(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        ...SWAL_CONFIG.error,
        text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่ภายหลัง',
        showConfirmButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Add our custom CSS
    const styleElement = document.createElement('style');
    styleElement.innerHTML = customAnimationCSS;
    document.head.appendChild(styleElement);
    
    // Cleanup function
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    // Apply search term, filtering, and sorting whenever these dependencies change
    let result = [...userWithRole];
    
    // Apply search filter if any
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(user => 
        (user.full_name?.toLowerCase().includes(searchLower)) || 
        (user.department_name?.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply selected member filter if any
    if (selectedMemberwithuser) {
      result = result.filter(user => user.user_id === selectedMemberwithuser.user_id);
    }
    
    // Apply sorting
    result = result.sort((a, b) => {
      let valueA, valueB;
      
      if (sortBy === 'name') {
        valueA = a.full_name?.toLowerCase() || '';
        valueB = b.full_name?.toLowerCase() || '';
      } else if (sortBy === 'department') {
        valueA = a.department_name?.toLowerCase() || '';
        valueB = b.department_name?.toLowerCase() || '';
      } else {
        return 0;
      }
      
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });
    
    setFilteredUserWithRole(result);
  }, [userWithRole, searchTerm, selectedMemberwithuser, sortBy, sortDirection]);

  const handleSelectChange = (selectedOption) => {
    setSelectedMember(selectedOption);
  };

  const handleSelectChangewithuser = (selectedOption) => {
    setSelectedMemberwithuser(selectedOption);
    setSearchTerm(''); // Reset search when selecting a specific member
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (selectedMemberwithuser) {
      setSelectedMemberwithuser(null); // Reset selected member when searching
    }
  };

  const handleSortChange = (column) => {
    if (sortBy === column) {
      // Toggle direction if same column is clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, set it and default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember) {
      Swal.fire({
        ...SWAL_CONFIG.warning,
        text: 'กรุณาเลือกบุคลากรก่อนเพิ่มกรรมการ'
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch(localStorage.getItem("API") + '/update_data/AddProctorexamroom', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedMember.user_id,
          full_name: selectedMember.full_name,
          department: selectedMember.department
        })
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      // Add animation to highlight the new member
      setRecentlyAdded(selectedMember.user_id);
      setTimeout(() => setRecentlyAdded(null), 5000); // Clear after 5 seconds
      
      await fetchData();
      setShowAddModal(false);
      setSelectedMember(null);

      Swal.fire({
        ...SWAL_CONFIG.success,
        text: 'เพิ่มกรรมการห้องข้อสอบเรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error adding member:", error);
      Swal.fire({
        ...SWAL_CONFIG.error,
        text: 'ไม่สามารถเพิ่มกรรมการห้องข้อสอบได้ กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteMember = (member) => {
    setMemberToDelete(member);
    setShowConfirmDelete(true);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const response = await fetch(localStorage.getItem("API") + '/delete_data/DeleteProctorexamroom', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: memberToDelete.user_id })
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      setShowConfirmDelete(false);
      await fetchData();
      
      Swal.fire({
        ...SWAL_CONFIG.success,
        text: `ลบ ${memberToDelete.full_name} ออกจากกรรมการห้องข้อสอบเรียบร้อยแล้ว`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error deleting member:", error);
      Swal.fire({
        ...SWAL_CONFIG.error,
        text: 'ไม่สามารถลบกรรมการห้องข้อสอบได้ กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setMemberToDelete(null);
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setSelectedMemberwithuser(null);
    setSortBy('name');
    setSortDirection('asc');
    fetchData();
  };

  return (
    <div className="custom-background">
      <SidebarMenu/>
      
      {/* Add our styles */}
      <style>{customAnimationCSS}</style>
      
      <Container className="mt-4">
        <Card className="committee-card shadow-sm">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
            <div className="d-flex align-items-center">
              <FiUser size={24} className="me-2" />
              <h3 className="m-0">จัดการกรรมการห้องอำนวยการสอบ</h3>
            </div>
            <Button 
              variant="light" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
              title="รีเฟรชข้อมูล"
            >
              {isLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "รีเฟรช"
              )}
            </Button>
          </Card.Header>
          <Card.Body>
            <Row className="mb-4 g-3">
              <Col lg={4} md={6}>
                <Form.Group>
                  <Form.Label>
                    <FiFilter className="me-1" /> กรองตามรายชื่อกรรมการ
                  </Form.Label>
                  <Select
                    options={userWithRole}
                    value={selectedMemberwithuser}
                    onChange={handleSelectChangewithuser}
                    placeholder="เลือกกรรมการที่ต้องการ"
                    isClearable
                    isSearchable
                    styles={customSelectStyles}
                    noOptionsMessage={() => "ไม่พบข้อมูล"}
                  />
                </Form.Group>
              </Col>
              <Col lg={4} md={6}>
                <Form.Group>
                  <Form.Label>
                    <FiSearch className="me-1" /> ค้นหา
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FiSearch />
                    </InputGroup.Text>
                    <FormControl
                      placeholder="ค้นหาตามชื่อหรือภาควิชา"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    {searchTerm && (
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setSearchTerm('')}
                      >
                        ✕
                      </Button>
                    )}
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col lg={4} md={12} className="d-flex align-items-end">
                <Button
                  variant="success"
                  className="w-100 py-2 btn-action"
                  onClick={() => setShowAddModal(true)}
                >
                  <FiUserPlus className="me-2" /> เพิ่มกรรมการห้องอำนวยการสอบ
                </Button>
              </Col>
            </Row>

            {isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table bordered hover className="shadow-sm mb-0" style={{textAlign : 'center'}}>
                    <thead className="bg-light">
                      <tr >
                        <th 
                          className="position-relative" 
                          onClick={() => handleSortChange('name')}
                          style={{cursor: 'pointer'}}
                        >
                          ชื่อ-นามสกุล
                          {sortBy === 'name' && (
                            <span className="ms-2">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          className="position-relative"
                          onClick={() => handleSortChange('department')}
                          style={{cursor: 'pointer'}}
                        >
                          ภาควิชา
                          {sortBy === 'department' && (
                            <span className="ms-2">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th>ตำแหน่ง</th>
                        <th style={{width: "120px"}}>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUserWithRole.length > 0 ? (
                        filteredUserWithRole.map((member) => (
                          <tr 
                            key={member.user_id} 
                            className={`member-row ${recentlyAdded === member.user_id ? 'bg-light' : ''}`}
                          >
                            <td style={{textAlign : 'left'}}>
                              {member.full_name}
                              {recentlyAdded === member.user_id && (
                                <Badge bg="success" pill className="ms-2 fade-in">เพิ่มใหม่</Badge>
                              )}
                            </td>
                            <td>{member.department_name}</td>
                            <td>
                              <Badge bg="info" pill>{member.role}</Badge>
                            </td>
                            <td className="text-center">
                              <Button
                                variant="danger"
                                size="sm"
                                className="btn-action"
                                onClick={() => confirmDeleteMember(member)}
                              >
                                <FiTrash2 /> ลบ
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-4">
                            <div className="no-data-message">
                              <p className="mb-0">ไม่พบข้อมูลกรรมการ</p>
                              {searchTerm && (
                                <small className="d-block mt-2">
                                  ลองปรับเปลี่ยนคำค้นหาหรือล้างตัวกรอง
                                </small>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted">
                    แสดง {filteredUserWithRole.length} จากทั้งหมด {userWithRole.length} รายการ
                  </small>
                  
                  {searchTerm && (
                    <small className="text-muted">
                      กำลังค้นหา: "{searchTerm}"
                    </small>
                  )}
                </div>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Add Member Modal */}
        <Modal 
          show={showAddModal} 
          onHide={() => {
            setShowAddModal(false);
            setSelectedMember(null);
          }}
          centered
          backdrop="static"
        >
          <Modal.Header closeButton className="bg-light">
            <Modal.Title>
              <FiUserPlus className="me-2" />
              เพิ่มกรรมการห้องอำนวยการสอบ
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>เลือกบุคลากร <span className="text-danger">*</span></Form.Label>
                <Select
                  options={users}
                  value={selectedMember}
                  onChange={handleSelectChange}
                  placeholder="เลือกบุคลากร"
                  isSearchable
                  styles={customSelectStyles}
                  noOptionsMessage={() => "ไม่พบข้อมูล"}
                />
                {!selectedMember && (
                  <Form.Text className="text-muted">
                    คุณสามารถค้นหาตามชื่อหรือภาควิชาได้
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>ตำแหน่ง</Form.Label>
                <Form.Select disabled>
                  <option value="กรรมการห้องข้อสอบ">กรรมการห้องอำนวยการสอบ</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  ตำแหน่งถูกกำหนดไว้ล่วงหน้าตามระบบ
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setSelectedMember(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="success"
              onClick={handleAddMember}
              disabled={!selectedMember || isSubmitting}
              className="ms-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  กำลังเพิ่ม...
                </>
              ) : (
                <>
                  <FiUserPlus className="me-2" />
                  เพิ่มกรรมการ
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Confirm Delete Modal */}
        <Modal
          show={showConfirmDelete}
          onHide={() => {
            setShowConfirmDelete(false);
            setMemberToDelete(null);
          }}
          centered
          size="sm"
        >
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title>ยืนยันการลบ</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {memberToDelete && (
              <div className="text-center py-3">
                <FiTrash2 size={48} className="text-danger mb-3" />
                <p className="mb-0">คุณต้องการลบ</p>
                <h5 className="mb-1">{memberToDelete.full_name}</h5>
                <p className="text-muted">ออกจากกรรมการห้องอำนวยการสอบ?</p>
                <small className="d-block text-danger mt-3">
                  * การดำเนินการนี้ไม่สามารถเรียกคืนได้
                </small>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowConfirmDelete(false);
                setMemberToDelete(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteMember}
            >
              ยืนยันการลบ
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default CommitteeManagement;