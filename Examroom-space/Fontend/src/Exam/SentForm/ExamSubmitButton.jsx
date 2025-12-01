import React, { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';

const ExamSubmitButton = ({ status, onSubmit }) => {
  const [showMessage, setShowMessage] = useState(false);
  
  const handleClick = (e) => {
    if (status === "ส่งแล้ว") {
      e.preventDefault();
      setShowMessage(true);
      // ซ่อนข้อความหลังจาก 5 วินาที
      setTimeout(() => setShowMessage(false), 5000);
    } else {
      onSubmit(e);
    }
  };

  return (
    <div className="d-flex flex-column align-items-end">
      {/* แสดงข้อความเตือนเมื่อ showMessage เป็น true */}
      {showMessage && (
        <Alert 
          variant="warning" 
          className="mb-2 text-center"
          style={{ width: '100%' }}
        >
          ข้อสอบถูกส่งแล้ว หากต้องการแก้ไขกรุณาติดต่อที่ห้องข้อสอบ
        </Alert>
      )}
      <div className="d-flex">
        <DownloadButton examRef={Data.Ref} className="me-2"/>
        <Button
          type="submit"
          variant="primary"
          onClick={handleClick}
          style={{
            width: "160px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            height: "45px",
            opacity: status === "ส่งแล้ว" ? 0.6 : 1
          }}
          disabled={status === "ส่งแล้ว"}
        >
          ส่งข้อสอบ
        </Button>
      </div>
    </div>
  );
};

export default ExamSubmitButton;