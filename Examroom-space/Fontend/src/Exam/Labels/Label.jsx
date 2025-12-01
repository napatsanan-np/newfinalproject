import { useState, useEffect } from "react";
import Select from "react-select";
import { Container, Button, Table, Nav, Card } from "react-bootstrap";
import Signature from "./signature-sheet";
import Labeltime from "./Lable-time";
import Labelspecial from "./Label-special.jsx"
import LabelStudent from "./Label-STUDENT.jsx"
import Labeldefault from "./Label-default.jsx"
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

const Search = () => {
  const [activeTab, setActiveTab] = useState('Labeltime');
  const renderSearchComponent = () => {
    switch(activeTab) {
      case 'Labeltime':
        return <Labeltime  />;
      case 'Labeldefault':
        return <Labeldefault/>;
      case 'Sig':
        return <Signature/>;
      case 'Labelspecial':
        return <Labelspecial />;
        case 'LabelStudent':
          return <LabelStudent />;
      default:
        return null;
    }
  };
  return (
    <>
      <SidebarMenu/>
      <div className="custom-background">
        <Container>
          <Card className="shadow">
            <Card.Header>
              <Nav variant="tabs">
                <Nav.Item>
                  <Nav.Link active={activeTab === 'Labeltime'} onClick={() => setActiveTab('Labeltime')}>
                  ซองข้อสอบช่วงเวลาการสอบ
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link active={activeTab === 'Labeldefault'} onClick={() => setActiveTab('Labeldefault')}>
                  ซองที่แสดงรหัสวิชา
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link active={activeTab === 'Sig'} onClick={() => setActiveTab('Sig')}>
                  สำหรับใบรับ-ส่งข้อสอบ
                  </Nav.Link>
                </Nav.Item>
                <Nav.Link active={activeTab === 'LabelStudent'} onClick={() => setActiveTab('LabelStudent')}>
                  ใบเซ็นชื่อนักศึกษา
                  </Nav.Link>
                
              </Nav>
            </Card.Header>
            <Card.Body>
              {renderSearchComponent()}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};


  

export default Search;