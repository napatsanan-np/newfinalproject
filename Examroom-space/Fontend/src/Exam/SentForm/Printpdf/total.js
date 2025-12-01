/**
 * Returns seating data for special rooms
 * @param {string} name - Room name
 * @returns {Object} - Object containing seating arrays
 */
const GetVal = (name) => {
  if (name === "5406 ว.4") {
    return {
      'x1': [10, 0, 10, 0, 10, 0, 10, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 10],
      'x2': [0, 10, 0, 10, 0, 10, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 8, 0],
      'sum': [10, 20, 30, 40, 50, 60, 70, 82, 94, 106, 118, 130, 142, 154, 166, 178, 190, 202, 214, 226, 238, 250, 262, 270, 280]
    };
  } else if (name === "ร.วท.2" || name === "ร.วท.1") {
    return {
      'x1': [10, 0, 10, 0, 12, 0, 12, 0, 14, 0, 14, 0, 8, 0, 10, 0],
      'x2': [0, 10, 0, 12, 0, 12, 0, 14, 0, 14, 0, 12, 0, 8, 0, 10],
      'sum': [10, 20, 30, 42, 54, 66, 78, 92, 106, 120, 134, 146, 154, 162, 172, 182]
    };
  } else if (name === "หอประชุม") {
    return {
      'x1': [15, 0, 20, 0, 24, 0, 27, 0, 28, 0, 30, 0, 31, 0, 28, 0],
      'x2': [0, 18, 0, 21, 0, 24, 0, 28, 0, 29, 0, 30, 0, 32, 0, 29],
      'sum': [15, 33, 53, 74, 98, 122, 149, 177, 205, 234, 264, 294, 325, 357, 385, 414]
    };
  } else if (name === "ไววิทย์พุทธารี") {
    return {
      'x1': [10, 0, 13, 0, 14, 0, 17, 0, 20, 0, 23, 0, 24, 0, 11],
      'x2': [0, 11, 0, 14, 0, 17, 0, 20, 0, 21, 0, 24, 0, 27, 0],
      'sum': [10, 21, 34, 48, 62, 79, 96, 116, 136, 157, 180, 204, 228, 255, 266]
    };
  }
  // Return default empty values instead of null to prevent errors
  return {
    'x1': [],
    'x2': [],
    'sum': []
  };
};

/**
 * Calculates how to distribute students across exam sets
 * @param {number|string} numSt - Number of students
 * @param {number} Col - Number of columns/sets
 * @returns {Array} - Array of student counts per exam set
 */
const calculateResult = (numSt, Col) => {
  const numerator = parseInt(numSt) || 0;
  const denominator = parseInt(Col) || 1;
  
  if (numerator === 0) {
    // Ensure we still have at least 1 for each set if no students
    return Array(denominator).fill(1);
  }
  
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  
  const distribution = Array(denominator)
    .fill(quotient)
    .map((val, idx) => (idx < remainder ? val + 1 : val));
  
  // Ensure no zeros - if any value is 0, set it to 1
  return distribution.map(count => Math.max(count, 1));
};

/**
 * Calculates backup exam counts
 * @param {number|string} numSt - Number of students
 * @param {number} Col - Number of columns/sets
 * @param {number} Per - Percentage for backup calculation
 * @returns {Array} - Array of backup counts per exam set
 */
const calCulateExamSumrong = (numSt, Col, Per) => {
  return calculateResult(numSt, Col).map((count) =>
    count > 0 ? Math.max(1, Math.floor(count * Per)) : 0
  );
};

/**
 * Calculate envelope count based on student count and page count
 * @param {number} numSt - Number of students
 * @param {number} pageCount - Number of pages per exam
 * @returns {number} - Number of envelopes needed
 */
const calculateEnvelopes = (numSt, pageCount = 1) => {
  return Math.ceil((numSt * pageCount / 500)) * 2;
};

/**
 * Calculate special room exam distribution
 * @param {string} roomName - Room name
 * @param {number} numStudents - Number of students
 * @param {number} Col - Number of columns/sets
 * @param {number} Per - Percentage for backup calculation
 * @param {number} pageCount - Number of pages per exam
 * @returns {Object} - Exam counts, backup counts, and envelopes
 */
