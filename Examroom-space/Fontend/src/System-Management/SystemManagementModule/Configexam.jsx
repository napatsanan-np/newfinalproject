import React, { useState } from 'react';
import { Container, Card, Form, Row, Col, Button, Table, Badge } from 'react-bootstrap';
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import Select from 'react-select';
import axios from 'axios';
import { Link } from 'react-router-dom';
const SystemManagement = () => {


    const semesterOptions = [
        { value: 'ภาคต้น', label: 'ภาคต้น' },
        { value: 'ภาคปลาย', label: 'ภาคปลาย' },
        { value: 'ภาคฤดูร้อน', label: 'ภาคฤดูร้อน' }
    ];


    const [examConfig, setExamConfig] = useState({
        id: 0,
        academic_year: '',
        semester: '',
        prep_period_start: '',
        prep_period_end: '',
        exam_period_start: '',
        exam_period_end: '',
        phase: '',
    });

    const [modules, setModules] = useState([
        { id: 1, name: 'หน้าสำหรับกรรมการห้องข้อสอบ', status: true },
        { id: 2, name: 'หน้าสำหรับส่งข้อสอบโดยอาจารย์ผู้สอน', status: true },
        { id: 3, name: 'หน้าสำหรับกรรมการเช็คตารางคุม', status: false }
    ]);

    const [errors, setErrors] = useState({
        academic_year: false,
        semester: false,
        phase: false,
    });

    const handleTimeChange = (field, value) => {
        setExamConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleModuleToggle = (moduleId) => {
        setModules(prev =>
            prev.map(module =>
                module.id === moduleId
                    ? { ...module, status: !module.status }
                    : module
            )
        );
    };

    const handleTimeSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            // ถ้าอยาก alert แยกก็ทำได้ แต่ไม่จำเป็นแล้ว เพราะกรอบแดงขึ้น
            return;
        }

        // Validate input
        const isValid = examConfig.prep_period_start && examConfig.prep_period_end && new Date(examConfig.prep_period_start) < new Date(examConfig.prep_period_end)
            && examConfig.exam_period_start && examConfig.exam_period_end && new Date(examConfig.exam_period_start) < new Date(examConfig.exam_period_end);

        if (!isValid) {
            alert('โปรดตรวจสอบช่วงเวลาให้ถูกต้อง (วันเริ่มต้นต้องน้อยกว่าวันสิ้นสุด)');
            return;
        }
        console.log("Api", localStorage.getItem("API") + '/SetSystemmanagement')
        try {
            await axios.post(localStorage.getItem("API") + '/SetSystemmanagement', examConfig, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
            });
            alert('การตั้งค่าช่วงเวลาถูกบันทึกเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error saving time settings:', error.response.data.error);
            alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่าเวลา ' + error.response.data.error);
        }
    };

    const handleModuleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        const payload = {
            academicYear: examConfig.academic_year,
            semester: examConfig.semester,
            phase: examConfig.phase,
            modules
        };





        try {
            await axios.post(localStorage.getItem("API") + '/SetSystemmanagement', payload, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
            });
            alert('การตั้งค่าโมดูลถูกบันทึกเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error saving module settings:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่าโมดูล', axios.error);
        }
    };

    const validateForm = () => {
        const newErrors = {
            academic_year:
                !examConfig.academic_year || String(examConfig.academic_year).trim() === "",
            semester:
                !examConfig.semester || String(examConfig.semester).trim() === "",
            phase:
                !examConfig.phase || String(examConfig.phase).trim() === "",
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };
    const handleSave = async () => {
        if (!validateForm()) return;

        await saveConfig();
        setShowSuccess(true);
    };




    return (
        <>
            <SidebarMenu />
            <div className="custom-background">
                <Container className="mt-4">
                    {/* Academic Year and Semester Selection */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h3 style={{ textAlign: "center" }}>เลือกปีการศึกษาและภาคการศึกษา</h3>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">

                                        <Form.Group className="mb-3">
                                            <Form.Label>ปีการศึกษา</Form.Label>
                                            <Form.Select
                                                id="academic_year"
                                                aria-label="ปีการศึกษา"
                                                value={examConfig.academic_year}
                                                isInvalid={!!errors.academic_year}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setExamConfig(prev => ({ ...prev, academic_year: v }));
                                                    setErrors(prev => ({ ...prev, academic_year: false })); //  ล้าง error
                                                }}
                                            // isInvalid={!!errors.academic_year}
                                            >
                                                <option value="">เลือกปีการศึกษา</option>
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 543 + 1 - i).map((year) => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </Form.Select>

                                            {errors.academic_year && (
                                                <Form.Control.Feedback type="invalid" className="d-block">
                                                    กรุณาเลือกปีการศึกษา
                                                </Form.Control.Feedback>
                                            )}
                                        </Form.Group>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>ภาคการศึกษา</Form.Label>

                                        <Form.Select
                                            id="semester"
                                            aria-label="ภาคการศึกษา"
                                            value={examConfig.semester}
                                            isInvalid={!!errors.semester}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setExamConfig(prev => ({ ...prev, semester: v }));
                                                setErrors(prev => ({ ...prev, semester: false })); // ล้าง error
                                            }}
                                        // isInvalid={!!errors.semester}
                                        >
                                            <option value="">เลือกภาคการศึกษา</option>
                                            <option value="ภาคต้น">ภาคต้น</option>
                                            <option value="ภาคปลาย">ภาคปลาย</option>
                                            <option value="ภาคฤดูร้อน">ภาคฤดูร้อน</option>
                                        </Form.Select>

                                        {errors.semester && (
                                            <Form.Control.Feedback type="invalid" className="d-block">
                                                กรุณาเลือกภาคการศึกษา
                                            </Form.Control.Feedback>
                                        )}
                                    </Form.Group>

                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Phase (ช่วงสอบ)</Form.Label>
                                        <Form.Select
                                            id="phase"
                                            name="phase"
                                            aria-label="Phase (ช่วงสอบ)"
                                            value={examConfig.phase || ""}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setExamConfig(prev => ({ ...prev, phase: v }));
                                                setErrors(prev => ({ ...prev, phase: false })); // ล้าง error
                                            }}
                                            isInvalid={!!errors.phase}
                                        >

                                            <option value="">เลือก Phase</option>
                                            <option value="กลางภาค">กลางภาค</option>
                                            <option value="ปลายภาค">ปลายภาค</option>
                                        </Form.Select>


                                        <Form.Control.Feedback type="invalid">
                                            กรุณาเลือก Phase
                                        </Form.Control.Feedback>

                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Time Period Settings */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h3 style={{ textAlign: "center" }}>ตั้งค่าช่วงเวลา</h3>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleTimeSubmit}>
                                <Form.Group className="mb-4">
                                    <Form.Label>ช่วงเวลาเตรียมการก่อนสอบ</Form.Label>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>เริ่มต้น</Form.Label>
                                                <Form.Control
                                                    type="datetime-local"
                                                    value={examConfig.prep_period_start}
                                                    onChange={(e) => handleTimeChange('prep_period_start', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>สิ้นสุด</Form.Label>
                                                <Form.Control
                                                    type="datetime-local"
                                                    value={examConfig.prep_period_end}
                                                    onChange={(e) => handleTimeChange('prep_period_end', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>ช่วงเวลาเปิดห้องอำนวยการสอบ</Form.Label>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>เริ่มต้น</Form.Label>
                                                <Form.Control
                                                    type="datetime-local"
                                                    value={examConfig.exam_period_start}
                                                    onChange={(e) => handleTimeChange('exam_period_start', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>สิ้นสุด</Form.Label>
                                                <Form.Control
                                                    type="datetime-local"
                                                    value={examConfig.exam_period_end}
                                                    onChange={(e) => handleTimeChange('exam_period_end', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Form.Group>
                                

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'left', alignItems: 'center' }}>
                                    <Button style={{ width: "200px" }} variant="primary" type="submit">
                                        บันทึกการตั้งค่าเวลา
                                    </Button>
                                    <Link to="/TimeSettingsModal">
                                        <Button style={{ width: "200px" }} variant="primary" type="submit">
                                            ดูรายละเอียด
                                        </Button>
                                    </Link>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* Module Management */}

                </Container>
            </div>
        </>
    );
};

export default SystemManagement;
