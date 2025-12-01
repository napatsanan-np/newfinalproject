import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate } from "swr";
import {
  Container,
  Row,
  Col,
  Form as BootstrapForm,
  Button,
  Alert,
  Modal,
  Form,
} from "react-bootstrap";
import Select from "react-select";
import axios from "axios";
import Altexamcalform from "./Printpdf/Altexamcalform.jsx";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import "./NewForm-styles.css";
import "./NewForm-fonts.css";
import AddCourseButton from "./AddExam.jsx";
import ExamInfoComponent from "./Printpdf/ExamInfoComponent.jsx";
import DownloadButton from "./DownloadButton.jsx";

const DetailExamForm = () => {
  const url = localStorage.getItem("API");
  const token = localStorage.getItem("token");
  const currentDate = new Date();
  const buddhistYear = currentDate.getFullYear() + 543;
  const [noExam, setNoExam] = useState(false);
  const formattedDate = `${currentDate.getDate()}-${("0" + (currentDate.getMonth() + 1)).slice(-2)}-${buddhistYear}`;

  const [Data, setData] = useState({
    Ref: "",
    NoSt: "",
    submit: "ยังไม่ส่ง",
    sub_date: formattedDate,
    Lecturer: "",
    copy: "",
    page: "",
    recive: "",
    recDate: "",
    qty: "",
    staple_conner: "",
    staple_apart: "",
    calculator: "",
    answesheet: "",
    answerbook_use: "0",
    remark: "",
    color: "",
    eDate: "",
    eTime: "",
    hr: "",
    answerBookCount: "",
    room_name: "",
    fileexam: [],
    exam_type: "สอบในตาราง",
  });

  // ---------------------------
  // ส่วนสถานะ "หมายเหตุ" ที่เพิ่มใหม่
  // ---------------------------
  // remarkChoice: เก็บว่ากำลังเลือกโหมดไหน
  //   '-', 'note', 'none', 'a4_double', 'a4_hand', 'other'
  const [remarkChoice, setRemarkChoice] = useState("-");
  // remarkCount: จำนวนแผ่น/จำนวนหน้า (เฉพาะ 2 ตัวเลือก A4)
  const [remarkCount, setRemarkCount] = useState("");

  // อัปเดตให้รองรับ placeholder ที่มี “...” ด้วย
  const parseRemarkToChoice = (remarkText) => {
    if (!remarkText || remarkText === "-" || remarkText === "ไม่มี") {
      return { choice: "none", count: "" };
    }
    if (remarkText === "นำกระดาษโน้ตเข้าห้องสอบได้") {
      return { choice: "note", count: "" };
    }

    // ===== กรณี placeholder (ยังไม่ได้กรอกตัวเลข) =====
    if (remarkText === "อนุญาต A4 ... แผ่นหน้าหลัง") {
      return { choice: "a4_double", count: "" };
    }
    if (remarkText === "อนุญาต A4 เข้าได้ ... หน้า (ที่เขียนด้วยลายมือตัวเอง)") {
      return { choice: "a4_hand", count: "" };
    }

    // ===== กรณีมีตัวเลขจริง =====
    // อนุญาต A4 X แผ่นหน้าหลัง
    const m1 = remarkText.match(/^อนุญาต A4\s+(\d+)\s+แผ่นหน้าหลัง$/);
    if (m1) return { choice: "a4_double", count: m1[1] };

    // อนุญาต A4 เข้าได้ X หน้า (ที่เขียนด้วยลายมือตัวเอง)
    const m2 = remarkText.match(/^อนุญาต A4 เข้าได้\s+(\d+)\s+หน้า\s+\(ที่เขียนด้วยลายมือตัวเอง\)$/);
    if (m2) return { choice: "a4_hand", count: m2[1] };

    // อื่นๆ
    return { choice: "other", count: "" };
  };

  const composeRemark = (choice, count, customText) => {
    switch (choice) {
      case "note":
        return "นำกระดาษโน้ตเข้าห้องสอบได้";
      case "none":
        return "ไม่มี";
      case "a4_double":
        return count ? `อนุญาต A4 ${count} แผ่นหน้าหลัง` : "อนุญาต A4 ... แผ่นหน้าหลัง";
      case "a4_hand":
        return count ? `อนุญาต A4 เข้าได้ ${count} หน้า (ที่เขียนด้วยลายมือตัวเอง)` : "อนุญาต A4 เข้าได้ ... หน้า (ที่เขียนด้วยลายมือตัวเอง)";
      case "other":
        return customText || "";
      default:
        return "-";
    }
  };

  // เมื่อ Data.remark ถูกตั้งค่าจากการเลือกวิชา/โหลดข้อมูลเดิม ให้ซิงค์มาไว้ใน remarkChoice/remarkCount
  useEffect(() => {
    const { choice, count } = parseRemarkToChoice(Data.remark);
    // ถ้า remark ว่าง ให้ใช้ค่าเริ่มเป็น '-'
    if (!Data.remark) {
      setRemarkChoice("-");
      setRemarkCount("");
    } else {
      setRemarkChoice(choice);
      setRemarkCount(count || "");
    }
  }, [Data.remark]);

  // ---------------------------

  const [submissionData, setSubmissionData] = useState({
    Ref: Data.Ref,
    Lecturer: Data.Lecturer,
    copy: Data.copy,
    page: Data.page,
    color: Data.color,
    sub_date: Data.sub_date,
    staple_conner: Data.staple_conner,
    staple_apart: Data.staple_apart,
    calculator: Data.calculator,
    answesheet: Data.answesheet,
    remark: Data.remark,
    submit: Data.submit,
    answerbook_use: Data.answerbook_use || "0",
    fileexam: [],
  });

  useEffect(() => {
    setSubmissionData({
      Ref: Data.Ref,
      Lecturer: Data.Lecturer,
      copy: Data.copy,
      page: Data.page,
      color: Data.color,
      sub_date: Data.sub_date,
      submit: Data.submit,
      staple_conner: Data.staple_conner,
      staple_apart: Data.staple_apart,
      calculator: Data.calculator,
      answesheet: Data.answesheet,
      answerbook_use: Data.answerbook_use || "0",
      remark: Data.remark,
      fileexam: Data.fileexam || [],
    });
  }, [Data]);

  useEffect(() => {
    if (Data.exam_type === "สอบนอกตาราง") {
      setData((prev) => ({
        ...prev,
        copy: "",
        page: "",
        staple_conner: "",
        staple_apart: "",
        calculator: "",
        answesheet: "",
        answerbook_use: "0",
        remark: prev.remark, // คง remark ได้
        fileexam: [],
      }));
    }
  }, [Data.exam_type]);

  useEffect(() => {
    setNoExam(Data.submit === "มีสอบแต่ไม่มีข้อสอบส่ง");
  }, [Data.submit]);

  const fetcher = async (url) => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  };

  const { data: dataE = [], mutate: mutateExamTable } = useSWR(
    `${url}/select_data/examtable`,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        const allUniqueLecturers = [
          ...new Set(
            (data ?? []).flatMap((item) =>
              (item?.Lecturer ?? "")
                .split(",")
                .map((lecturer) => lecturer.trim())
            )
          ),
        ].filter((lecturer) => lecturer);
        setAllLecturers(allUniqueLecturers);
      },
    }
  );

  const maxRef = useMemo(() => {
    if (!dataE || dataE.length === 0) return 1;
    return Math.max(...dataE.map((item) => parseInt(item.Ref)));
  }, [dataE]);

  const { data: dataExamDetail = [], mutate: mutateExamDetail } = useSWR(
    `${url}/select_data/detail_exam`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: userData } = useSWR(`${url}/select_data/users`, fetcher, { revalidateOnFocus: false });
  const { data: roomExamData } = useSWR(`${url}/DataRoomexam`, fetcher, { revalidateOnFocus: false });

  const [lecturerOptions, setLecturerOptions] = useState([]);

  const validateForm = () => {
    if (Data.exam_type === "สอบนอกตาราง") {
      setErrors({});
      return true;
    }
    if (noExam) {
      if (!Data.Lecturer || Data.Lecturer.trim() === "") {
        setErrors({ Lecturer: true });
        return false;
      }
      return true;
    }

    const requiredFields = [
      "copy",
      "page",
      "color",
      "staple_conner",
      "calculator",
      "answesheet",
      "Lecturer",
      "remark",
    ];
    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!Data[field] || Data[field] === "") newErrors[field] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [errors, setErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);

  const inputStyle = (fieldName) => ({
    borderColor: errors[fieldName] ? "red" : undefined,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prevData) => {
      const newData = { ...prevData, [name]: value };
      if (name === "page" && newData.staple_conner === "เย็บมุมรวม") {
        newData.staple_apart = `1 ตอน(หน้า 1 - ${value})`;
      }
      return newData;
    });
  };

  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleIdChangeWithCourse = (selectedOption) => {
    handleRefChange(selectedOption.value);
  };

  const handleRefChange = (newRef) => {
    if (newRef === "") {
      setData((prevData) => ({
        ...prevData,
        Ref: "",
        NoSt: "-",
        Lecturer: "",
        eDate: "-",
        eTime: "-",
        hr: "",
        submit: "ยังไม่ส่ง",
        copy: "",
        page: "",
        color: "",
        sub_date: formattedDate,
        staple_conner: "",
        staple_apart: "1-",
        calculator: "",
        answesheet: "",
        remark: "",
        answerbook_use: "0",
        room_name: "",
        fileexam: [],
      }));
      setLecturerOptions([]);
      setSelectedCourse(null);
      setIsOtherSelected(false);
      setNoExam(false);
      return;
    }

    let refNumber = parseInt(newRef);
    if (refNumber === 0) refNumber = 1;
    const maxRef = Math.max(...(dataE?.map((item) => parseInt(item.Ref)) || [1]));
    if (refNumber > maxRef) refNumber = maxRef;

    const selectedCourse = dataE?.find((item) => parseInt(item.Ref) === refNumber);
    const selectedDetail = dataExamDetail?.find((detail) => parseInt(detail.Ref) === refNumber);
    setNoExam(selectedDetail?.submit === "มีสอบแต่ไม่มีข้อสอบส่ง");

    if (selectedCourse) {
      const lecturers = selectedCourse.Lecturer.split(",").map((l) => l.trim());
      const combinedRoomNames =
        roomExamData
          ?.filter((room) => parseInt(room.roomexam.Ref) === parseInt(selectedCourse.Ref))
          ?.map((room) => room.rooms.room_name)
          ?.join(", ") || "-";

      const isSubmitted =
        selectedDetail?.submit === "ส่งแล้ว" ||
        selectedDetail?.submit === "รอการยืนยัน" ||
        selectedDetail?.submit === "มีสอบแต่ไม่มีข้อสอบส่ง";

      setData((prevData) => ({
        ...prevData,
        Ref: refNumber,
        NoSt: selectedCourse.No_st || "-",
        Lecturer: isSubmitted ? (selectedDetail?.Lecturer || lecturers[0] || "") : (lecturers[0] || ""),
        eDate: selectedCourse.Edate || "-",
        eTime: selectedCourse.Etime || "-",
        hr: selectedCourse.Hr || "",
        submit: selectedDetail?.submit || "ยังไม่ส่ง",
        copy: isSubmitted ? selectedDetail?.copy || "" : "",
        page: isSubmitted ? selectedDetail?.page || "" : "",
        color: selectedDetail?.color || "สีขาว",
        sub_date: formattedDate,
        staple_conner: isSubmitted ? selectedDetail?.staple_conner || "" : "",
        staple_apart: isSubmitted ? selectedDetail?.staple_apart || "1-" : "1-",
        calculator: isSubmitted ? selectedDetail?.calculator || "" : "",
        answesheet: isSubmitted ? selectedDetail?.answesheet || "" : "",
        remark: isSubmitted ? (selectedDetail?.remark || "") : "",
        answerbook_use: isSubmitted ? selectedDetail?.answerbook_use || "0" : "0",
        room_name: combinedRoomNames || "-",
        fileexam: [],
      }));

      setLecturerOptions(lecturers);
      setIsOtherSelected(false);
      setSelectedCourse({ value: refNumber, label: selectedCourse.Course });
    } else {
      setData((prevData) => ({
        ...prevData,
        Ref: refNumber,
        NoSt: "-",
        Lecturer: "",
        eDate: "-",
        eTime: "-",
        hr: "",
        submit: "ยังไม่ส่ง",
        copy: "",
        page: "",
        color: "",
        sub_date: formattedDate,
        staple_conner: "",
        staple_apart: "1-",
        calculator: "",
        answesheet: "",
        remark: "",
        answerbook_use: "0",
        fileexam: [],
      }));
      setLecturerOptions([]);
      setSelectedCourse(null);
      setIsOtherSelected(false);
    }
  };

  const handleKeyPress = (e) => {
    const keyCode = e.keyCode || e.which;
    const keyValue = String.fromCharCode(keyCode);
    if (!/^[0-9]+$/.test(keyValue)) e.preventDefault();
  };

  const [sectionCount, setSectionCount] = useState(1);
  const [sectionTexts, setSectionTexts] = useState({ 1: "" });

  const handleStapleCornerChange = (e) => {
    const value = e.target.value;
    setData((prevData) => ({
      ...prevData,
      staple_conner: value,
      staple_apart:
        value === "เย็บมุมรวม"
          ? `1 ตอน(หน้า 1 - ${prevData.page || ""})`
          : value === "เย็บแยกตอน"
            ? prevData.staple_apart
            : "",
    }));

    if (value === "เย็บมุมรวม") {
      setSectionCount(1);
      setSectionTexts({ 1: "" });
    } else if (value === "") {
      setData((prevData) => ({ ...prevData, staple_apart: "" }));
    }
  };

  const handleSectionCountChange = (e) => {
    const count = parseInt(e.target.value);
    setSectionCount(count);
    let newSectionTexts = {};
    for (let i = 1; i <= count; i++) newSectionTexts[i] = sectionTexts[i] || "";
    setSectionTexts(newSectionTexts);
    updateStapleApart(newSectionTexts);
  };

  const handleSectionTextChange = (sectionNumber, value) => {
    const newSectionTexts = { ...sectionTexts, [sectionNumber]: value };
    setSectionTexts(newSectionTexts);
    updateStapleApart(newSectionTexts);
  };

  const updateStapleApart = (texts) => {
    const nonEmptyTexts = Object.values(texts).filter((t) => t.trim() !== "");
    const count = nonEmptyTexts.length;
    const combinedText = nonEmptyTexts.join(",");
    const text = count > 0 ? `มี ${count} ตอน ${combinedText}` : "1 ตอน(หน้า 1 - )";
    setData((prevData) => ({ ...prevData, staple_apart: text }));
  };

  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [selectedLecturers, setSelectedLecturers] = useState([]);
  const [allLecturers, setAllLecturers] = useState([]);

  const handleLecturerChange = (selectedOption) => {
    if (!selectedOption) {
      setIsOtherSelected(false);
      setData((prevData) => ({ ...prevData, Lecturer: "" }));
      return;
    }
    if (selectedOption.value === "other") {
      setIsOtherSelected(true);
      setData((prevData) => ({ ...prevData, Lecturer: "" }));
    } else {
      setIsOtherSelected(false);
      setData((prevData) => ({ ...prevData, Lecturer: selectedOption.value }));
    }
  };

  const handleAnswerSheetChange = (e) => {
    const { name, value } = e.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
      answerbook_use:
        value === "ไม่ใช้กระดาษคำตอบ" ? "0" :
          value === "สมุดคำตอบ" || value === "กระดาษคอมพิวเตอร์" ? prevData.answerbook_use : "",
    }));
  };

  const handleAnswerBookCountChange = (e) => {
    const { name, value } = e.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleFileAdd = (e) => {
    const file = e.target.files[0];
    const maxFiles = parseInt(Data.copy) || 1;
    if (Data.fileexam?.length >= maxFiles) {
      alert(`สามารถอัพโหลดได้สูงสุด ${maxFiles} ไฟล์ ตามจำนวนชุดที่เลือก`);
      e.target.value = "";
      return;
    }
    if (file && file.type === "application/pdf") {
      setData((prevData) => ({ ...prevData, fileexam: [...(prevData.fileexam || []), file] }));
      setSubmissionData((prevData) => ({ ...prevData, fileexam: [...(prevData.fileexam || []), file] }));
    } else {
      alert("กรุณาเลือกไฟล์ PDF เท่านั้น");
    }
    e.target.value = "";
  };

  const handleFileRemove = (indexToRemove) => {
    setData((prevData) => ({
      ...prevData,
      fileexam: (prevData.fileexam || []).filter((_, index) => index !== indexToRemove),
    }));
    setSubmissionData((prevData) => ({
      ...prevData,
      fileexam: (prevData.fileexam || []).filter((_, index) => index !== indexToRemove),
    }));
  };

  const validateFiles = () => {
    if (!Data.fileexam?.length) return true;
    const nonPdfFiles = Data.fileexam.filter((file) => file.type !== "application/pdf");
    if (nonPdfFiles.length > 0) {
      alert("กรุณาอัพโหลดเฉพาะไฟล์ PDF เท่านั้น");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowAlert(false);

    // ประกอบข้อความ remark ให้แน่ใจก่อนส่ง
    const finalRemark = composeRemark(remarkChoice, remarkCount, Data.remark);
    if (finalRemark !== Data.remark) {
      setData((prev) => ({ ...prev, remark: finalRemark }));
    }

    if (!validateForm()) {
      setShowAlert(true);
      return;
    }

    try {
      const formData = new FormData();
      const dataToSend = {
        Ref: Data.Ref,
        Lecturer: Data.Lecturer,
        copy: Data.copy,
        page: Data.page,
        color: Data.color,
        sub_date: Data.sub_date,
        staple_conner: Data.staple_conner,
        staple_apart: Data.staple_apart,
        calculator: Data.calculator,
        answesheet: Data.answesheet,
        answerbook_use: Data.answerbook_use,
        remark: finalRemark, // ใช้ remark ที่ประกอบแล้ว
        submit: noExam ? "มีสอบแต่ไม่มีข้อสอบส่ง" : "รอการยืนยัน",
        exam_type: Data.exam_type,
      };

      formData.append("data", JSON.stringify(dataToSend));

      if (Data.exam_type === "สอบในตาราง" && !noExam && Data.fileexam && Data.fileexam.length > 0) {
        Data.fileexam.forEach((file) => {
          formData.append("fileexam[]", file);
        });
      }

      const response = await axios.post(`${url}/Edit_DetailExam`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (response.status === 200) {
        const newStatus =
          Data.exam_type === "สอบนอกตาราง"
            ? "มีสอบแต่ไม่มีข้อสอบส่ง"
            : noExam
              ? "มีสอบแต่ไม่มีข้อสอบส่ง"
              : "ส่งแล้ว";

        setData((prevData) => ({ ...prevData, submit: newStatus, exam_type: Data.exam_type }));

        await Promise.all([
          mutateExamTable(),
          mutateExamDetail((currentData) => {
            if (!currentData) return currentData;
            return currentData.map((item) =>
              item.Ref === Data.Ref ? { ...item, submit: newStatus, Lecturer: Data.Lecturer } : item
            );
          }, false),
        ]);

        alert("บันทึกข้อมูลสำเร็จ");
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`);
    }
  };

  const customStyles = {
    control: (provided) => ({ ...provided, backgroundColor: "#FFFFFF", borderColor: "#D1D5DB", minHeight: "44px", boxShadow: "none" }),
    singleValue: (provided) => ({ ...provided, color: "#111827" }),
    menu: (provided) => ({ ...provided, backgroundColor: "#FFFFFF" }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isFocused ? "#F3F4F6" : "#FFFFFF", color: "#111827", cursor: "pointer" }),
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container className="d-flex align-items-center justify-content-center py-5">
          <Row className="w-100">
            <Col className="mx-auto" md={10} lg={12}>
              <div className="form-container">
                <h2 className="text-center mb-4">โปรแกรมห้องข้อสอบ(ส่งข้อสอบสำหรับเจ้าหน้าที่ห้องข้อสอบ)</h2>

                {showAlert && (
                  <Alert variant="danger" onClose={() => setShowAlert(false)} dismissible>
                    กรุณากรอกข้อมูลให้ครบทุกช่องในรายละเอียดการสอบ
                  </Alert>
                )}

                <BootstrapForm onSubmit={handleSubmit}>
                  <BootstrapForm.Group controlId="course" className="mb-3">
                    <BootstrapForm.Label>ชื่อวิชา</BootstrapForm.Label>
                    <Select
                      options={
                        Array.isArray(dataE)
                          ? dataE.map((item) => ({ value: item.Ref, label: item.Course }))
                          : []
                      }
                      onChange={(selectedOption) => {
                        handleIdChangeWithCourse(selectedOption);
                        handleRefChange(selectedOption.value);
                      }}
                      value={selectedCourse}
                      styles={customStyles}
                      placeholder="เลือกชื่อวิชา"
                    />
                  </BootstrapForm.Group>

                  <Row className="mb-3">
                    <Col md={9}>
                      <BootstrapForm.Group controlId="Lecturer" className="mb-3">
                        <BootstrapForm.Label>อาจารย์ผู้ออกข้อสอบ</BootstrapForm.Label>
                        <Select
                          options={[
                            ...lecturerOptions.map((lecturer) => ({ value: lecturer, label: lecturer })),
                            { value: "other", label: "อื่นๆ" },
                          ]}
                          value={
                            isOtherSelected
                              ? { value: "other", label: "อื่นๆ" }
                              : Data.Lecturer
                                ? { value: Data.Lecturer, label: Data.Lecturer }
                                : null
                          }
                          onChange={handleLecturerChange}
                          styles={customStyles}
                        />
                      </BootstrapForm.Group>

                      {isOtherSelected && (
                        <BootstrapForm.Group controlId="otherLecturer" className="mb-3">
                          <BootstrapForm.Label>เลือกอาจารย์ผู้ออกข้อสอบ</BootstrapForm.Label>
                          <Select
                            options={
                              userData
                                ? userData.map((user) => ({ value: user.full_name, label: user.full_name }))
                                : []
                            }
                            value={Data.Lecturer ? { value: Data.Lecturer, label: Data.Lecturer } : null}
                            onChange={(selectedOption) => {
                              setData((prevData) => ({ ...prevData, Lecturer: selectedOption?.value || "" }));
                            }}
                            styles={customStyles}
                            placeholder="เลือกอาจารย์"
                          />
                        </BootstrapForm.Group>
                      )}
                    </Col>

                    <Col md={3}>
                      <BootstrapForm.Group controlId="Ref" className="mb-3">
                        <BootstrapForm.Label>ลำดับ</BootstrapForm.Label>
                        <BootstrapForm.Control
                          type="number"
                          name="Ref"
                          value={Data.Ref}
                          onChange={(e) => handleRefChange(e.target.value)}
                          onKeyPress={handleKeyPress}
                          min="1"
                          max={maxRef}
                          onKeyDown={(e) => {
                            const allowedKeys = ["ArrowUp", "ArrowDown", "Backspace", "Delete"];
                            if (!allowedKeys.includes(e.key) && !/[0-9]/.test(e.key)) e.preventDefault();
                          }}
                        />
                      </BootstrapForm.Group>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={4}>
                      <BootstrapForm.Group controlId="exam_type" className="mb-3">
                        <BootstrapForm.Label>สถานะการสอบ</BootstrapForm.Label>
                        <BootstrapForm.Select
                          name="exam_type"
                          value={Data.exam_type || "สอบในตาราง"}
                          style={inputStyle("exam_type")}
                          onChange={handleChange}
                        >
                          <option value="สอบในตาราง">สอบในตาราง</option>
                          <option value="สอบนอกตาราง">สอบนอกตาราง</option>
                        </BootstrapForm.Select>
                      </BootstrapForm.Group>
                    </Col>
                  </Row>

                  {Data.exam_type === "สอบในตาราง" && (
                    <>
                      <Row className="mb-3">
                        <Col md={4}>
                          <BootstrapForm.Group controlId="eDate" className="mb-3">
                            <BootstrapForm.Label>วันสอบ</BootstrapForm.Label>
                            <BootstrapForm.Control type="text" name="eDate" value={Data.eDate} readOnly />
                          </BootstrapForm.Group>
                        </Col>
                        <Col md={4}>
                          <BootstrapForm.Group controlId="eTime" className="mb-3">
                            <BootstrapForm.Label>เวลาสอบ</BootstrapForm.Label>
                            <BootstrapForm.Control type="text" name="eTime" value={Data.eTime} readOnly />
                          </BootstrapForm.Group>
                        </Col>
                        <Col md={4}>
                          <BootstrapForm.Group controlId="examRoom" className="mb-3">
                            <BootstrapForm.Label>ห้องสอบ</BootstrapForm.Label>
                            <BootstrapForm.Control type="text" name="examRoom" value={Data.room_name} readOnly />
                          </BootstrapForm.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  <Row className="mb-3">
                    <Col md={4}>
                      <BootstrapForm.Group controlId="hr" className="mb-3">
                        <BootstrapForm.Label>ชั่วโมงการสอบ</BootstrapForm.Label>
                        <BootstrapForm.Control type="text" name="hr" value={Data.hr} readOnly />
                      </BootstrapForm.Group>
                    </Col>
                    <Col md={4}>
                      <BootstrapForm.Group controlId="NoSt" className="mb-3">
                        <BootstrapForm.Label>จำนวน นศ.</BootstrapForm.Label>
                        <BootstrapForm.Control type="text" name="NoSt" value={Data.NoSt} readOnly />
                      </BootstrapForm.Group>
                    </Col>
                    <Col md={4}>
                      <BootstrapForm.Group controlId="submit" className="mb-3">
                        <BootstrapForm.Label>สถานะการส่งข้อสอบ</BootstrapForm.Label>
                        <BootstrapForm.Control type="text" name="submit" value={Data.submit} readOnly />
                      </BootstrapForm.Group>
                    </Col>
                  </Row>

                  <Form.Group controlId="noExamCheckbox" className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="มีสอบแต่ไม่มีข้อสอบส่ง"
                      checked={noExam}
                      onChange={(e) => setNoExam(e.target.checked)}
                    />
                  </Form.Group>

                  {Data.exam_type === "สอบในตาราง" && !noExam && (
                    <>
                      <h2 className="text-center mb-4">รายละเอียดการสอบ</h2>

                      <Row className="mb-3">
                        <Col md={4}>
                          <BootstrapForm.Group controlId="copy" className="mb-3">
                            <BootstrapForm.Label>จำนวนชุด</BootstrapForm.Label>
                            <BootstrapForm.Select name="copy" value={Data.copy} onChange={handleChange} style={inputStyle("copy")}>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="4">4</option>
                            </BootstrapForm.Select>
                          </BootstrapForm.Group>
                        </Col>
                        <Col md={4}>
                          <BootstrapForm.Group controlId="page" className="mb-3">
                            <BootstrapForm.Label>จำนวนหน้า</BootstrapForm.Label>
                            <BootstrapForm.Control
                              type="text"
                              name="page"
                              value={Data.page}
                              onChange={handleChange}
                              style={inputStyle("page")}
                              onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                              inputMode="numeric"
                              pattern="[0-9]*"
                            />
                          </BootstrapForm.Group>
                        </Col>
                        <Col md={4}>
                          <BootstrapForm.Group controlId="color" className="mb-3">
                            <BootstrapForm.Label>สี</BootstrapForm.Label>
                            <BootstrapForm.Control type="text" name="color" value={Data.color} readOnly />
                          </BootstrapForm.Group>
                        </Col>
                      </Row>

                      <Row className="mb-3">
                        <Col md={2}>
                          <BootstrapForm.Group controlId="sub_date" className="mb-3">
                            <BootstrapForm.Label>วันที่ส่ง</BootstrapForm.Label>
                            <BootstrapForm.Control type="text" name="sub_date" value={Data.sub_date} readOnly />
                          </BootstrapForm.Group>
                        </Col>
                        <Col md={2}>
                          <BootstrapForm.Group controlId="staple_conner" className="mb-3">
                            <BootstrapForm.Label>เย็บมุม</BootstrapForm.Label>
                            <BootstrapForm.Select
                              name="staple_conner"
                              value={Data.staple_conner}
                              onChange={handleStapleCornerChange}
                              style={inputStyle("staple_conner")}
                            >
                              <option value="">กรุณาเลือก</option>
                              <option value="เย็บมุมรวม">เย็บมุมรวม</option>
                              <option value="เย็บแยกตอน">เย็บแยกตอน</option>
                            </BootstrapForm.Select>
                          </BootstrapForm.Group>
                        </Col>

                        {Data.staple_conner === "เย็บแยกตอน" && (
                          <Col md={2}>
                            <BootstrapForm.Group controlId="sectionCount" className="mb-3">
                              <BootstrapForm.Label>จำนวนตอน</BootstrapForm.Label>
                              <BootstrapForm.Select value={sectionCount} onChange={handleSectionCountChange}>
                                {[...Array(15)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                              </BootstrapForm.Select>
                            </BootstrapForm.Group>
                          </Col>
                        )}
                      </Row>

                      {Data.staple_conner === "เย็บแยกตอน" && (
                        <Row className="mb-3">
                          {[...Array(sectionCount)].map((_, i) => (
                            <Col md={3} key={i}>
                              <BootstrapForm.Group controlId={`section-${i + 1}`} className="mb-3">
                                <BootstrapForm.Label>ตอนที่ {i + 1}</BootstrapForm.Label>
                                <BootstrapForm.Control
                                  type="text"
                                  value={sectionTexts[i + 1] || ""}
                                  onChange={(e) => handleSectionTextChange(i + 1, e.target.value)}
                                  placeholder="รายละเอียดตอน"
                                />
                              </BootstrapForm.Group>
                            </Col>
                          ))}
                        </Row>
                      )}

                      <Row className="mb-3">
                        <Col>
                          <BootstrapForm.Group controlId="staple_apart">
                            <BootstrapForm.Label>จำนวนตอน</BootstrapForm.Label>
                            <BootstrapForm.Control type="text" value={Data.staple_apart} readOnly />
                          </BootstrapForm.Group>
                        </Col>
                      </Row>

                      <Row className="mb-3">
                        <Col md={3}>
                          <BootstrapForm.Group controlId="calculator" className="mb-3">
                            <BootstrapForm.Label>เครื่องคิดเลข</BootstrapForm.Label>
                            <BootstrapForm.Select
                              name="calculator"
                              value={Data.calculator}
                              onChange={handleChange}
                              style={inputStyle("calculator")}
                            >
                              <option value={null}>กรุณาเลือก</option>
                              <option value="อนุญาต">อนุญาตให้ใช้</option>
                              <option value="ไม่อนุญาต">ไม่อนุญาตให้ใช้</option>
                            </BootstrapForm.Select>
                          </BootstrapForm.Group>
                        </Col>

                        <Col md={3}>
                          <BootstrapForm.Group controlId="answesheet" className="mb-3">
                            <BootstrapForm.Label>กระดาษคำตอบ</BootstrapForm.Label>
                            <BootstrapForm.Select
                              name="answesheet"
                              value={Data.answesheet}
                              onChange={handleAnswerSheetChange}
                              style={inputStyle("answesheet")}
                            >
                              <option value="">กรุณาเลือก</option>
                              <option value="ไม่ใช้">ไม่ใช้กระดาษคำตอบ</option>
                              <option value="กระดาษคอมพิวเตอร์">กระดาษคอมพิวเตอร์</option>
                              <option value="สมุดคำตอบ">สมุดคำตอบ</option>
                            </BootstrapForm.Select>
                          </BootstrapForm.Group>
                        </Col>

                        {(Data.answesheet === "สมุดคำตอบ" || Data.answesheet === "กระดาษคอมพิวเตอร์") && (
                          <Col md={3}>
                            <BootstrapForm.Group controlId="answerbook_use" className="mb-3">
                              <BootstrapForm.Label>จำนวนเล่มต่อ 1 คน</BootstrapForm.Label>
                              <BootstrapForm.Control
                                type="text"
                                name="answerbook_use"
                                value={Data.answerbook_use}
                                onChange={handleAnswerBookCountChange}
                                min="1"
                                onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                                inputMode="numeric"
                                pattern="[0-9]*"
                              />
                            </BootstrapForm.Group>
                          </Col>
                        )}
                      </Row>

                      {/* ======= หมายเหตุ (เวอร์ชันเสถียรสุด) ======= */}
                      <BootstrapForm.Group controlId="remark" className="mb-3">
                        <BootstrapForm.Label>หมายเหตุ</BootstrapForm.Label>
                        <BootstrapForm.Select
                          value={remarkChoice}
                          onChange={(e) => {
                            const choice = e.target.value;
                            setRemarkChoice(choice);
                            setRemarkCount("");
                            // เคลียร์ remark เดิมก่อนทุกครั้ง
                            setData((prev) => ({ ...prev, remark: "" }));

                            // หน่วง 1 tick เพื่อให้ React clear state ก่อน set ใหม่
                            setTimeout(() => {
                              if (choice === "note" || choice === "none") {
                                setData((prev) => ({
                                  ...prev,
                                  remark: composeRemark(choice, "", ""),
                                }));
                              } else if (choice === "a4_double" || choice === "a4_hand") {
                                setData((prev) => ({
                                  ...prev,
                                  remark: composeRemark(choice, "", ""),
                                }));
                              } else if (choice === "other") {
                                setData((prev) => ({ ...prev, remark: "" }));
                              }
                            }, 0);
                          }}
                          style={inputStyle("remark")}
                        >
                          <option value="-">กรุณาเลือก</option>
                          <option value="note">นำกระดาษโน้ตเข้าห้องสอบได้</option>
                          <option value="none">ไม่มี -</option>
                          <option value="a4_double">อนุญาต A4 ... แผ่นหน้าหลัง</option>
                          <option value="a4_hand">
                            อนุญาต A4 เข้าได้ ... หน้า (ที่เขียนด้วยลายมือตัวเอง)
                          </option>
                          <option value="other">อื่นๆ...</option>
                        </BootstrapForm.Select>
                      </BootstrapForm.Group>

                      {/* ช่องกรอกเฉพาะ A4 */}
                      {(remarkChoice === "a4_double" || remarkChoice === "a4_hand") && (
                        <BootstrapForm.Group controlId="remarkCount" className="mb-4">
                          <BootstrapForm.Label>
                            {remarkChoice === "a4_double"
                              ? "จำนวนแผ่น (A4 หน้าหลัง)"
                              : "จำนวนหน้า (A4 ที่เขียนด้วยลายมือตัวเอง)"}
                          </BootstrapForm.Label>
                          <BootstrapForm.Control
                            type="number"
                            min="1"
                            placeholder="กรอกจำนวน"
                            value={remarkCount}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^\d]/g, "");
                              setRemarkCount(v);
                              setData((prev) => ({
                                ...prev,
                                remark: composeRemark(remarkChoice, v, ""),
                              }));
                            }}
                          />
                        </BootstrapForm.Group>
                      )}

                      {/* ช่องกรอกเฉพาะ “อื่นๆ...” */}
                      {remarkChoice === "other" && (
                        <BootstrapForm.Group controlId="customRemark" className="mb-4">
                          <BootstrapForm.Label>กรอกหมายเหตุ</BootstrapForm.Label>
                          <BootstrapForm.Control
                            type="text"
                            placeholder="กรุณากรอกหมายเหตุ"
                            value={Data.remark}
                            onChange={(e) =>
                              setData((prev) => ({ ...prev, remark: e.target.value }))
                            }
                          />
                        </BootstrapForm.Group>
                      )}



                      {/* อัพโหลดไฟล์ PDF */}
                      <BootstrapForm.Group controlId="fileexam" className="mb-4">
                        <BootstrapForm.Label>อัพโหลดไฟล์ข้อสอบ (เฉพาะ PDF)</BootstrapForm.Label>
                        <div className="d-flex flex-column gap-2">
                          <BootstrapForm.Control
                            type="file"
                            name="fileexam"
                            onChange={handleFileAdd}
                            accept=".pdf,application/pdf"
                          />

                          {Data.fileexam?.length > 0 && (
                            <div className="mt-2">
                              <strong>ไฟล์ PDF ที่เลือก ({Data.fileexam.length}/{Data.copy} ไฟล์):</strong>
                              <ul className="list-group mt-2">
                                {Data.fileexam.map((file, index) => (
                                  <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span className="text-break">
                                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                    </span>
                                    <div className="d-flex gap-2">
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => {
                                          const url = URL.createObjectURL(file);
                                          const link = document.createElement("a");
                                          link.href = url;
                                          link.download = file.name;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          URL.revokeObjectURL(url);
                                        }}
                                      >
                                        ดาวน์โหลด
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleFileRemove(index)}
                                      >
                                        ลบ
                                      </Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </BootstrapForm.Group>
                    </>
                  )}

                  <div className="d-flex justify-content-end">
                    <div className="flex-row">
                      <ExamInfoComponent data={Data} />
                      <Altexamcalform data={Data} />
                      <AddCourseButton />
                      <DownloadButton examRef={Data.Ref} className="me-2" />
                      <Button
                        type="submit"
                        variant="primary"
                        style={{ width: "160px", whiteSpace: "nowrap", overflow: "hidden", height: "45px" }}
                      >
                        ส่งข้อสอบ
                      </Button>
                    </div>
                  </div>
                </BootstrapForm>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default DetailExamForm;
