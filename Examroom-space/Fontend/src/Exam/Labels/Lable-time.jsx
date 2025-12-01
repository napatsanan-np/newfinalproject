import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import Select from 'react-select';
import _ from 'lodash';
import 'bootstrap/dist/css/bootstrap.min.css';
import "./LabelLayout-styles.css";


const LabelLayout = () => {
  // Label component
const Label = React.memo(({ item, isPrint, styles }) => {
  const { 
    labelStyle, 
    printLabelStyle, 
    sectionStyle, 
    horizontalDividerStyle, 
    headerStyle 
  } = styles;

  return (
    <div style={isPrint ? printLabelStyle : labelStyle} className="p-0">
      <div className="row h-100 m-0">
        <div className="col-3 p-0" style={sectionStyle}>
          <div style={{ 
            ...horizontalDividerStyle, 
            height: '40%', 
            background: item.dayColor, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid black'
          }}>
            <div style={headerStyle}>{item.thaiDay}</div>
          </div>
          <div style={{ ...horizontalDividerStyle, height: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize:"14px", fontWeight: "bold" }}>
            {item.Edate}
          </div>
          <div style={{ height: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize:"14px", fontWeight: "bold" }}>
            {item.Etime}
          </div>
        </div>
        <div className="col-6" style={{...sectionStyle, overflow: 'hidden'}}>
          <div className="d-flex flex-column h-100">
            <div style={{
              ...headerStyle, 
              fontSize: '16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 6,
              WebkitBoxOrient: 'vertical',
              wordWrap: 'break-word',
              maxHeight: '100%'
            }}>
              {item.Course}
            </div>
          </div>
        </div>
        <div className="col-3 d-flex flex-column justify-content-center align-items-center">
          <div style={{...headerStyle, fontSize:"16px"}}>{getRoomName(item.Room_id)}</div>
        </div>
      </div>
    </div>
  );
});

  const STYLES = {
    labelStyle: {
      width: '370px',
      height: '150px',
      border: '1px solid black',
      padding: '0.2cm',
      textAlign: "center",
    },
    printLabelStyle: {
      width: '370px',
      height: '150px',
      border: '1px solid black',
      padding: '0.2cm',
      textAlign: "center",
      margin: '0',
      pageBreakInside: 'avoid',
    },
    sectionStyle: {
      height: '100%',
      borderRight: '1px solid black',
      padding: '0.1cm',
    },
    horizontalDividerStyle: {
      borderBottom: '1px solid black',
      marginBottom: '0.1cm',
      paddingBottom: '0.1cm',
    },
    headerStyle: {
      fontWeight: 'bold',
      textAlign: "center",
    },
    selectStyles: {
      control: (provided) => ({
        ...provided,
        minHeight: '38px',
      }),
      menu: (provided) => ({
        ...provided,
        zIndex: 9999,
      }),
    },
  };

  const THAI_DAYS = [
    'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร',
    'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์',
  ];

  const DAY_COLORS = {
    'วันอาทิตย์': '#FFCCCC',
    'วันจันทร์': '#FFFFCC',
    'วันอังคาร': '#FFCCFF',
    'วันพุธ': '#CCFFCC',
    'วันพฤหัสบดี': '#FF8C6E',
    'วันศุกร์': '#99CCFF',
    'วันเสาร์': '#D1A3D1',
  };

  const [examData, setExamData] = useState([]);
  const [roomData, setRoomData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [cardQuantity, setCardQuantity] = useState(null);
  const [courseOptions, setCourseOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [roomsData, setRoomsData] = useState([]);  // Add state for rooms data
  const URL = window.API_URL;
  const token = localStorage.getItem("token");
  const componentRef = useRef();

  const getRoomName = (roomId) => {
    const room = roomsData.find(r => r.room_id === roomId);
    return room ? room.room_name : 'ไม่พบข้อมูลห้อง';
};
  const getThaiDayOfWeek = useCallback((dateString) => {
    const [day, month, year] = dateString.split('/');
    const formattedDate = `${month}-${day}-${year}`;
    return THAI_DAYS[new Date(formattedDate).getDay()];
  }, []);

  const processData = useCallback((rawData) => {
    return rawData.map(item => ({
      ...item,
      thaiDay: getThaiDayOfWeek(item.Edate),
      dayColor: DAY_COLORS[getThaiDayOfWeek(item.Edate)] || 'white',
    }));
  }, [getThaiDayOfWeek]);

  const joinExamRoomData = useCallback((examData, roomData) => {
    return examData.map(exam => {
      const room = _.find(roomData, ['room_id', exam.Room_id]);
      return {
        ...exam,
        room_name: room ? room.room_name : 'ไม่พบข้อมูลห้อง',
        capacity: room ? room.capacity : 0
      };
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch exam data
        const examResponse = await fetch(`${localStorage.getItem("API")}/select_data/roomexam`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const examResult = await examResponse.json();

        // Sort exam data by date
        const sortedExamData = _.sortBy(examResult, item => {
          const [day, month, year] = item.Edate.split('/');
          return new Date(`${year}-${month}-${day}`);
        });

        // Fetch room data
        const roomResponse = await fetch(`${localStorage.getItem("API")}/select_data/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const roomResult = await roomResponse.json();

        // Store raw data
        setExamData(sortedExamData);
        setRoomData(roomResult);
        setRoomsData(roomResult)
     
        // Join and process data
        const joined = joinExamRoomData(sortedExamData, roomResult);
        const processed = processData(joined);
        setProcessedData(processed);

        // Update select options
        const uniqueCourses = _.uniq(joined.map(item => item.Course)).sort();
        const uniqueRooms = _.uniq(joined.map(item => item.Room_id)).sort();

        setCourseOptions(uniqueCourses.map(course => ({
          value: course,
          label: course
        })));

        setRoomOptions(uniqueRooms.map(room => ({
          value: room,
          label: `${room} - ${_.find(roomResult, ['room_id', room])?.room_name || 'ไม่พบข้อมูลห้อง'}`
        })));

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [URL, token, joinExamRoomData, processData]);

  const handleCourseChange = (selectedOption) => {
    setSelectedCourse(selectedOption);
    if (selectedOption === null) {
      setCardQuantity(null);
    }
  };

  const handleRoomChange = (selectedOption) => {
    setSelectedRoom(selectedOption);
    if (selectedOption === null) {
      setCardQuantity(null);
    }
  };

  const filteredData = useMemo(() => {
    const filtered = processedData.filter(item => {
      const courseMatch = !selectedCourse || item.Course === selectedCourse.value;
      const roomMatch = !selectedRoom || item.Room_id === selectedRoom.value;
      return courseMatch && roomMatch;
    });

    if (filtered.length === 1 && cardQuantity === null) {
      const defaultQuantity = Math.ceil(filtered[0].Num_st / 15);
      setCardQuantity(defaultQuantity);
    } else if (filtered.length === 0) {
      setCardQuantity(null);
    }

    return filtered;
  }, [processedData, selectedCourse, selectedRoom, cardQuantity]);

  const handleQuantityChange = useCallback((e) => {
    const value = parseInt(e.target.value);
    if (value > 0 || e.target.value === '') {
      setCardQuantity(value || null);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedCourse(null);
    setSelectedRoom(null);
    setCardQuantity(null);
  }, []);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'LabelPrint',
  });

  const getCurrentQuantity = useCallback((item) => {
    if (cardQuantity !== null) return cardQuantity;
    return Math.ceil(item.Num_st / 15) === 0 
    ? 2
    : Math.ceil(item.Num_st / 15) % 2 === 0 
      ? Math.ceil(item.Num_st / 15) // เลขคู่
      : Math.ceil(item.Num_st / 15) + 1; // เลขคี่
  }, [cardQuantity]);

  const renderWebView = useMemo(() => (
    <div className="row mb-4 label-container">
      {filteredData.flatMap((item, index) => {
        const quantity = getCurrentQuantity(item);
        return Array(quantity).fill().map((_, i) => (
          <div key={`${index}-${i}`} className="col-12 col-md-6 col-lg-4 d-flex justify-content-center p-0 mb-4 label-wrapper">
            <Label item={item} isPrint={false} styles={STYLES} />
          </div>
        ));
      })}
    </div>
  ), [filteredData, STYLES, getCurrentQuantity]);

  const renderPrintView = useMemo(() => {
    const allLabels = filteredData.flatMap((item, index) => {
      const quantity = getCurrentQuantity(item);
      return Array(quantity).fill().map((_, i) => (
        <Label key={`${index}-${i}`} item={item} isPrint={true} styles={STYLES} />
      ));
    });

    const pages = [];
    for (let i = 0; i < allLabels.length; i += 14) {
      pages.push(
        <div key={`page-${i/14}`} style={{ 
          pageBreakAfter: 'always', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 370px)', 
          gridAutoRows: '150px',
          gap: '0',
          justifyContent: 'center',
          margin: '0 auto'
        }}>
          {allLabels.slice(i, i + 14)}
        </div>
      );
    }
    return pages;
  }, [filteredData, STYLES, getCurrentQuantity]);
  console.log("processedData" , processedData)
  return (
    <div className="container" style={{ textAlign: "left" }}>
      <h3>ซองข้อสอบช่วงเวลาการสอบ</h3>
      
      <div className="row mb-3 align-items-end">
        <div className="col-md-4 mb-2">
          <label className="form-label">รายวิชา</label>
          <Select
            value={selectedCourse}
            onChange={handleCourseChange}
            options={courseOptions}
            isClearable
            isSearchable
            placeholder="ค้นหารายวิชา..."
            styles={STYLES.selectStyles}
            cacheOptions
            defaultOptions
          />
        </div>
        <div className="col-md-3 mb-2">
          <label className="form-label">ห้องสอบ</label>
          <Select
            value={selectedRoom}
            onChange={handleRoomChange}
            options={roomOptions}
            isClearable
            isSearchable
            placeholder="ค้นหาห้องสอบ..."
            styles={STYLES.selectStyles}
            cacheOptions
            defaultOptions
          />
        </div>
        <div className="col-md-2 mb-2">
          <label className="form-label">จำนวน Label</label>
          <input
            type="number"
            className="form-control"
            value={cardQuantity || ''}
            onChange={handleQuantityChange}
            min="1"
            placeholder="คำนวณอัตโนมัติ"
          />
        </div>
        <div className="col-md-3 mb-2 d-flex gap-2">
          <button 
            className="btn btn-secondary"
            onClick={resetFilters}
          >
            ล้าง
          </button>
          <button 
            className='btn btn-primary flex-grow-1' 
            onClick={handlePrint}
          >
            พิมพ์ซองข้อสอบ
          </button>
        </div>
      </div>

      <div className="web-view mt-4">
        {filteredData.length > 0 ? renderWebView : 
          <div className="alert alert-info text-center">
            {examData.length === 0 ? "ยังไม่มีข้อมูล" : "ไม่พบข้อมูลที่ตรงกับการค้นหา"}
          </div>
        }
      </div>

      <div style={{ display: 'none' }}>
        <div ref={componentRef} className="print-only">
          {filteredData.length > 0 ? renderPrintView : <div>ไม่มีข้อมูลสำหรับการพิมพ์</div>}
        </div>
      </div>
    </div>
  );
};

export default LabelLayout;