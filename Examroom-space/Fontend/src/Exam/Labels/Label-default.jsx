import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import 'bootstrap/dist/css/bootstrap.min.css';

const ExamCardExample = () => {
  const URL = window.API_URL;
  const token = localStorage.getItem("token");
  const [examData, setExamData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasRealData, setHasRealData] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    async function GetDataFromApi() {
      try {
        const res = await fetch(localStorage.getItem("API") + "/select_data/examtable", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        
        const dataExam = await res.json();
        
        // ตรวจสอบว่ามีข้อมูลที่มีความหมายหรือไม่
        const realDataExists = Array.isArray(dataExam) && 
                              dataExam.length > 0 && 
                              dataExam.some(item => item?.Course || item?.Lecturer);
        
        setHasRealData(realDataExists);
        
        if (!realDataExists) {
          setExamData([]);
          return;
        }
        
        // เพิ่มข้อมูลเพื่อเติมช่องว่าง
        let y = Array.from(
          { length: 18 }, 
          (_, index) => ({ Ref: (dataExam.length + 1) + index })
        );

        setExamData(dataExam.concat(y) || []);
      } catch (error) {
        setError(error.message);
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    GetDataFromApi();
  }, [URL, token]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Exam Data',
  });

  if (loading) return <div className="text-center">Loading...</div>;
  if (error) return <div className="text-danger text-center">{error}</div>;
  if (!hasRealData) return <div className="alert alert-info text-center"><h5>ยังไม่มีข้อมูล</h5></div>;

  const renderCard = (exam, isPrint = false) => (
    <div 
      key={exam?.Ref || `empty-${exam.Ref}`} 
      className={`card ${isPrint ? '' : 'me-2 mb-2'}`}
      style={{ 
        width: '370px', 
        height: '150px', 
        display: 'flex', 
        border: '1px solid black', 
        borderRadius: '0px',
        ...(isPrint && { margin: '0', pageBreakInside: 'avoid' })
      }}
    >
      <div className="row g-0 h-100">
        <div className="col-2 bg-purple d-flex align-items-center justify-content-center" 
             style={{ backgroundColor: '#6f42c1', borderRadius: '0px', borderRight: '1px solid black' }}>
          <h3 className="text-white m-0" style={{ fontSize: '2.0rem' }}>{exam?.Ref || ""}</h3>
        </div>
        <div className="col-4 d-flex align-items-center" 
             style={{ borderRadius: '0px', borderRight: '1px solid black' }}>
          <div className="card-body py-1 px-2">
            <p className="card-text m-0" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{exam?.Course || ""}</p>
          </div>
        </div>
        <div className="col-2 bg-purple d-flex align-items-center justify-content-center" 
             style={{ backgroundColor: '#6f42c1', borderRadius: '0px', borderRight: '1px solid black' }}>
          <div className="vertical-text" style={{ transform: 'rotate(180deg)' }}>
            <p className="card-text m-0 text-white" style={{ fontSize: '12px', writingMode: 'vertical-rl', textOrientation: 'mixed', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxHeight: '120px' }}>
              {exam?.Lecturer && exam.Lecturer.length > 30 ? `${exam.Lecturer.substring(0, 20)}...` : (exam?.Lecturer || "")}
            </p>
          </div>
        </div>
        <div className="col-4" style={{ borderRadius: '0px' }}>
          <div className="card-body py-1 px-2">
            <p className="card-text mb-1" style={{ fontSize: '0.7rem' }}>รวม</p>
            <p className="card-text mb-1" style={{ fontSize: '0.7rem' }}>
              จำนวน <span className="text-danger">.................</span> ซอง
            </p>
            <p className="card-text" style={{ fontSize: '0.7rem' }}>
              ห้องสอบ <span className="text-danger">.................</span> ห้อง
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebView = () => (
    <div className="d-flex flex-wrap justify-content-start">
      {examData.map((exam) => renderCard(exam))}
    </div>
  );

  const renderPrintView = () => {
    const pages = [];
    for (let i = 0; i < examData.length; i += 14) {
      pages.push(
        <div key={`page-${i/14}`} style={{ 
          pageBreakAfter: 'always', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 370px)', 
          gridAutoRows: '150px',
          gap: '0',
          justifyContent: 'center',
        }}>
          {examData.slice(i, i + 14).map((exam) => renderCard(exam, true))}
        </div>
      );
    }
    return pages;
  };

  return (
    <div>
      <h2>ซองที่แสดงรหัสวิชา</h2>
      <button onClick={handlePrint} style={{width: '310px'}} className="btn btn-primary mb-3">พิมพ์ ซองที่แสดงรหัสวิชา</button>
      
      <div className="web-view mt-4">
        {renderWebView()}
      </div>

      <div style={{ display: 'none' }}>
        <div ref={componentRef} className="print-only">
          {renderPrintView()}
        </div>
      </div>
    </div>
  );
};

export default ExamCardExample;