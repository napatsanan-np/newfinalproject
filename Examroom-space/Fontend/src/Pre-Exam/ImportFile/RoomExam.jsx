import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import './RoomExam-styles.css';

function RoomExam({ data }) {
  const [sortedData, setSortedData] = useState(data);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const sorted = [...sortedData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setSortedData(sorted);
    setSortConfig({ key, direction });
  };

  const getSortDirection = (name) => {
    if (sortConfig.key === name) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="room-exam-container">
      <Table className="room-exam-table" striped bordered hover responsive>
        <thead>
          <tr>
            <th onClick={() => handleSort('No')}>No{getSortDirection('No')}</th>
            <th onClick={() => handleSort('Ref')}>Ref{getSortDirection('Ref')}</th>
            <th onClick={() => handleSort('Edate')}>Edate{getSortDirection('Edate')}</th>
            <th onClick={() => handleSort('Etime')}>Etime{getSortDirection('Etime')}</th>
            <th onClick={() => handleSort('Hr')}>ชั่วโมง{getSortDirection('Hr')}</th>
            <th onClick={() => handleSort('Course')}>รายวิชา{getSortDirection('Course')}</th>
            <th onClick={() => handleSort('Num_st')}>จำนวนที่นั่ง{getSortDirection('Num_st')}</th>
            <th onClick={() => handleSort('Room')}>ห้องสอบ{getSortDirection('Room')}</th>
     
            <th onClick={() => handleSort('Remark')}>ผู้สอน{getSortDirection('Remark')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr key={item.roomexam.No}>
              <td>{item.roomexam.No}</td>
              <td>{item.roomexam.Ref}</td>
              <td>{item.roomexam.Edate}</td>
              <td>{item.roomexam.Etime}</td>
              <td>{item.roomexam.Hr}</td>
              <td style={{width :"400px"}}>{item.roomexam.Course}</td>
              <td>{item.roomexam.Num_st}</td>
              <td>{item.rooms.room_name}</td>
             
              <td>{item.roomexam.Lecturer}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default RoomExam;