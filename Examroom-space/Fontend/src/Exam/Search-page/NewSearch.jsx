import { useState, useEffect } from "react";
import Select from "react-select";
import { Container, Button, Table, Nav, Card } from "react-bootstrap";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
/** สรุปสถานะการส่งข้อสอบจาก item ที่ join มา */
function getSubmitStatus(item) {
  // กรณีไม่มีแถวใน detail_exam เลย → ถือว่า “ไม่มีข้อสอบ”
  if (!item || !item.detail_exam) return "ไม่มีข้อสอบ";

  const s = (item.detail_exam.submit || "").trim();
  if (s === "ส่งแล้ว" || s === "รอการยืนยัน" || s === "ยังไม่ส่ง") return s;

  // ถ้าไม่มีค่า/ไม่ใช่สามสถานะที่รู้จัก → จัดเป็น “ไม่มีข้อสอบ”
  return "ไม่มีข้อสอบ";
}

const Search = () => {
  const url = window.API_URL;
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("course");
  const [RoomData, setRoomData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function read_data_ExamRoom() {
      try {
        const response = await fetch(
          localStorage.getItem("API") + "/DataRoomexamExamdetail",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const dataDetail = await response.json();
        if (Array.isArray(dataDetail) && dataDetail.length > 0) {
          setRoomData(dataDetail);
        } else {
          setError("ไม่พบข้อมูลห้องสอบ");
        }
      } catch (error) {
        console.error("Error fetching RoomExam data:", error);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง");
      }
    }
    read_data_ExamRoom();
  }, [token, url]);

  const handleSearch = (results) => {
    setSearchResults(results);
    setShowTable(true);
  };

  const handleSearchReset = () => {
    setSearchResults([]);
    setShowTable(false);
  };

  const renderSearchComponent = () => {
    switch (activeTab) {
      case "course":
        return (
          <CourseSearch
            data={RoomData}
            onSearch={handleSearch}
            onReset={handleSearchReset}
          />
        );
      case "date":
        return (
          <DateSearch
            data={RoomData}
            onSearch={handleSearch}
            onReset={handleSearchReset}
          />
        );
      case "room":
        return (
          <RoomSearch
            data={RoomData}
            onSearch={handleSearch}
            onReset={handleSearchReset}
          />
        );
      case "submit":
        return (
          <SubmitSearch
            data={RoomData}
            onSearch={handleSearch}
            onReset={handleSearchReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container>
          <Card className="shadow">
            <Card.Header>
              <Nav variant="tabs">
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "course"}
                    onClick={() => setActiveTab("course")}
                  >
                    ค้นหาด้วยวิชา
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "date"}
                    onClick={() => setActiveTab("date")}
                  >
                    ค้นหาด้วยวันที่
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "room"}
                    onClick={() => setActiveTab("room")}
                  >
                    ค้นหาด้วยห้องสอบ
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "submit"}
                    onClick={() => setActiveTab("submit")}
                  >
                    ค้นหาด้วยสถานะการส่งข้อสอบ
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body>
              {error ? (
                <p className="text-danger">{error}</p>
              ) : (
                <>
                  {renderSearchComponent()}

                  {showTable && searchResults.length > 0 && (
                    <SearchResultsTable results={searchResults} />
                  )}

                  {showTable && searchResults.length === 0 && (
                    <p className="mt-4">ไม่พบผลลัพธ์สำหรับเกณฑ์ที่เลือก</p>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};

const CourseSearch = ({ data, onSearch, onReset }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleSearch = () => {
    if (selectedCourse) {
      const filtered = data.filter(
        (item) => item.roomexam.Ref === selectedCourse.roomexam.Ref
      );
      onSearch(filtered);
    }
  };

  return (
    <>
      <h3 className="mt-4 mb-3">ค้นหาด้วยวิชา</h3>
      <Select
        options={data.map((item) => ({
          label: item.roomexam.Course || "ไม่ระบุ",
          value: item.roomexam.Course,
          ...item,
        }))}
        onChange={setSelectedCourse}
        value={selectedCourse}
        noOptionsMessage={() => "ไม่พบข้อมูลวิชา"}
      />
      <div className="mt-3 d-flex">
        <Button
          onClick={handleSearch}
          disabled={!selectedCourse}
          className="me-2"
        >
          ค้นหา
        </Button>
        <Button onClick={onReset} variant="secondary">
          รีเซ็ท
        </Button>
      </div>
    </>
  );
};

const DateSearch = ({ data, onSearch, onReset }) => {
  const [selectedDate, setSelectedDate] = useState(null);

  const handleSearch = () => {
    if (selectedDate) {
      const filtered = data.filter(
        (item) => item.roomexam.Edate === selectedDate.value
      );
      onSearch(filtered);
    }
  };

  const getUniqueDates = (data) => {
    const uniqueDates = [...new Set(data.map((item) => item.roomexam.Edate))];
    return uniqueDates.map((date) => ({
      label: date || "ไม่ระบุ",
      value: date,
    }));
  };

  return (
    <>
      <h3 className="mt-4 mb-3">ค้นหาด้วยวันที่</h3>
      <Select
        options={getUniqueDates(data)}
        onChange={setSelectedDate}
        value={selectedDate}
        noOptionsMessage={() => "ไม่พบข้อมูลวันที่"}
      />
      <div className="mt-3 d-flex">
        <Button
          onClick={handleSearch}
          disabled={!selectedDate}
          className="me-2"
        >
          ค้นหา
        </Button>
        <Button onClick={onReset} variant="secondary">
          รีเซ็ท
        </Button>
      </div>
    </>
  );
};

const RoomSearch = ({ data, onSearch, onReset }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleSearch = () => {
    if (selectedRoom) {
      const filtered = data.filter(
        (item) => item.rooms.room_name === selectedRoom.value
      );
      onSearch(filtered);
    }
  };

  const getUniqueRooms = (data) => {
    const uniqueRooms = [...new Set(data.map((item) => item.rooms.room_name))];
    return uniqueRooms.map((room) => ({
      label: room || "ไม่ระบุ",
      value: room,
    }));
  };

  return (
    <>
      <h3 className="mt-4 mb-3">ค้นหาด้วยห้องสอบ</h3>
      <Select
        options={getUniqueRooms(data)}
        onChange={setSelectedRoom}
        value={selectedRoom}
        noOptionsMessage={() => "ไม่พบข้อมูลห้องสอบ"}
      />
      <div className="mt-3 d-flex">
        <Button
          onClick={handleSearch}
          disabled={!selectedRoom}
          className="me-2"
        >
          ค้นหา
        </Button>
        <Button onClick={onReset} variant="secondary">
          รีเซ็ท
        </Button>
      </div>
    </>
  );
};

const SubmitSearch = ({ data, onSearch, onReset }) => {
  const [selectedSubmit, setSelectedSubmit] = useState(null);

  const handleSearch = () => {
    if (selectedSubmit !== null) {
      const filtered = data.filter((item) => {
        const status = getSubmitStatus(item);
        return status === selectedSubmit.value;
      });
      onSearch(filtered);
    }
  };

  return (
    <>
      <h3 className="mt-4 mb-3">ค้นหาด้วยสถานะการส่งข้อสอบ</h3>
      <Select
        options={[
          { label: "ส่งแล้ว", value: "ส่งแล้ว" },
          { label: "รอการยืนยัน", value: "รอการยืนยัน" },
          { label: "ยังไม่ส่ง", value: "ยังไม่ส่ง" },
          { label: "มีสอบแต่ไม่มีข้อสอบ", value: "ไม่มีข้อสอบ" }, // ✅ เพิ่มตัวเลือกนี้
        ]}
        onChange={setSelectedSubmit}
        value={selectedSubmit}
        noOptionsMessage={() => "ไม่พบข้อมูลสถานะการส่งข้อสอบ"}
      />
      <div className="mt-3 d-flex">
        <Button
          onClick={handleSearch}
          disabled={selectedSubmit === null}
          className="me-2"
        >
          ค้นหา
        </Button>
        <Button onClick={onReset} variant="secondary">
          รีเซ็ท
        </Button>
      </div>
    </>
  );
};

const SearchResultsTable = ({ results }) => (
  <div className="exam-search">
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>ชื่อวิชา</th>
          <th>ห้องสอบ</th>
          <th>วันสอบ</th>
          <th>เวลาสอบ</th>
          <th>จำนวนชั่วโมง</th>
          <th>จำนวนนักศึกษา</th>
          <th>อาจาร์ยผู้สอน</th>
          <th>สถานะการส่งข้อสอบ</th>
        </tr>
      </thead>
      <tbody>
        {results.length > 0 ? (
          results.map((item) => {
            const status = getSubmitStatus(item);
            return (
              <tr key={item.roomexam.No}>
                <td>{item.roomexam.No}</td>
                <td>{item.roomexam.Course}</td>
                <td>{item.rooms.room_name}</td>
                <td>{item.roomexam.Edate}</td>
                <td style={{ width: "130px" }}>{item.roomexam.Etime}</td>
                <td>{item.roomexam.Hr}</td>
                <td>{item.roomexam.Num_st}</td>
                <td>{item.roomexam.Lecturer}</td>
                <td>{status}</td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="9" className="text-center">
              ไม่พบข้อมูล
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default Search;
