import React, { useState, useEffect } from 'react';

import { Container, Card, Form, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";

const ExamPaperCalculator = () => {
  // State for reserve percentage
  const [reservePercentage, setReservePercentage] = useState(10); // Default reserve percentage
  const [examConfig, setExamConfig] = useState({
    academic_year: '',
    semester: '',
    backup_exam: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch exam configuration data
  useEffect(() => {
    const fetchExamConfig = async () => {
      try {
        setLoading(true);
        const response = await axios.get(localStorage.getItem("API") + "/select_data/exam_config", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          });
        
        // Filter for records where status is true
        const activeConfigs = response.data.filter(item => item.status === true);
        
        if (activeConfigs && activeConfigs.length > 0) {
          const config = activeConfigs[0]; // Use the first active config
          setExamConfig({
            academic_year: config.academic_year || '',
            semester: config.semester || '',
            backup_exam: config.backup_exam || 10
          });
          
          // Set reserve percentage from the fetched data
          setReservePercentage(config.backup_exam || 10);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching exam configuration:', err);
        setError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      }
    };
    
    fetchExamConfig();
  }, []);
  
  // Handle input change with validation for 0-100 range
  const handleInputChange = (e) => {
    const value = e.target.value;
    // Allow empty string for typing purposes
    if (value === '') {
      setReservePercentage('');
    } else {
      // Convert to number and validate range
      const numValue = Number(value);
      if (numValue >= 0 && numValue <= 100) {
        setReservePercentage(numValue);
      }
    }
  };

  // Handle save button click
  const handleSave = async () => {
    try {
      // Create payload for update including semester and academic year
      const updatePayload = {
        backup_exam: reservePercentage,
        semester: examConfig.semester,
        academic_year: examConfig.academic_year
      };
      
      // Send PUT request to update the backup exam percentage
      await axios.put(localStorage.getItem("API") + "/UpdateBackupExam", updatePayload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      
      // Show success message
      alert('บันทึกข้อมูลสำเร็จ');
    } catch (err) {
      console.error('Error saving backup exam percentage:', err);
      alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <>
      <SidebarMenu/>
      <div className="custom-background">
        <Container>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">สำรองข้อสอบ</h4>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row className="mb-4">
                  {loading ? (
                    <Col md={12}>
                      <div className="text-center p-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="mt-2">กำลังโหลดข้อมูล...</div>
                      </div>
                    </Col>
                  ) : error ? (
                    <Col md={12}>
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    </Col>
                  ) : (
                    <Col md={12}>
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded border">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style={{ width: "40px", height: "40px" }}>
                            <i className="fas fa-calendar"></i>
                          </div>
                          <div>
                            <div className="text-muted small">ปีการศึกษา / เทอม</div>
                            <div className="fw-bold">{examConfig.academic_year} / {examConfig.semester}</div>
                          </div>
                        </div>
                        <span className="badge bg-success py-2 px-3 fs-6">ปัจจุบัน</span>
                      </div>
                    </Col>
                  )}
                </Row>
                
                <Row className="mb-3">
                  <Col md={9}>
                    <Form.Group>
                      <Form.Label>เปอร์เซ็นต์สำรองข้อสอบ (%)</Form.Label>
                      <Form.Control
                        type="number"
                        name="reservePercentage"
                        value={reservePercentage}
                        onChange={handleInputChange}
                        placeholder="เปอร์เซ็นต์สำรอง (ค่าเริ่มต้น 10%)"
                        min="0"
                        max="100"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <button 
                      className="btn btn-primary w-100" 
                      type="button"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};

export default ExamPaperCalculator;