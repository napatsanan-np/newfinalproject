import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import { 
  Container, 
  Table, 
  Button, 
  Card, 
  Form,
  Row,
  Col,
  Badge
} from 'react-bootstrap';

const ExamConfig = () => {
  const [examConfigs, setExamConfigs] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);

  const fetchExamConfigs = async () => {
    try {
      const response = await axios.get(localStorage.getItem("API") + '/select_data/exam_config' , {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      setExamConfigs(Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []));
    } catch (error) {
      console.error('Error fetching exam configs:', error);
      alert('ไม่สามารถดึงข้อมูลได้');
    }
  };

  useEffect(() => {
    fetchExamConfigs();
  }, []);

  const handleDelete = async (config) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
      try {
        await axios.post(localStorage.getItem("API") + '/delete_data/exam_config', config , {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        fetchExamConfigs();
        alert('ลบข้อมูลสำเร็จ');
      } catch (error) {
        console.error('Error deleting exam config:', error);
        alert(`ไม่สามารถลบข้อมูลได้ ${config.academic_year} ${config.semester}`);
      }
    }
  };

  const handleSelect = async (config) => {
    if (window.confirm(`คุณต้องการเลือกใช้ข้อมูล ${config.academic_year} ${config.semester}`)) {
      try {
        await axios.post(localStorage.getItem("API") + '/selectConfig/exam_config', config , {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        fetchExamConfigs();
        alert(`เลือกใช้ข้อมูล ${config.academic_year} ${config.semester}`);
      } catch (error) {
        console.error('Error deleting exam config:', error);
        alert(`ไม่สามารถลบข้อมูลได้ ${config.academic_year} ${config.semester}`);
      }
    }
  };

  const handleEdit = (config) => {
    setCurrentConfig({
      ...config,
      prep_period_start: format(new Date(config.prep_period_start), "yyyy-MM-dd'T'HH:mm"),
      prep_period_end: format(new Date(config.prep_period_end), "yyyy-MM-dd'T'HH:mm"),
      exam_period_start: format(new Date(config.exam_period_start), "yyyy-MM-dd'T'HH:mm"),
      exam_period_end: format(new Date(config.exam_period_end), "yyyy-MM-dd'T'HH:mm"),
    });
    setEditMode(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleSave = async () => {
    try {
      // ตรวจสอบว่ามีข้อมูลปีการศึกษาและภาคเรียนหรือไม่
      if (!currentConfig.academic_year || !currentConfig.semester) {
        alert('กรุณาระบุปีการศึกษาและภาคเรียน');
        return;
      }
      
      // เพิ่ม log เพื่อตรวจสอบข้อมูลที่จะส่ง
      console.log('Sending data:', currentConfig);
      
      await axios.post(
        localStorage.getItem("API") + '/update_data/exam_config/' + currentConfig.academic_year + "/" + currentConfig.semester, 
        currentConfig,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );  
      
      setEditMode(false);
      setCurrentConfig(null);
      fetchExamConfigs();
      alert(`บันทึกข้อมูลสำเร็จ (ปีการศึกษา ${currentConfig.academic_year} ภาคเรียน ${currentConfig.semester})`);
    } catch (error) {
      console.error('Error updating exam config:', error);
      alert('ไม่สามารถบันทึกข้อมูลได้');
    }
  };
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  const renderEditForm = () => (
    <Card className="mb-4 shadow-sm border-0 rounded-3">
      <Card.Body className="p-4">
        <Card.Title className="mb-4">
          <i className="fas fa-edit me-2"></i>
          แก้ไขข้อมูลการสอบ
        </Card.Title>
        <Form>

          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>ช่วงเวลาเตรียมการสอบ</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="datetime-local"
                    name="prep_period_start"
                    value={currentConfig.prep_period_start}
                    onChange={handleInputChange}
                    className="rounded-3"
                  />
                  <Form.Control
                    type="datetime-local"
                    name="prep_period_end"
                    value={currentConfig.prep_period_end}
                    onChange={handleInputChange}
                    className="rounded-3"
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>ช่วงเวลาสอบ</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="datetime-local"
                    name="exam_period_start"
                    value={currentConfig.exam_period_start}
                    onChange={handleInputChange}
                    className="rounded-3"
                  />
                  <Form.Control
                    type="datetime-local"
                    name="exam_period_end"
                    value={currentConfig.exam_period_end}
                    onChange={handleInputChange}
                    className="rounded-3"
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button 
              variant="primary" 
              onClick={handleSave}
              className="rounded-3"
            >
              <i className="fas fa-save me-2"></i>
              บันทึก
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditMode(false);
                setCurrentConfig(null);
              }}
              className="rounded-3"
            >
              <i className="fas fa-times me-2"></i>
              ยกเลิก
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );

  const renderTable = () => (
    <Table responsive bordered hover className="mb-0 shadow-sm">
      <thead className="bg-light">
        <tr>
          <th className="py-3">ปี/ภาค</th>
          <th className="py-3">ช่วงเวลาเตรียมการสอบ</th>
          <th className="py-3">ช่วงเวลาสอบ</th>
          <th className="py-3">การดำเนินการ</th>
        </tr>
      </thead>
      <tbody>
        {examConfigs.map((config) => (
          <tr key={config.id} className={config.status ? "table-success" : ""}>
            <td className="align-middle">
              <Badge bg="info" className="px-3 py-2">
                {config.academic_year}/{config.semester}/{config.phase}
              </Badge>
            </td>
            <td className="align-middle">
              {formatDate(config.prep_period_start)} - {formatDate(config.prep_period_end)}
            </td>
            <td className="align-middle">
              {formatDate(config.exam_period_start)} - {formatDate(config.exam_period_end)}
            </td>
            <td className="align-middle">
              <div className="d-flex gap-2">
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={() => handleEdit(config)}
                  className="rounded-3"
                >
                  <i className="fas fa-edit me-1"></i>
                  แก้ไข
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDelete(config)}
                  className="rounded-3"
                >
                  <i className="fas fa-trash-alt me-1"></i>
                  ลบ
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => handleSelect(config)}
                  className="rounded-3"
                >
                  <i className="fas fa-check me-1"></i>
                  เลือก
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
  

  return (
    <>
      <SidebarMenu />
      <div className="custom-background" style={{ paddingTop: "115px" }}>
        <Container >
          <Card className="border-0 shadow-sm rounded-3" style={{ minHeight: "500px" }}>
            <Card.Body className="p-4">
              <h2 className="mb-4">
                <i className="fas fa-calendar-alt me-2"></i>
                ข้อมูลการสอบ
              </h2>
              
              {editMode && currentConfig ? renderEditForm() : renderTable()}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};

export default ExamConfig;