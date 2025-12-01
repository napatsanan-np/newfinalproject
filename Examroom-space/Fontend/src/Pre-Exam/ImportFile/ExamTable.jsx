import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import "./ExamTable-styles.css";

function ExamTable({ data }) {
  const [sortedData, setSortedData] = useState(data);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const sorted = [...sortedData].sort((a, b) => {
      if (key === 'Num_st') {
        return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
      } else {
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
    setSortedData(sorted);
    setSortConfig({ key, direction });
  };

  return (
    <div className="exam-table-container">
      <Table className="exam-table" striped bordered hover>
        <thead>
          <tr>
            <th onClick={() => handleSort('Ref')}>Ref</th>
            <th onClick={() => handleSort('Edate')}>วันที่สอบ</th>
            <th  onClick={() => handleSort('Etime')}>เวลาสอบ</th>
            <th onClick={() => handleSort('Course')}>รายวิชา</th>
            <th onClick={() => handleSort('Lecturer')}>อาจารย์</th>
            <th onClick={() => handleSort('Num_st')}>จำนวนที่นั่ง</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr key={item.Ref}>
              <td>{item.Ref}</td>
              <td>{item.Edate}</td>
              <td style={{width :"100px"}}> {item.Etime}</td>
              <td>{item.Course}</td>
              <td>{item.Lecturer}</td>
              <td>{item.No_st}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default ExamTable;