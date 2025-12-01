import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Button, Form, Container, Row, Col, Card } from 'react-bootstrap';

import MinimalNavbar from "../../Navbar/MinimalNavbar";
import "./Import_file_Csv-styles.css";

export default function UploadFile() {
    const URL = window.API_URL;
    const token = localStorage.getItem('token'); // Retrieve token from localStorage
    const [file, setFile] = useState(null);
    console.log("Token::::::::::" , token)
    const [fileName, setFileName] = useState('');
    const [dataExamTable, setDataExamTable] = useState([]);
    const [roomExamData, setRoomExamData] = useState([]);
    const [selectedOption, setSelectedOption] = useState("examTable");

    async function GetDataFromApi() {
        try {
            const [res1, res2] = await Promise.all([
                fetch(URL + "/select_data/examtable", {
                    headers: {
                        'Authorization': `Bearer ${token}`, // Include token in header
                    }
                }),
                fetch(URL + "/select_data/roomexam", {
                    headers: {
                        'Authorization': `Bearer ${token}`, // Include token in header
                    }
                })
            ]);
            const dataExam = await res1.json();
            const dataRoomExam = await res2.json();
            setRoomExamData(dataRoomExam || []);
            setDataExamTable(dataExam || []);
        } catch (error) {
            Swal.fire('Error', 'Failed to fetch data from API', 'error');
        }
    }

    useEffect(() => {
        GetDataFromApi();
    }, []);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setFileName(event.target.files[0]?.name || '');
    };

    const DeletePopUp = () => {
        Swal.fire({
            title: "คุณต้องการลบไฟล์ใช่ไหม",
            text: "ไฟล์ที่คุณนำเข้าก่อนหน้านี้จะหายไป",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        }).then((res) => {
            if (res.isConfirmed) {
                handleDelete();
            }
        });
    };

    const UploadPopUp = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: `คุณต้องการอัพโหลดไฟล์ ${fileName}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        }).then((res) => {
            if (res.isConfirmed) {
                handleUpload();
            }
        });
    };

    const handleUpload = async () => {
        try {
            if (file) {
                const formData = new FormData();
                formData.append('FileExcel', file);
                await axios.post(`${URL}/upload`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`, // Include token in header
                    }
                });
                GetDataFromApi();
                Swal.fire('Success', 'File uploaded successfully', 'success');
            } else {
                Swal.fire('Error', 'No file selected', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error uploading file', 'error');
        }
    };
    
    const handleDelete = async () => {
        try {
            await axios.post(`${URL}/DeleteTable`, null ,{
                headers: {
                     'Authorization': `Bearer ${token}`, 
                },withCredentials: true,});

            GetDataFromApi();
            Swal.fire('Success', 'File deleted successfully', 'success');
        } catch (error) {
            Swal.fire('Error', 'Error deleting file' , 'error');
        }
        
    };
  
    console.log("Token" , token)
    const SelectTable = () => {
        if (dataExamTable.length !== 0) {
            return selectedOption === 'examTable' ? 
                <ExamTable data={dataExamTable} /> : 
                <RoomExam data={roomExamData} />;
        } else {
            return <h1 className="text-center text-gray-600">ยังไม่มีข้อมูล</h1>;
        }
    };

    const handleChange = (event) => {
        setSelectedOption(event.target.value);
    };

    return (
        <>
            <MinimalNavbar />
            <Container fluid className="importfile-bg">
                <Container className="py-4">
                    <Card className="shadow-lg">
                        <Card.Body>
                            <Card.Title as="h1" className="text-center mb-4">นำข้อมูลเข้าโดย CSV</Card.Title>
                            <Form>
                                <Form.Group as={Col} controlId="file-upload" className="text-center">
                                    <Form.Label className="font-weight-bold">นำข้อมูลเข้าโดยไฟล์</Form.Label>
                                    <Form.Control 
                                        type="file" 
                                        label="Upload a file" 
                                        custom 
                                        onChange={handleFileChange} 
                                        accept=".xlsx"
                                    />
                                    <Form.Text className="text-muted"></Form.Text>
                                </Form.Group>
                                <Row className="mt-4 justify-content-left">
                                    <button type="button" className="btn btn-success" onClick={UploadPopUp} style={{ width: "160px" }}>อัพโหลดไฟล์</button>&nbsp;&nbsp;
                                    <Button variant="danger" onClick={DeletePopUp} style={{ width: "160px" }}>ลบไฟล์</Button>
                                </Row>
                                <Row className="mt-4 justify-content-center">
                                    <Form.Group controlId="dropdown">
                                        <Form.Control as="select" value={selectedOption} onChange={handleChange}>
                                            <option value="examTable">ตารางสอบ</option>
                                            <option value="roomExam">ห้องสอบ</option>
                                        </Form.Control>
                                    </Form.Group>
                                </Row>
                                <Row className="mt-4">
                                    {SelectTable()}
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </Container>
            </Container>
        </>
    );
}
