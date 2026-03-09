import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import DetailExamForm from "./Exam/SentForm/NewForm.jsx";
import Search from "./Exam/Search-page/NewSearch.jsx";
import Login from "./User-Management/Login/Loginform.jsx";
import Alluser from "./User-Management/AllUsermangement/Alluser.jsx";
import Dept from "./User-Management/Depmanagement/dept.jsx";
import ProtectRoutes from "./utils/ProtectedRoutes";
import App from "./App.jsx";
import "./index.css";
import Label from "./Exam/Labels/Label.jsx";
import Backup from "./Exam/backup/backup.jsx";
import DropFileInput from "./Pre-Exam/ImportFile/DropFileInput.jsx";
import AutoExam from "./Pre-Exam/AutoRoomExam/AutoRoom.jsx";
import AllExamroom from "./Pre-Exam/AutoRoomExam/Examroom.jsx";
import Sentform_roleteacher from "./Exam/SentForm/SentForm_roleteacher.jsx";
import ProctorAsigner from "./Pre-Exam/Proctor/ProctorAsigner.jsx"; // แก้ไข path
import SystemManagement from "./System-Management/SystemManagementModule/Configexam.jsx";
import CommitteeManagement from "./User-Management/ProctorExam/ProctorExamination.jsx";
import TimeSettingsModal from "./System-Management/SystemManagementModule/TimeSettingsModal.jsx";
import Report from "./Report/Report.jsx";
import Examstat from "./Report/Examstat.jsx";
import ProctorReport from "./Report/ProctorReport.jsx";
import HomeTeacher from "./Exam/SentForm/HomeTeacher.jsx";
import AuthCallback from "../Auth.jsx";
import ActivityLogs from "./Report/ActivityLogs.jsx";

const isAuthenticated = () => !!localStorage.getItem("token");


// localStorage.setItem('API', "http://localhost:8080/api")
// window.User = JSON.parse(localStorage.getItem('user'));
// console.log(localStorage.getItem('API'));


const DEFAULT_API = "https://projectsuperend-production.up.railway.app/api";


if (!localStorage.getItem("API")) {
  localStorage.setItem("API", DEFAULT_API);
}

window.User = JSON.parse(localStorage.getItem('user'));
console.log("API:", localStorage.getItem('API'));

/**localStorage.setItem('API', "https://exam.sc.su.ac.th/api")  
window.User = JSON.parse(localStorage.getItem('user'));
console.log(localStorage.getItem('API'));**/

//console.log("User:: " ,window.User.full_name);
//Backup

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/SystemManagement",
    element: <SystemManagement />,
  },
  {
    path: "/TimeSettingsModal",
    element: <TimeSettingsModal />,
  },
  {
    path: "/User/Usermanagement",
    element: <Alluser />,
  },
  {
    path: "/Dept/Deptmanagement",
    element: <Dept />,
  },
  {
    path: "/Backup",
    element: <ProtectRoutes element={<Backup />} />,
  },
  {
    path: "/Label",
    element: <ProtectRoutes element={<Label />} />,
  },
  {
    path: "/CommitteeManagement",
    element: <CommitteeManagement />,
  },

  {
    path: "/AutoRoom",
    element: <ProtectRoutes element={<AutoExam />} />,
  },
  {
    path: "/add-exam-room",
    element: <ProtectRoutes element={<AllExamroom />} />,
  },
  {
    path: "/DropFileInput",
    element: <ProtectRoutes element={<DropFileInput />} />,
  },
  {
    path: "/DropFileInput/edit",
    element: <ProtectRoutes element={<DropFileInput />} />,
  },
  {
    path: "/ProctorAsigner",
    element: <ProtectRoutes element={<ProctorAsigner />} />,
  },
  {
    path: "/Pageform",
    element: <ProtectRoutes element={<DetailExamForm />} />,
  },
  {
    path: "/PageSearch",
    element: <ProtectRoutes element={<Search />} />,
  },
  {
    path: "/PageformroleTeach",
    element: <ProtectRoutes element={<Sentform_roleteacher />} />,
  },
  {
    path: "/Home",
    element: <ProtectRoutes element={<App />} />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    path: "/report",
    element: <ProtectRoutes element={<Report />} />,
  },
  {
    path: "/report-stats",
    element: <ProtectRoutes element={<Examstat />} />,
  },
  {
    path: "/report-proctor",
    element: <ProtectRoutes element={<ProctorReport />} />,
  },
  {
    path: "/Home-Teacher",
    element: <ProtectRoutes element={<HomeTeacher />} />,
  },
  {
    path: "/report/activity-logs",
    element: <ProtectRoutes element={<ActivityLogs />} />,
  },
]);

window.addEventListener("unload", () => {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = decodedToken.exp * 1000;

      if (Date.now() > expiryTime) {
        localStorage.removeItem("token");
        window.location.reload();
      }
    } catch (e) {
      console.error("Error decoding token", e);
    }
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