const calculateSpecialRoom = (roomName, numStudents, Col, Per, pageCount = 1) => {
  const specialRoomData = GetVal(roomName);
  const numStudentsInt = parseInt(numStudents) || 0;
  
  // Find the index in the sum array that accommodates our student count
  const index = specialRoomData.sum.findIndex(val => val >= numStudentsInt);
  
  // Fallback to regular room calculation if no valid arrangement found
  if (index === -1 || !specialRoomData.sum || specialRoomData.sum.length === 0) {
    return calculateRegularRoom(numStudents, Col, Per, pageCount);
  }
  
  const difference = specialRoomData.sum[index] - numStudentsInt;
  
  if (Col === 1) {
    // For 1 set, just return the student count
    return {
      examCounts: [Math.max(numStudentsInt, 1)],
      backupCounts: [Math.ceil(Math.max(numStudentsInt , 1) * Per)],
      envelopes: calculateEnvelopes(numStudentsInt, pageCount)
    };
  } else if (Col === 2) {
    // For 2 sets, calculate x1 and x2 sums up to the found index
    const x1Sum = specialRoomData.x1.slice(0, index + 1).reduce((sum, val) => sum + val, 0);
    const x2Sum = specialRoomData.x2.slice(0, index + 1).reduce((sum, val) => sum + val, 0);
    
    let examCounts;
    
    if (specialRoomData.x1[index] !== 0 && specialRoomData.x2[index] === 0) {
      // Adjust x1 by difference
      examCounts = [Math.max(x1Sum - difference, 1), Math.max(x2Sum, 1)];
    } else if (specialRoomData.x1[index] === 0 && specialRoomData.x2[index] !== 0) {
      // Adjust x2 by difference
      examCounts = [Math.max(x1Sum, 1), Math.max(x2Sum - difference, 1)];
    } else {
      // Fallback to standard distribution if pattern doesn't match
      examCounts = calculateResult(numStudents, Col);
    }
    
    // Ensure at least 1 copy for each set
    examCounts = examCounts.map(count => Math.max(count, 1));
    
    const backupCounts = examCounts.map(count => Math.floor(count * Per));
    
    return {
      examCounts,
      backupCounts,
      envelopes: calculateEnvelopes(numStudentsInt, pageCount)
    };
  } else if (Col === 4) {
    // For 4 sets, evenly distribute to sets 1-2 and 3-4
    const x1Sum = specialRoomData.x1.slice(0, index + 1).reduce((sum, val) => sum + val, 0);
    const x2Sum = specialRoomData.x2.slice(0, index + 1).reduce((sum, val) => sum + val, 0);
    
    let set1and2, set3and4;
    
    if (specialRoomData.x1[index] !== 0 && specialRoomData.x2[index] === 0) {
      // Adjust x1 by difference
      set1and2 = x1Sum - difference;
      set3and4 = x2Sum;
    } else if (specialRoomData.x1[index] === 0 && specialRoomData.x2[index] !== 0) {
      // Adjust x2 by difference
      set1and2 = x1Sum;
      set3and4 = x2Sum - difference;
    } else {
      // Fallback to standard distribution
      return calculateRegularRoom(numStudents, Col, Per, pageCount);
    }
    
    // Split evenly between sets 1-2 and sets 3-4
    const examCounts = [
      Math.ceil(set1and2 / 2),   // Set 1
      Math.floor(set1and2 / 2),  // Set 2
      Math.ceil(set3and4 / 2),   // Set 3
      Math.floor(set3and4 / 2)   // Set 4
    ];
    
    // Ensure all counts are at least 1
    const finalExamCounts = examCounts.map(count => Math.max(count, 1));
    
    // Calculate backups for each set
    const backupCounts = finalExamCounts.map(count => Math.ceil(count * Per));
    
    return {
      examCounts: finalExamCounts,
      backupCounts,
      envelopes: calculateEnvelopes(numStudentsInt, pageCount)
    };
  }
  
  // Fallback for any other number of sets
  return calculateRegularRoom(numStudents, Col, Per, pageCount);
};

/**
 * Calculate regular room exam distribution
 * @param {number} numStudents - Number of students
 * @param {number} Col - Number of columns/sets
 * @param {number} Per - Percentage for backup calculation
 * @param {number} pageCount - Number of pages per exam
 * @returns {Object} - Exam counts, backup counts, and envelopes
 */
const calculateRegularRoom = (numStudents, Col, Per, pageCount = 1) => {
  const examCounts = calculateResult(numStudents, Col);
  const backupCounts = examCounts.map(count => Math.max(1, Math.floor(count * Per)));

  const envelopes = calculateEnvelopes(numStudents, pageCount);
  
  return {
    examCounts,
    backupCounts,
    envelopes
  };
};

/**
 * Calculates exam totals with improved handling for special rooms and seat rows
 * @param {Object} params - Parameters object
 * @param {Array} params.DataxamInnerjoinRoomExam - Room and exam data
 * @param {number} params.Col - Number of columns/sets
 * @param {Object} params.DataDetailExam - Exam details with page count
 * @param {number} params.backup_exam - Backup exam percentage (as a decimal)
 * @returns {Object} - Calculated totals and details
 */
