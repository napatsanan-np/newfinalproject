import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  FileInput, 
  ClipboardList,
  BarChart3,
  Cog,
  UserCog,
  Upload,
  LayoutGrid,
  Users as UsersGroup,
  FileText,
  Printer,
  Send,
  Copy,
  CalendarCheck,
  BarChart2,
  ClipboardList as ClipboardCheck
} from 'lucide-react';
import './ModernNavbar-styles.css';

const ModernNavbar = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.clear();
    localStorage.removeItem('token');
    window.location.href = "/";
  };

  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const isAdmin = () => hasRole("ผู้ดูแลระบบ");
//ใช้จริงคือ อันนั้น
  const menuItems = {
    'ตั้งค่าระบบ': {
      icon: <Settings size={18} />,
      items: [
        { label: 'ตั้งค่าระบบ', path: '/SystemManagement', icon: <Cog size={16} /> }
      ]
    },
    'จัดการสิทธิ์ผู้ใช้': {
      icon: <Users size={18} />,
      items: [
        { label: 'ให้สิทธิ์กรรมการห้องอำนวยการสอบ', path: '/CommitteeManagement', icon: <UserCog size={16} /> },
        { label: 'การจัดการผู้ใช้', path: '/User/Usermanagement', icon: <UserCog size={16} /> },
        { label: 'การจัดการภาควิชา', path: '/Dept/Deptmanagement', icon: <UserCog size={16} /> }
      ]
    },
    'ก่อนการสอบ': {
      icon: <FileInput size={18} />,
      items: [
        { label: 'นำเข้าไฟล์', path: '/DropFileInput', icon: <Upload size={16} /> },
        { label: 'จัดห้องสอบ', path: '/AutoRoom', icon: <LayoutGrid size={16} /> },
        { label: 'จัดกรรมการ', path: '/ProctorAsigner', icon: <UsersGroup size={16} /> }
      ]
    },
    'การสอบ': {
      icon: <ClipboardList size={18} />,
      items: [
        { label: 'รายละเอียดการส่ง และ คุมการสอบ', path: '/Home-Teacher', icon: <FileText size={16} /> },
        { label: 'ดูรายละเอียดวิชา', path: '/PageSearch', icon: <FileText size={16} /> },
        { label: 'พิมพ์ label', path: '/Label', icon: <Printer size={16} /> },
        { path: "/Backup", label: "สำรองข้อสอบ" , icon : <Copy size={16} />  },
        { label: 'ส่งข้อสอบโดยเจ้าหน้าที่ห้องข้อสอบ', path: '/Pageform', icon: <Send size={16} /> },
        { label: 'ส่งข้อสอบโดยอาจารย์', path: '/PageformroleTeach', icon: <Send size={16} /> }
      ]
    },
    'รายงาน': {
      icon: <BarChart3 size={18} />,
      items: [
        { label: 'รายงานสถิติการใช้กระดาษ', path: '/report', icon: <BarChart2 size={16} /> },
        { label: 'รายงานสถิติการส่งข้อสอบ', path: '/report-stats', icon: <BarChart2 size={16} /> },
        { label: 'รายงานการคุมสอบของกรรมการ', path: '/report-proctor', icon: <ClipboardCheck size={16} /> }
      ]
    }
  };

  const getFilteredMenuItems = () => {
    if (isAdmin()) return menuItems;
    
    const filteredItems = {};
    // เพิ่มตัวแปรเพื่อเก็บรายการเมนูที่ถูกเพิ่มแล้ว
    const addedMenuPaths = new Set();
    
    // ตรวจสอบบทบาทและเพิ่มเมนูที่เกี่ยวข้อง
    if (hasRole("อาจารย์") || hasRole("กรรมการคุมสอบ") || hasRole("กรรมการห้องข้อสอบ")) {
        filteredItems['การสอบ'] = {...menuItems['การสอบ'], items: []};

    }
    
    // เพิ่มรายการเมนูตามบทบาท "อาจารย์"
    if (hasRole("อาจารย์")) {
        // เพิ่มรายการเมนูที่เฉพาะอาจารย์
     
        addMenuItem(filteredItems, addedMenuPaths, 'ส่งข้อสอบโดยอาจารย์', '/PageformroleTeach', Send, 16);
        addMenuItem(filteredItems, addedMenuPaths, 'รายละเอียดการส่ง และ คุมการสอบ', '/Home-Teacher', FileText, 16);
    }
    
    // เพิ่มรายการเมนูตามบทบาท "กรรมการคุมสอบ"
    if (hasRole("กรรมการคุมสอบ")) {
        addMenuItem(filteredItems, addedMenuPaths, 'รายละเอียดการส่ง และ คุมการสอบ', '/Home-Teacher', FileText, 16);
    }
    
    // เพิ่มรายการเมนูตามบทบาท "กรรมการห้องข้อสอบ"
    if (hasRole("กรรมการห้องข้อสอบ")) {
        addMenuItem(filteredItems, addedMenuPaths, 'พิมพ์ label', '/Label', Printer, 16);
        addMenuItem(filteredItems, addedMenuPaths, 'ส่งข้อสอบโดยเจ้าหน้าที่ห้องข้อสอบ', '/Pageform', Send, 16);
        // ไม่ต้องเพิ่ม 'ดูรายละเอียดวิชา' อีกครั้งหากอาจารย์มีแล้ว
        if (!hasRole("อาจารย์")) {
            addMenuItem(filteredItems, addedMenuPaths, 'ดูรายละเอียดวิชา', '/PageSearch', FileText, 16);
        }
    }
    
    return filteredItems;
};

