import React, { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Altexamcalform-styles.css";
import calculateTotals, { calculateSpecialRoom, calculateRegularRoom } from "./total"; // Import the calculation functions

function Altexamcalform({ data }) {
  const token = localStorage.getItem("token");
  const componentRef = useRef();
  const [DataRoomExam, SetDataRoomExam] = useState([]);
  const [DataDetailExam, SetExamDetails] = useState([]);
  const [DataxamInnerjoinRoomExam, SetlExamInnerjoinRoomExam] = useState([]);
  const [Col, SetCol] = useState(0);
  const [Per, setPer] = useState(0);
  const [calculationResults, setCalculationResults] = useState(null);

  const URL = window.API_URL;
  console.log("data:::", data);

  // Function to combine room exam data by Room_id
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
        },
        rooms: item.rooms
      };
    });
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = localStorage.getItem("API");
        
        // All API calls in Promise.all for parallel fetching
        const [res1, res2, res3, res4] = await Promise.all([
          fetch(`${API_URL}/select_data/detail_exam/${data.Ref}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/select_data/roomexam/${data.Ref}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/Getroomexamwithref/${data.Ref}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/select_data/exam_config`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Process all responses in parallel
        const [examDetails, roomExamData, roomExamWithRef, configData] = await Promise.all([
          res1.json(),
          res2.json(),
          res3.json(),
          res4.json(),
        ]);

        // Combine rooms with same room_id
        const combinedRoomExam = combineRoomExamData(roomExamWithRef || []);
        
        // Set combined room data
        SetlExamInnerjoinRoomExam(combinedRoomExam);
        
        // Set number of copies
        const numCopies = parseInt(data.copy) || 1;
        SetCol(numCopies);
        
        // Find active exam configuration
        const activeConfig = Array.isArray(configData) 
          ? configData.find(config => config.status === true) 
          : null;
        
        // Set backup percentage (default to 0.03 if not found)
        let backupPercentage = 0.03;
        if (activeConfig && activeConfig.backup_exam !== undefined) {
          console.log("Active config:", {
            backup_exam: activeConfig.backup_exam,
            academic_year: activeConfig.academic_year,
            semester: activeConfig.semester
          });
          backupPercentage = activeConfig.backup_exam / 100;
        } else {
          console.log("No active config found, using default 3%");
        }
        setPer(backupPercentage);
        
        // Set exam details
        const examDetailsData = examDetails[0] || {};
        SetExamDetails(examDetailsData);
        SetDataRoomExam(roomExamData || []);

        // Use imported calculateTotals function to generate all calculations at once
        const calculationResults = calculateTotals({
          DataxamInnerjoinRoomExam: combinedRoomExam,
          Col: numCopies,
          DataDetailExam: examDetailsData,
          backup_exam: backupPercentage
        });
        
        setCalculationResults(calculationResults);

      } catch (error) {
        console.error("Error fetching exam data:", error);
        // Use default 3% if API call fails
        setPer(0.03);
      }
    };

    fetchData();
  }, [data, token]);

  // React components for rendering
  const formStyle = {
    width: '210mm',
    minHeight: '297mm',
    padding: '10mm',
    margin: '0 auto',
    backgroundColor: 'white',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  };

  const tableStyle = {
    fontSize: '11px',
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  };

  const cellStyle = {
    border: '1px solid #ddd',
    padding: '4px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const inputStyle = {
    width: "90px",
    height: "24px",
    border: '1px solid #ccc',
    borderRadius: '5px',
    fontSize: '12px',
    padding: '0 5px',
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "แบบฟอร์มคำนวนจำนวนข้อสอบ",
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  // Render exam set column headers
  const renderExamColumns = () => (
    Array.from({ length: Col }, (_, i) => (
      <React.Fragment key={i}>
        <th style={cellStyle}>ข้อสอบชุด {i + 1}</th>
        <th style={cellStyle}>สำรองชุด {i + 1}</th>
      </React.Fragment>
    ))
  );

  // Render empty columns for placeholder rows
  const renderEmptyColumns = () => (
    <>
      <td style={cellStyle}></td>
      <td style={cellStyle}></td>
      {Array.from({ length: Col * 2 }, (_, i) => (
        <td key={i} style={cellStyle}></td>
      ))}
      <td style={cellStyle}></td>
    </>
  );

  // Render the totals row
  const renderTotalRow = () => {
    if (!calculationResults) return null;
    
    return (
      <tr style={{ fontWeight: 'bold' }}>
        <td style={cellStyle}>รวม</td>
        <td style={cellStyle}>{calculationResults.students}</td>
        {Array.from({ length: Col }).map((_, i) => (
          <React.Fragment key={i}>
            <td style={cellStyle}>{calculationResults.exams[i]}</td>
            <td style={cellStyle}>{calculationResults.backups[i]}</td>
          </React.Fragment>
        ))}
        <td style={cellStyle}>{calculationResults.envelopes}</td>
      </tr>
    );
  };

  // Render input section at bottom of form
  const renderInputSection = () => {
    if (!calculationResults) return null;
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '14px' }}>
        <div>
          {Array.from({ length: Col }).map((_, index) => (
            <p key={index}>
              ทำข้อสอบชุด {index + 1} จำนวน: <input
                type="text"
                style={inputStyle}
                value={calculationResults.exams[index]}
                readOnly
              />
            </p>
          ))}
        </div>
        <div>
          <p>
            จำนวนห้องข้อสอบ: <input
              type="text"
              style={{ ...inputStyle, textAlign: "center" }}
              value={DataRoomExam.length || ""}
              readOnly
            />
          </p>
          <p>
            สำรองข้อสอบ: <input
              type="text"
              style={{ ...inputStyle, textAlign: "center", width: "60px" }}
              value={`${(Per * 100).toFixed(0)}%`}
              readOnly
            />
          </p>
          <p style={{ textAlign: "center", fontSize: '14px' }}>
            {DataRoomExam[0]?.Edate || ''}
          </p>
        </div>
      </div>
    );
  };

  // Render room data using the room details from calculation results
  const renderRoomData = (roomIndex) => {
    if (!calculationResults || !calculationResults.roomDetails) return null;
    
    const roomDetail = calculationResults.roomDetails[roomIndex];
    if (!roomDetail) return renderEmptyColumns();
    
    return (
      <>
        <td style={cellStyle}>{roomDetail.roomName}</td>
        <td style={cellStyle}>{roomDetail.numStudents}</td>
        {roomDetail.exams.map((count, idx) => (
          <React.Fragment key={idx}>
            <td style={cellStyle}>{count}</td>
            <td style={cellStyle}>{roomDetail.backupExams[idx]}</td>
          </React.Fragment>
        ))}
        <td style={cellStyle}>{roomDetail.envelopes}</td>
      </>
    );
  };

  return (
    <div className="app">
      <Button
        className="no-print"
        onClick={handlePrint}
        variant="primary"
        style={{ width: "290px", whiteSpace: "nowrap" }}
      >
        พิมพ์แบบฟอร์มคำนวนจำนวนข้อสอบ
      </Button>
      <div style={{ display: 'none' }}>
        <div ref={componentRef} style={formStyle}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', marginBottom: '12px' }}>
            แบบฟอร์มคำนวนจำนวนข้อสอบ กรณีมีข้อสอบ {Col} ชุด
          </h2>
          <p style={{ fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>
            วิชา: {DataxamInnerjoinRoomExam[0]?.roomexam.Course || ''}
            ลำดับที่: {DataxamInnerjoinRoomExam[0]?.roomexam.No || ''}
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={cellStyle}>ห้องข้อสอบ</th>
                <th style={cellStyle}>จำนวน นศ</th>
                {renderExamColumns()}
                <th style={cellStyle}>จำนวนซอง</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {rowIndex < (calculationResults?.roomDetails?.length || 0) ? (
                    renderRoomData(rowIndex)
                  ) : (
                    renderEmptyColumns()
                  )}
                </tr>
              ))}
              {renderTotalRow()}
            </tbody>
          </table>
          {renderInputSection()}
        </div>
      </div>
    </div>
  );
}

export default Altexamcalform;