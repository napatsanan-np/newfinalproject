import { useState } from "react";
import { Container, Form, Button, Image } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";
import SUlogo from "./SU_logo.png";
import './Loginform-styles.css';

function Loginform() {
  const [Name, setName] = useState("");
  const [Password, setPassword] = useState("");
  const navigate = useNavigate();

  // fallback กันค่า API เป็น null
  const API_BASE =
    localStorage.getItem("API") ||
    "https://projectsuperend-production.up.railway.app/api";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!Name || !Password) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณากรอกข้อมูลให้ครบทุกช่อง',
      });
      return;
    }

    getData(Password);
  };

  async function getData(password) {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: Name, password: password }),
      });

      const result = await response.json();
      if (response.ok) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('roles', JSON.stringify(result.user.roles));

        window.User = JSON.parse(localStorage.getItem('user'));
        console.log("Data User:::", window.User);
        navigate('/Home');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ล็อกอินไม่สำเร็จ',
          text: result.error || "Name หรือ Password ไม่ถูกต้อง กรุณาลองอีกครั้ง",
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: 'ข้อผิดพลาดในการเชื่อมต่อ',
      });
    }
  }

  const handleSSOLogin = () => {
    const ssoLoginUrl = `${API_BASE}/sso/login`;
    window.location.href = ssoLoginUrl;
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 p-4">
      <div className="login-form">
        <div className="d-flex justify-content-center">
          <Image src={SUlogo} className="mb-4" width={200} alt="SU Logo" />
        </div>
        <h1 className="text-center mb-4">โปรแกรมห้องข้อสอบ</h1>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="Name" className="mb-3">
            <Form.Label>บัญชีผู้ใช้</Form.Label>
            <Form.Control
              type="text"
              placeholder="ใส่ชื่อบัญชีผู้ใช้"
              value={Name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="รหัสผ่าน" className="mb-3">
            <Form.Label>รหัสผ่าน</Form.Label>
            <Form.Control
              type="password"
              placeholder="ใส่รหัสผ่านของคุณ"
              value={Password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>
          <Button id="login_button" type="submit" variant="primary" className="w-100 mb-3">
            ล็อกอิน
          </Button>
          <Button
            variant="outline-secondary"
            className="w-100"
            onClick={handleSSOLogin}
          >
            เข้าสู่ระบบด้วย SSO
          </Button>
        </Form>
      </div>
    </Container>
  );
}

export default Loginform;