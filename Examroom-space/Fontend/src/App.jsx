import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarMenu from "./Navbar/SidebarMenu";
import Logo from './assets/Icon/su-logo-new-nobg.png';
import "./index.css";
import "./App.css";

function App() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    
    // Check if user exists and has roles
    if (user && user.roles) {
      // Check if user has either "อาจารย์" or "กรรมการคุมสอบ" role
      const isTeacher = user.roles.includes("อาจารย์");
      const isProctor = user.roles.includes("กรรมการคุมสอบ");
      
      // If user has either role, redirect to Home-Teacher
      if (isTeacher || isProctor) {
        navigate("/Home-Teacher");
      }
    }
  }, [navigate]);

  return (
    <>
      <SidebarMenu />
      
      <div
        className="custom-background"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          textAlign: "center",
        }}
      >
        <img src={Logo} style={{ width: "500px" }} alt="SU Logo" />
        <br />
        <h1 className="text-7xl text-black">
          แอปพลิเคชันห้องอำนวยการสอบ
        </h1>
      </div>
    </>
  );
}

export default App;