const calculateTotals = ({ DataxamInnerjoinRoomExam = [], Col = 1, DataDetailExam = { page: 1 }, backup_exam = 0.03 }) => {
  let totalStudents = 0;
  let totalEnvelopes = 0;
  const totalExams = Array(Col).fill(0);
  const totalBackups = Array(Col).fill(0);
  const specialRooms = ["5406 ว.4", "ร.วท.2", "ร.วท.1", "หอประชุม", "ไววิทย์พุทธารี"];
  
  // Store backup information by row
  const rowBackups = new Map();
  const roomDetails = [];

  // Convert to array if not already
  const dataArray = Array.isArray(DataxamInnerjoinRoomExam) 
    ? DataxamInnerjoinRoomExam 
    : Object.values(DataxamInnerjoinRoomExam || {});
  
  // Use backup_exam as the percentage (this should be a decimal, e.g. 0.03 for 3%)
  const Per = backup_exam;
  const pageCount = DataDetailExam?.page || 1;

  dataArray.forEach((row) => {
    // Skip if room or exam data is missing
    if (!row?.roomexam || !row?.rooms) return;

    const numSt = parseInt(row.roomexam.Num_st) || 0;
    const seatRow = row.roomexam.Seatrow;
    const roomName = row.rooms.room_name;
    
    // Add to total student count
    totalStudents += numSt;

    // Skip calculation if no students
    if (numSt <= 0) return;

    const isSpecialRoom = specialRooms.includes(roomName);
    let roomInfo;
    
    if (isSpecialRoom) {
      roomInfo = calculateSpecialRoom(roomName, numSt, Col, Per, pageCount);
    } else {
      roomInfo = calculateRegularRoom(numSt, Col, Per, pageCount);
    }
    
    // Add exam counts to totals
    roomInfo.examCounts.forEach((count, idx) => {
      if (idx < Col) {
        totalExams[idx] += count || 0;
      }
    });
    
    // Add backup counts to totals
    roomInfo.backupCounts.forEach((count, idx) => {
      if (idx < Col) {
        totalBackups[idx] += count || 0;
      }
    });
    
    // Add envelopes to total
    totalEnvelopes += roomInfo.envelopes;
    
    // Track backup exams by row
    if (seatRow) {
      const backupSum = roomInfo.backupCounts.reduce((a, b) => a + b, 0);
      rowBackups.set(seatRow, (rowBackups.get(seatRow) || 0) + backupSum);
    }

    // Store room details
    roomDetails.push({
      roomName: roomName,
      numStudents: numSt,
      exams: roomInfo.examCounts,
      backupExams: roomInfo.backupCounts,
      seatRow: seatRow,
      envelopes: roomInfo.envelopes,
    });
  });

  // Convert row backups Map to Array with averages
  const rowTotalBackups = Array.from(rowBackups.entries())
    .map(([row, total]) => ({
      row,
      totalBackups: total,
      averageBackups: Math.ceil(total / Col)
    }))
    .sort((a, b) => a.row.localeCompare(b.row)); // Sort by row name

  return {
    students: totalStudents,
    exams: totalExams,
    backups: totalBackups,
    envelopes: totalEnvelopes,
    roomDetails: roomDetails,
    rowTotalBackups: rowTotalBackups
  };
};

/**
 * Calculate individual room info
 * @param {Object} roomData - Room data object
 * @param {number} Col - Number of columns/sets
 * @param {number} Per - Percentage for backup calculation (as a decimal)
 * @param {number} pageCount - Number of pages per exam
 * @returns {Object} - Room calculation results
 */
const calculateRoomInfo = (roomData, Col, Per, pageCount = 1) => {
  if (!roomData?.roomexam || !roomData?.rooms) return null;
  
  const roomName = roomData.rooms.room_name;
  const numStudents = parseInt(roomData.roomexam.Num_st) || 0;
  const specialRooms = ["5406 ว.4", "ร.วท.2", "ร.วท.1", "หอประชุม", "ไววิทย์พุทธารี"];
  
  if (specialRooms.includes(roomName)) {
    return calculateSpecialRoom(roomName, numStudents, Col, Per, pageCount);
  } else {
    return calculateRegularRoom(numStudents, Col, Per, pageCount);
  }
};

export { 
  GetVal, 
  calculateResult, 
  calCulateExamSumrong, 
  calculateEnvelopes, 
  calculateSpecialRoom, 
  calculateRegularRoom,
  calculateRoomInfo
};

export default calculateTotals;