// ฟังก์ชันช่วยสำหรับเพิ่มรายการเมนูโดยไม่ซ้ำกัน
const addMenuItem = (filteredItems, addedMenuPaths, label, path, Icon, size) => {
    // ตรวจสอบว่า path นี้ถูกเพิ่มไปแล้วหรือไม่
    if (!addedMenuPaths.has(path)) {
        filteredItems['การสอบ'].items.push({ 
            label, 
            path, 
            icon: <Icon size={size} /> 
        });
        addedMenuPaths.add(path);
    }
};

  useEffect(() => {
    setActiveDropdown(null);
  }, [location]);

  const filteredMenuItems = getFilteredMenuItems();

  return (
    <>
      <Navbar expand="lg" className="navbar-modern" fixed="top" bg="light">
        <Container>
          <Navbar.Brand as={Link} to="/Home" className="brand-text">
            แอปพลิเคชันห้องข้อสอบ
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-nav" />
          <Navbar.Collapse id="navbar-nav">
            <Nav className="me-auto">
              {Object.entries(filteredMenuItems).map(([title, { icon, items }]) => (
                <Nav.Link
                  key={title}
                  className={`nav-link-custom ${activeDropdown === title ? 'active' : ''}`}
                  onMouseEnter={() => setActiveDropdown(title)}
                  onClick={() => setActiveDropdown(activeDropdown === title ? null : title)}
                >
                  <span className="nav-icon">{icon}</span>
                  {title}
                </Nav.Link>
              ))}
            </Nav>
            <Nav>
              <Nav.Link 
                onClick={handleLogout}
                className="logout-button"
              >
                ออกจากระบบ
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Full-width mega menu */}
      {activeDropdown && (
        <div 
          className="mega-menu"
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className="mega-menu-gradient">
            <Container>
              <div className="mega-menu-content">
                <h3 className="mega-menu-title">
                  {filteredMenuItems[activeDropdown].icon}
                  <span className="ms-2">{activeDropdown}</span>
                </h3>
                <div className="mega-menu-grid">
                  {filteredMenuItems[activeDropdown].items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="mega-menu-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <span className="menu-item-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </Container>
          </div>
        </div>
      )}
    </>
  );
};

export default ModernNavbar;