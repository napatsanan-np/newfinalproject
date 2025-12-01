import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
    BarChart2,
    ClipboardList as ClipboardCheck,
} from "lucide-react";
import "./SidebarMenu.css";

const SidebarMenu = () => {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user"));

    // ===== ฟังก์ชันตรวจสิทธิ์ =====
    const hasRole = (role) => user?.roles?.includes(role);
    const isAdmin = () => hasRole("ผู้ดูแลระบบ");

    // ===== เมนูหลักทั้งหมด (จาก Navbar เดิม) =====
    const menuItems = {
        "ตั้งค่าระบบ": {
            icon: <Settings size={18} />,
            items: [{ label: "ตั้งค่าระบบ", path: "/SystemManagement", icon: <Cog size={16} /> }],
        },
        "จัดการสิทธิ์ผู้ใช้": {
            icon: <Users size={18} />,
            items: [
                { label: "ให้สิทธิ์กรรมการห้องอำนวยการสอบ", path: "/CommitteeManagement", icon: <UserCog size={16} /> },
                { label: "การจัดการผู้ใช้", path: "/User/Usermanagement", icon: <UserCog size={16} /> },
                { label: "การจัดการภาควิชา", path: "/Dept/Deptmanagement", icon: <UserCog size={16} /> },
            ],
        },
        "ก่อนการสอบ": {
            icon: <FileInput size={18} />,
            items: [
                { label: "นำเข้าไฟล์", path: "/DropFileInput", icon: <Upload size={16} /> },
                { label: "จัดห้องสอบ", path: "/AutoRoom", icon: <LayoutGrid size={16} /> },
                { label: "จัดกรรมการ", path: "/ProctorAsigner", icon: <UsersGroup size={16} /> },
                { label: "แก้ไขข้อมูลนำเข้า", path: "/DropFileInput/edit",icon: <FileText size={16} />}
            
            ],
        },
        "การสอบ": {
            icon: <ClipboardList size={18} />,
            items: [
                { label: "รายละเอียดการส่ง และ คุมการสอบ", path: "/Home-Teacher", icon: <FileText size={16} /> },
                { label: "ดูรายละเอียดวิชา", path: "/PageSearch", icon: <FileText size={16} /> },
                { label: "พิมพ์ label", path: "/Label", icon: <Printer size={16} /> },
                { label: "สำรองข้อสอบ", path: "/Backup", icon: <Copy size={16} /> },
                { label: "ส่งข้อสอบโดยเจ้าหน้าที่ห้องข้อสอบ", path: "/Pageform", icon: <Send size={16} /> },
                { label: "ส่งข้อสอบโดยอาจารย์", path: "/PageformroleTeach", icon: <Send size={16} /> },
            ],
        },
        "รายงาน": {
            icon: <BarChart3 size={18} />,
            items: [
                { label: "รายงานสถิติการใช้กระดาษ", path: "/report", icon: <BarChart2 size={16} /> },
                { label: "รายงานสถิติการส่งข้อสอบ", path: "/report-stats", icon: <BarChart2 size={16} /> },
                { label: "รายงานการคุมสอบของกรรมการ", path: "/report-proctor", icon: <ClipboardCheck size={16} /> },
            ],
        },
    };

    // ===== ฟิลเตอร์เมนูตามสิทธิ์ =====
    const getFilteredMenuItems = () => {
        if (isAdmin()) return menuItems;

        const filtered = {};
        const added = new Set();

        if (hasRole("อาจารย์") || hasRole("กรรมการคุมสอบ") || hasRole("กรรมการห้องข้อสอบ"))
            filtered["การสอบ"] = { ...menuItems["การสอบ"], items: [] };

        const add = (label, path, icon) => {
            if (!added.has(path)) {
                filtered["การสอบ"].items.push({ label, path, icon });
                added.add(path);
            }
        };

        if (hasRole("อาจารย์")) {
            add("ส่งข้อสอบโดยอาจารย์", "/PageformroleTeach", <Send size={16} />);
            add("รายละเอียดการส่ง และ คุมการสอบ", "/Home-Teacher", <FileText size={16} />);
        }

        if (hasRole("กรรมการคุมสอบ"))
            add("รายละเอียดการส่ง และ คุมการสอบ", "/Home-Teacher", <FileText size={16} />);

        if (hasRole("กรรมการห้องข้อสอบ")) {
            add("พิมพ์ label", "/Label", <Printer size={16} />);
            add("ส่งข้อสอบโดยเจ้าหน้าที่ห้องข้อสอบ", "/Pageform", <Send size={16} />);
            if (!hasRole("อาจารย์"))
                add("ดูรายละเอียดวิชา", "/PageSearch", <FileText size={16} />);
        }

        return filtered;
    };

    const filteredMenu = getFilteredMenuItems();

    // ปิด sidebar เมื่อเปลี่ยนหน้า
    useEffect(() => setOpen(false), [location.pathname]);

    return (
        <>
            {/* ปุ่ม Hamburger */}
            <button className={`sb-hamburger ${open ? "active" : ""}`} onClick={() => setOpen((v) => !v)}>
                <span></span>
                <span></span>
                <span></span>
            </button>

            {open && <div className="sb-overlay" onClick={() => setOpen(false)} />}

            <aside className={`sb-sidebar ${open ? "open" : ""}`}>
                <div className="sb-header">
                    <Link
                        to="/Home"
                        onClick={() => setOpen(false)}
                        className="sb-home-link"
                    >
                        📚 แอปพลิเคชันห้องข้อสอบ
                    </Link>
                </div>

                <nav className="sb-nav">
                    {Object.entries(filteredMenu).map(([group, { icon, items }]) => (
                        <div key={group} className="sb-section">
                            <div className="sb-section-title">
                                {icon} <span>{group}</span>
                            </div>
                            {items.map((item) => (
                                <Link key={item.path} to={item.path} className="sb-link" onClick={() => setOpen(false)}>
                                    {item.icon} <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sb-footer">
                    <button
                        className="sb-logout"
                        onClick={() => {
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.href = "/";
                        }}
                    >
                        🚪 ออกจากระบบ
                    </button>
                </div>
            </aside>
        </>
    );
};

export default SidebarMenu;
