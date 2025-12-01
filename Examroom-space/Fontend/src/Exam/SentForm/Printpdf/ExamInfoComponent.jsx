import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Button, Table, Card, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import calculateTotals from './total'
function Examform({ data }) {
  const componentRef = useRef();
  const token = localStorage.getItem("token");
  const URL = window.API_URL;
  const [roomExam, setRoomExam] = useState([]);
  const [examTables, setExamTables] = useState([]);
  const [examDetails, setExamDetails] = useState([]);
  const [groupExam, setGroupExam] = useState({});
  const [roomsData, setroomsData] = useState([]);
    const [Pers, setPer] = useState(0);
  
  const getRoomName = (roomId) => {
    const room = roomsData.find(r => r.room_id === roomId);
    return room ? room.room_name : 'ไม่พบข้อมูลห้อง';
};
// Example usage:
// ตรวจสอบค่า data.copy และแปลงเป็นตัวเลข
console.log("data.copy::::", parseInt(data.copy) || 1);
const col = parseInt(data.copy) || 1; // เพิ่ม default value เป็น 1 ถ้าแปลงค่าไม่สำเร็จ

// เรียกใช้ฟังก์ชัน calculateTotals
console.log("PERs" , Pers)
const result = calculateTotals({
  DataxamInnerjoinRoomExam: roomExam,
  Col: col,
  DataDetailExam: col, // ควรส่ง examDetails object ไม่ใช่ col
  backup_exam: Pers // Renamed: Use backup_exam instead of Per to match updated function

});
console.log("examSummary---------------::::" , result.roomDetails)
function combineRoomExamData(roomExamData) {
  // Group the data by Room_id
  const groupedByRoom = {};
  
  roomExamData.forEach(item => {
    const roomId = item.roomexam.Room_id;
    
    if (!groupedByRoom[roomId]) {
      // First encounter of this room_id
      groupedByRoom[roomId] = {
        roomexam: {
          ...item.roomexam,
          // Keep the original course name, don't combine
          Courses: [item.roomexam.Course], // Store all courses in a separate array for reference
          No: [item.roomexam.No],
          Num_st: parseInt(item.roomexam.Num_st) || 0
        },
        rooms: item.rooms
      };
    } else {
      // For subsequent encounters of the same room_id
      groupedByRoom[roomId].roomexam.Courses.push(item.roomexam.Course); // Add to courses array
      groupedByRoom[roomId].roomexam.No.push(item.roomexam.No);
      groupedByRoom[roomId].roomexam.Num_st += parseInt(item.roomexam.Num_st) || 0;
    }
  });
  
  // Convert grouped data to array
  return Object.values(groupedByRoom).map(item => {
    return {
      roomexam: {
        ...item.roomexam,
        // Keep the original course name (first course in the room)
        // Store all No values as a comma-separated string
       // Seatrow: item.roomexam.Seatrow.join(', ')
      },
      rooms: item.rooms
    };
  });
}


  useEffect(() => {
    async function GetData() {
      const [res1, res2, res3 ,res4 , res5] = await Promise.all([
        fetch(localStorage.getItem("API")   + "/select_data/detail_exam/" + data.Ref, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(localStorage.getItem("API")   + "/select_data/examtable/" + data.Ref, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(localStorage.getItem("API")   + "/Getroomexamwithref/" + data.Ref, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(localStorage.getItem("API")  +  "/select_data/rooms" , {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(localStorage.getItem("API")  +  "/select_data/exam_config" , {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      const [data1, data2, data3 , data4 , data5] = await Promise.all([
        res1.json(),
        res2.json(),
        res3.json(),
        res4.json(),
        res5.json(),
      ]);

             
        // Find the entry where status is true and use its backup_exam value
        const activeConfig = data5 && Array.isArray(data5) 
          ? data5.find(config => config.status === true) 
          : null;
        
        console.log("activeConfig1" , activeConfig)
        // Use backup_exam from active config or default to 4% if not available

   

        console.log("backupPercentage1" , activeConfig.backup_exam , activeConfig.academic_year , activeConfig.semester)
        console.log("persss" , activeConfig.backup_exam / 100 || 3 / 100)
        setPer(activeConfig.backup_exam / 100 || 3 / 100);

      const mergedData = { ...data2[0], ...data1[0] };
      setExamDetails(mergedData);
      setExamTables(data2);

      const combinedRoomExam = combineRoomExamData(data3 || []);
      setRoomExam(combinedRoomExam);
      setroomsData(data4);
      console.log("REF ::" , data.Ref)
      
    }
    GetData();
  }, [data, token]);

  const calculateSummary = () => {
    const copyCount = parseInt(data.copy) || 1;
    
    const calculateDistribution = () => {
        const totalStudents = roomExam.reduce((sum, room) => sum + parseInt(room.Num_st), 0);
        const basePerCopy = Math.floor(totalStudents / copyCount);
        const remainder = totalStudents % copyCount;
        
        // สร้างอาเรย์การกระจายจำนวนนักศึกษา
        return Array(copyCount).fill().map((_, index) => ({
          students: basePerCopy + (index < remainder ? 1 : 0),
          spare: Math.max(1, Math.floor((basePerCopy + (index < remainder ? 1 : 0)) * 0.03))
      }));
      
    };

    const distribution = calculateDistribution();
    
    // สร้างอาเรย์ข้อมูลสรุปสำหรับแต่ละชุด
    const summaryArray = distribution.map(data => ({
        students: data.students,
        spare: data.spare,
        total: data.students + data.spare
    }));

    console.log("Distribution ::", summaryArray);
    return summaryArray;
};
const renderSummaryBox = () => {
  const boxStyle = {
    border: "1px solid navy",
    borderCollapse: "collapse",
    width: "210px",
    tableLayout: "fixed",
    marginBottom: "10px",
  };

  const cellStyle = {
    border: "1px solid navy",
    padding: "4px 0",
    textAlign: "center",
    width: "70px",
    fontSize: "14px",
  };

  const labelContainerStyle = {
    display: 'flex',
    width: '210px',
    justifyContent: 'space-between',
    marginTop: '2px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'navy',
  };

  const labelCellStyle = {
    width: '70px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
  };

  const setNumberStyle = {
    marginBottom: '2px',
    fontSize: '20px',
    color: 'red',
    fontWeight: 'bold',
  };

  // Handling pairs
  const pairs = [];
  console.log("col in func ", col === 2);
  if (col === 2) {
    return (
      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
        {/* First set */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={setNumberStyle}> ชุดที่ 1 </div>
          <div>
            <table style={boxStyle}>
              <tbody>
                <tr>
                <td style={cellStyle}>{result.exams[0]}</td>
              <td style={cellStyle}>{result.backups[0]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[0] + result.backups[0]}</td> 
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Second set */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={setNumberStyle}> ชุดที่ 2 </div>
          <div>
            <table style={boxStyle}>
              <tbody>
                <tr>
                <td style={cellStyle}>{result.exams[1]}</td>
              <td style={cellStyle}>{result.backups[1]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[1] + result.backups[1]}</td> 
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } else if (col === 4) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '15px' }}>
        {/* First Row with ชุดที่ 1 and ชุดที่ 2 */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={setNumberStyle}> ชุดที่ 1 </div>
            <div>
              <table style={boxStyle}>
                <tbody>
                  <tr>
                  <td style={cellStyle}>{result.exams[0]}</td>
              <td style={cellStyle}>{result.backups[0]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[0] + result.backups[0]}</td> 
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={setNumberStyle}> ชุดที่ 2 </div>
            <div>
              <table style={boxStyle}>
                <tbody>
                  <tr>
                  <td style={cellStyle}>{result.exams[1]}</td>
              <td style={cellStyle}>{result.backups[1]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[1] + result.backups[1]}</td> 
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Second Row with ชุดที่ 3 and ชุดที่ 4 */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={setNumberStyle}> ชุดที่ 3 </div>
            <div>
              <table style={boxStyle}>
                <tbody>
                  <tr>
                  <td style={cellStyle}>{result.exams[2]}</td>
              <td style={cellStyle}>{result.backups[2]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[2] + result.backups[3]}</td> 
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={setNumberStyle}> ชุดที่ 4 </div>
            <div>
              <table style={boxStyle}>
                <tbody>
                  <tr>
                  <td style={cellStyle}>{result.exams[3]}</td>
              <td style={cellStyle}>{result.backups[3]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[3] + result.backups[3]}</td> 
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  else { 
    return(
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={setNumberStyle}> ชุดที่ 1 </div>
      <div>
        <table style={boxStyle}>
          <tbody>
            <tr>
              <td style={cellStyle}>{result.exams[0]}</td>
              <td style={cellStyle}>{result.backups[0]}</td> {/* Example static value */}
              <td style={cellStyle}>{result.exams[0] + result.backups[0]}</td> 
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ) }
};

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "แบบฟอร์มข้อสอบต้นฉบับ",
    pageStyle:  `
    @page {
      size: A4;
      margin: 10mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-size: 16pt;
      }
      .page-break {
        page-break-before: always;
      }
      .print-content {
        display: block !important;
      }
      .pdfprint {
        font-size: 16pt !important;
      }
      .headerprintpdf {
        font-size: 20pt !important;
      }
   
      .exam-summary-table {
        width: 33% !important;
        margin-bottom: 10px !important;
        font-size: 14pt !important;
      }
    }
  `,
  });

  const renderTables = (roomExams) => {
    // Group rooms and calculate maximum student count
    const groupedRooms = roomExams.reduce((acc, curr) => {
      const roomName = curr.roomName;
      const backup = curr.backupExams;
      
      if (!acc[roomName]) {
        acc[roomName] = {
          totalStudents: 0,
          rooms: [],
          backup: backup  // เพิ่ม backup ในการสร้าง object ใหม่
        };
      }
      
      // Ensure we're adding integers
      acc[roomName].totalStudents += Math.round(curr.numStudents);
      acc[roomName].rooms.push({
        ...curr,
        Num_st: Math.round(curr.numStudents)
      });
      
      // อัพเดท backup ถ้ามีการส่งค่ามา
      if (backup !== undefined) {
        acc[roomName].backup = backup;
      }
      
      return acc;
  }, {});
  
    // Find maximum student count across all rooms
    const maxStudents = Math.max(
      ...Object.values(groupedRooms).map(room => room.totalStudents)
    );
  
    // Calculate equal backup amount based on maximum student count
    const equalBackup = Math.ceil(maxStudents * 0.03);
  
    const styleTable = {
      border: "1px solid navy",
      margin: "20px auto",
      borderCollapse: "collapse",
    };
  
    const styleThTd = {
      border: "1px solid navy",
      width: "10%",
      textAlign: "center",
    };
    console.log("roomExams" , roomExams)
    return (
      <table style={styleTable}>
        <thead>
          <tr>
           
            <th style={styleThTd}>ห้องสอบ</th> 
            <th style={styleThTd}>จำนวนนักศึกษารวม</th>
            <th style={styleThTd}>ข้อสอบสำรอง</th>
            <th style={styleThTd}>รายละเอียดแถว</th>
          </tr>
        </thead>
        <tbody>
          {roomExams.map((room , index ) => (
            <tr key={index}>
              <td style={styleThTd}>{room.roomName}</td>
              <td style={styleThTd}>{room.numStudents}</td>
              <td style={styleThTd}>   {room.backupExams.reduce((sum, current) => sum + current, 0)}</td>
              <td style={styleThTd}>
                {room.seatRow}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
console.log("roomExam" , roomExam)
  return (
    <div className="App">
      <Button
        className="no-print"
        onClick={handlePrint}
        variant="primary"
        style={{ width: "290px" }}
      >
        พิมพ์แบบฟอร์มข้อสอบต้นฉบับ
      </Button>
      <div className="print-content" style={{ display: "none" }}>
        <Card
          ref={componentRef}
          className="print-section mt-2 p-2"
          style={{ width: "210mm", margin: "0 auto" }}
        >  
          <Card.Body style={{ color: 'navy' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '20px' }}>
              {renderSummaryBox()}
            </div>
            <div className="exam-info-row d-flex justify-content-between mb-2">
              <p className="pdfprint">
                ทำข้อสอบสี :{" "}
                <span style={{ color: "red" }}>{data.color || ""}</span>
              </p>
              <p className="pdfprint">
                ลำดับ :{" "}
                <span style={{ color: "red" , fontSize : '32px' }}>{data.Ref || ""}</span>
              </p>
            </div>
            <hr />
            <p className="pdfprint mb-1">
              วิชา:{" "}
              <span style={{ color: "red" }}>{examDetails.Course || ""}</span>
            </p>
            <div className="exam-time-row d-flex justify-content-between mb-2">
              <p className="pdfprint">
                วันสอบ :{" "}
                <span style={{ color: "red" }}>{examDetails.Edate || ""}</span>
              </p>
              <p className="pdfprint">
                เวลา :{" "}
                <span style={{ color: "red" }}>{examDetails.Etime || ""}</span>
              </p>
              <p className="pdfprint">
                จำนวน :{" "}
                <span style={{ color: "red" }}>{examDetails.Hr || ""}</span>{" "}
                ชั่วโมง
              </p>
            </div>
            <hr />
            <div className="exam-time-row d-flex justify-content-between mb-2">
              <h2 className="headerprintpdf">***รายละเอียดข้อสอบ***</h2>
              <p className="pdfprint">
                ข้อสอบมี:{" "}
                <span style={{ color: "red" }}>{data.copy || 1}</span>{" "}
                ชุด
              </p>
            </div>
            <p className="pdfprint mb-1">
              จำนวนข้อสอบ :{" "}
              <span style={{ color: "red" }}>{data.page || ""}</span>{" "}
              หน้า{" "}
              <span style={{ color: "red" }}>
                {data.staple_apart || ""}
              </span>
            </p>
            <div className="exam-time-row d-flex justify-content-between mb-2">
              <p className="pdfprint">
                การเย็บข้อสอบ :{" "}
                <span style={{ color: "red" }}>
                  {data.staple_conner || "-"}
                </span>
              </p>
              <p className="pdfprint">
                เครื่องคำนวณ :{" "}
                <span style={{ color: "red" }}>
                  {data.calculator || "0"}
                </span>
              </p>
            </div>
            <div className="exam-time-row d-flex justify-content-between mb-2">
              <p className="pdfprint">
                กระดาษคำตอบ :{" "}
                <span style={{ color: "red" }}>
                  {data.answesheet || "ไม่ใช้"}
                </span>
              </p>
              <p className="pdfprint">
                สมุดคนละ :{" "}
                <span style={{ color: "red" }}>
                  {data.answerbook_use || "0"}
                </span>{" "}
                เล่ม
              </p>
            </div>


            <div className="exam-time-row d-flex justify-content-between mb-2">
              <p className="pdfprint">
                จำนวนนักศึกษา :{" "}
                <span style={{ color: "red" }}>
                  {data.NoSt || ""}
                </span>
              </p>
              <p className="pdfprint">
                หมายเหตุ :{" "}
                <span style={{ color: "red" }}>
                  {data.remark || "ไม่มี"}
                </span>{" "}
                
              </p>
            </div>
            <div style={{ lineHeight: "1" }}>
            <div style={{display:'flex'}}>
              
 <div>
   <p className="pdfprint" style={{ textAlign: "left", margin: "0" }}>ลงชื่อ............................................กรรมการออกข้อสอบ</p>
   <p className="pdfprint" style={{ margin: "0", textAlign: "center", width: "100%" }}>
     ({" "}
     <span style={{ color: "red" }}>
       {data.Lecturer || "--"}
     </span>{" "}
     )
   </p>
 </div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
 
 <p style={{ margin: "0" }}>โทรศัพท์มือถือที่ติดต่อได้...................................</p>
</div>

</div>
         

            <hr />
            <div>
              <h2 className="headerprintpdf">***จำนวนข้อสอบในแต่ละห้อง***</h2>
            </div>
            <div className="table-container">{renderTables(result.roomDetails)}</div>
            <div className="d-flex flex-column mt-3">
              <div className="mb-1">
                <input type="checkbox" id="checkbox1" />
                <label htmlFor="checkbox1" className="ms-2">
                  ผู้รับข้อสอบ.................................................
                </label>
              </div>
              <div className="mb-1">
                <input type="checkbox" id="checkbox2" />
                <label htmlFor="checkbox2" className="ms-2">
                  สำเนา/copy Print โดย......................................
                </label>
              </div>
              <div className="mb-1">
                <input type="checkbox" id="checkbox3" />
                <label htmlFor="checkbox3" className="ms-2">
                  บรรจุซอง โดย...............................................
                  จำนวน........ซอง
                </label>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default Examform;