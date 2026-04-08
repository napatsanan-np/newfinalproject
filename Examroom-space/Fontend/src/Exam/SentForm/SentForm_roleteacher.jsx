// SentForm_roleteacher.jsx
import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  Container,
  Row,
  Col,
  Form as BootstrapForm,
  Button,
  Alert,
  Form,
} from "react-bootstrap";
import Select from "react-select";
import axios from "axios";
import SidebarMenu from "../../Navbar/SidebarMenu.jsx";
import "./NewForm-styles.css";
import "./NewForm-fonts.css";
import DownloadButton from "./DownloadButton.jsx";
import ExamSubmitButton from "./ExamSubmitButton";

const Sentform_roleteacher = () => {
  const url = localStorage.getItem("API");
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const currentDate = new Date();
  const buddhistYear = currentDate.getFullYear() + 543;

  const [noExam, setNoExam] = useState(false);
  const formattedDate = `${currentDate.getDate()}-${(
    "0" + (currentDate.getMonth() + 1)
  ).slice(-2)}-${buddhistYear}`;

  // ---------------- State หลัก ----------------
  const [Data, setData] = useState({
    Ref: "",
    id_config: "",
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
    answerbook_use: "",
    remark: "",
    color: "",
    eDate: "",
    eTime: "",
    hr: "",
    answerBookCount: "",
    fileexam: [],
    exam_type: "สอบในตาราง",
  });

  // ---------- Remark (A4) โหมด/จำนวน (ใหม่) ----------
  // preset (=รายการที่กำหนดไว้)
  // A4_BOTH (=อนุญาต A4 ... แผ่นหน้าหลัง)
  // A4_PAGES (=อนุญาต A4 เข้าได้ ... หน้า(ลายมือ))
  // CUSTOM (=อื่นๆ พิมพ์เอง)
  const [remarkMode, setRemarkMode] = useState("preset");
  const [a4SheetCount, setA4SheetCount] = useState(""); // จำนวนแผ่น A4 หันหน้าหลัง
  const [a4PageCount, setA4PageCount] = useState("");   // จำนวนหน้า (ลายมือ)

  const resolveRemarkText = (mode, sheet, page, base = Data.remark) => {
    if (mode === "A4_BOTH") {
      return `อนุญาต A4 ... แผ่นหน้าหลัง : ${sheet || 0} แผ่น`;
    }
    if (mode === "A4_PAGES") {
      return `อนุญาต A4 เข้าได้ ... หน้า (ลายมือ) : ${page || 0} หน้า`;
    }
    if (mode === "preset") return base || "";
    if (mode === "CUSTOM") return base || "";
    return base || "";
  };

  // parse remark เดิม (ถ้ามี) ให้ตั้งโหมดและจำนวนให้สอดคล้อง
  const parseRemark = (text) => {
    if (!text) {
      setRemarkMode("preset");
      setA4SheetCount("");
      setA4PageCount("");
      return;
    }
    const bothRe = /^อนุญาต A4 .*แผ่นหน้าหลัง\s*:\s*(\d+)\s*แผ่น/;
    const pagesRe = /^อนุญาต A4 เข้าได้ .*หน้า.*:\s*(\d+)\s*หน้า/;

    if (bothRe.test(text)) {
      const m = text.match(bothRe);
      setRemarkMode("A4_BOTH");
      setA4SheetCount(m?.[1] || "");
      setA4PageCount("");
      return;
    }
    if (pagesRe.test(text)) {
      const m = text.match(pagesRe);
      setRemarkMode("A4_PAGES");
      setA4PageCount(m?.[1] || "");
      setA4SheetCount("");
      return;
    }
    // รายการ preset เดิม
    if (text === "นำกระดาษโน้ตห้องข้อสอบได้" || text === "-") {
      setRemarkMode("preset");
      setA4SheetCount("");
      setA4PageCount("");
      return;
    }
    // อื่น ๆ
    setRemarkMode("CUSTOM");
    setA4SheetCount("");
    setA4PageCount("");
  };

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
      remark: Data.remark,
      fileexam: Data.fileexam || [],
    });
  }, [Data]);

  // ---------------- SWR fetchers ----------------
  const fetcher = async (url) => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  };

  // ตารางสอบสำหรับอาจารย์
  const { data: dataE = [], mutate: mutateExamTable } = useSWR(
    `${url}/teacher/GetExamtable`,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        const allUniqueLecturers = [
          ...new Set((data ?? []).flatMap((item) =>
            (item?.Lecturer ?? "").split(",").map((t) => t.trim())
          )),
        ].filter(Boolean);
        setAllLecturers(allUniqueLecturers);
      },
    }
  );

  // รายละเอียดการส่งข้อสอบ
  const { data: dataExamDetail = [], mutate: mutateExamDetail } = useSWR(
    `${url}/teacher/fetch/detail_exam`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // ---------------- Helper mapping ----------------
  const formattedExamData = (dataE ?? []).map((item) => ({
    ref: item?.Ref ?? "",
    course: item?.Course ?? "",
    lecturers: (item?.Lecturer ?? "").split(",").map((t) => t.trim()),
    eDate: item?.Edate ?? "",
    eTime: item?.Etime ?? "",
    hr: item?.Hr ?? "",
    NoSt: item?.Num_st ?? 0,
    label: item?.Course ?? "",
  }));

  const formattedExamDetail = (dataExamDetail ?? []).map((item) => ({
    ref: item?.Ref ?? "",
    no_st: item?.no_st ?? 0,
    submit: item?.submit ?? "",
    copy: item?.copy ?? "",
    page: item?.page ?? "",
    recive: item?.recive ?? "",
    recDate: item?.recDate ?? "",
    qty: item?.qty ?? 0,
    staple_conner: item?.staple_conner ?? false,
    staple_apart: item?.staple_apart ?? false,
    calculator: item?.calculator ?? false,
    answesheet: item?.answesheet ?? "",
    answerbook_use: item?.answerbook_use ?? "",
    remark: item?.remark ?? "",
    color: item?.color ?? "",
  }));

  // ---------------- UI States ----------------
  const [lecturerOptions, setLecturerOptions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sectionCountLocal, setSectionCountLocal] = useState(1);
  const [sectionTexts, setSectionTexts] = useState({ 1: "" });
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [selectedLecturers, setSelectedLecturers] = useState([]);
  const [allLecturers, setAllLecturers] = useState([]);
  const [errors, setErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);

  // ---------------- Validations ----------------
  const validateForm = () => {
    if (noExam) return true;

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

  const inputStyle = (fieldName) => ({
    borderColor: errors[fieldName] ? "red" : undefined,
  });

  // ---------------- Handlers ----------------
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "page" && next.staple_conner === "เย็บมุมรวม") {
        next.staple_apart = `1 ตอน(หน้า 1 - ${value})`;
      }
      return next;
    });
  };

  const handleIdChangeWithCourse = (selectedOption) => {
    handleRefChange(selectedOption.value);
  };
  const handleRefChange = (newRef) => {
    newRef = parseInt(newRef);
    const selectedCourse = dataE?.find((it) => parseInt(it.Ref) === newRef);
    const selectedDetail = dataExamDetail?.find(
      (d) => parseInt(d.Ref) === newRef
    );

    if (selectedCourse) {
      const lecturers = (selectedCourse.Lecturer || "")
        .split(",")
        .map((t) => t.trim());
      const remarkText = selectedDetail?.remark || "";

      setData((prev) => ({
        ...prev,
        Ref: newRef,
        id_config: selectedDetail?.id_config || prev.id_config || "",
        NoSt: selectedCourse.No_st || "-",
        Lecturer: lecturers[0] || "",
        eDate: selectedCourse.Edate || "-",
        eTime: selectedCourse.Etime || "-",
        hr: selectedCourse.Hr || "",
        submit: selectedDetail?.submit || "ยังไม่ส่ง",
        copy: selectedDetail?.copy || "",
        page: selectedDetail?.page || "",
        color: selectedDetail?.color || "------",
        sub_date: formattedDate,
        staple_conner: selectedDetail?.staple_conner || "",
        staple_apart: selectedDetail?.staple_apart || "1-",
        calculator: selectedDetail?.calculator || "",
        answesheet: selectedDetail?.answesheet || "",
        remark: remarkText || "",
        answerbook_use: selectedDetail?.answerbook_use || "",
        fileexam: selectedDetail?.fileexam || [],
      }));

      parseRemark(remarkText);

      setLecturerOptions(lecturers);
      setIsOtherSelected(false);
      setSelectedCourse({ value: newRef, label: selectedCourse.Course });
    } else {
      setData((prev) => ({
        ...prev,
        Ref: newRef,
        id_config: "",
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
        answerbook_use: "",
        fileexam: [],
      }));
      setLecturerOptions([]);
      setSelectedCourse(null);
      setIsOtherSelected(false);
      setRemarkMode("preset");
      setA4SheetCount("");
      setA4PageCount("");
    }
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
      setData((prev) => ({
        ...prev,
        fileexam: [...(prev.fileexam || []), file],
      }));
      setSubmissionData((prev) => ({
        ...prev,
        fileexam: [...(prev.fileexam || []), file],
      }));
    } else {
      alert("กรุณาเลือกไฟล์ PDF เท่านั้น");
    }
    e.target.value = "";
  };

  const handleFileRemove = (indexToRemove) => {
    setData((prev) => ({
      ...prev,
      fileexam: (prev.fileexam || []).filter((_, i) => i !== indexToRemove),
    }));
    setSubmissionData((prev) => ({
      ...prev,
      fileexam: (prev.fileexam || []).filter((_, i) => i !== indexToRemove),
    }));
  };

  const validateFiles = () => {
    if (!Data.fileexam?.length) return true;
    const nonPdfFiles = Data.fileexam.filter(
      (file) => file.type !== "application/pdf"
    );
    if (nonPdfFiles.length > 0) {
      alert("กรุณาอัพโหลดเฉพาะไฟล์ PDF เท่านั้น");
      return false;
    }
    return true;
  };

  const handleStapleCornerChange = (e) => {
    const value = e.target.value;
    setData((prev) => ({
      ...prev,
      staple_conner: value,
      staple_apart:
        value === "เย็บมุมรวม"
          ? `1 ตอน(หน้า 1 - ${prev.page || ""})`
          : value === "เย็บแยกตอน"
            ? prev.staple_apart
            : "",
    }));

    if (value === "เย็บมุมรวม") {
      setSectionCount(1);
      setSectionTexts({ 1: "" });
    } else if (value === "") {
      setData((prev) => ({ ...prev, staple_apart: "" }));
    }
  };

  const [sectionCount, setSectionCountState] = useState(1); // shadow safe
  const setSectionCount = (n) => setSectionCountState(n);
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
    const nonEmpty = Object.values(texts).filter((t) => t.trim() !== "");
    const cnt = nonEmpty.length;
    const combined = nonEmpty.join(",");
    const stapleApartText = cnt > 0 ? `มี ${cnt} ตอน ${combined}` : "1 ตอน(หน้า 1 - )";
    setData((prev) => ({ ...prev, staple_apart: stapleApartText }));
  };

  const handleLecturerChange = (opt) => {
    if (!opt) {
      setIsOtherSelected(false);
      setData((prev) => ({ ...prev, Lecturer: "" }));
      return;
    }
    if (opt.value === "other") {
      setIsOtherSelected(true);
      setData((prev) => ({ ...prev, Lecturer: "" }));
    } else {
      setIsOtherSelected(false);
      setData((prev) => ({ ...prev, Lecturer: opt.value }));
    }
  };

  const handleMultipleLecturers = (opts) => {
    const names = opts.map((o) => o.value);
    setSelectedLecturers(opts);
    setData((prev) => ({ ...prev, Lecturer: names.join(", ") }));
  };

  const handleAnswerSheetChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
      answerbook_use: value === "สมุดคำตอบ" ? prev.answerbook_use : "",
    }));
  };

  const handleAnswerBookCountChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------------- Submit ----------------
const handleSubmit = async (e) => {
  e.preventDefault();
  setShowAlert(false);

  const finalRemark = resolveRemarkText(
    remarkMode,
    a4SheetCount,
    a4PageCount,
    Data.remark
  );

  if (finalRemark !== Data.remark) {
    setData((prev) => ({ ...prev, remark: finalRemark }));
  }

  if (!validateForm()) {
    setShowAlert(true);
    return;
  }

  if (!validateFiles()) return;

  if (!Data.id_config) {
    alert("ไม่พบ id_config กรุณาเลือกวิชาใหม่อีกครั้ง");
    return;
  }

  try {
    const formData = new FormData();

    const computedSubmit =
      noExam || Data.exam_type === "สอบนอกตาราง"
        ? "มีสอบแต่ไม่มีข้อสอบส่ง"
        : "รอการยืนยัน";

    const dataToSend = {
      Ref: Data.Ref,
      id_config: Number(Data.id_config),
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
      remark: finalRemark,
      submit: computedSubmit,
      exam_type: Data.exam_type,
    };

    formData.append("data", JSON.stringify(dataToSend));

    const allowFiles = Data.exam_type === "สอบในตาราง" && !noExam;
    if (allowFiles && Data.fileexam && Data.fileexam.length > 0) {
      Data.fileexam.forEach((file) => formData.append("fileexam[]", file));
    }

    setData((prev) => ({ ...prev, submit: computedSubmit }));

    const response = await axios.post(
      `${url}/teacher/Edit_DetailExam`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      }
    );

    if (response.status === 200) {
      setData((prev) => ({
        ...prev,
        submit: computedSubmit,
        exam_type: Data.exam_type,
      }));

      await Promise.all([
        mutateExamTable(),
        mutateExamDetail(
          (currentData) => {
            if (!currentData) return currentData;
            return currentData.map((item) =>
              item.Ref === Data.Ref
                ? {
                    ...item,
                    submit: computedSubmit,
                    Lecturer: Data.Lecturer,
                    id_config: Number(Data.id_config),
                  }
                : item
            );
          },
          false
        ),
      ]);

      alert("บันทึกข้อมูลสำเร็จ");
    }
  } catch (error) {
    console.error("Error submitting data:", error);

    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error.message ||
      "เกิดข้อผิดพลาดในการบันทึกข้อมูล";

    setData((prev) => ({ ...prev, submit: prev.submit }));
    alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${errorMessage}`);
  }
};

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: "#FFFFFF",
      borderColor: "#D1D5DB",
      minHeight: "44px",
      boxShadow: "none",
    }),
    singleValue: (provided) => ({ ...provided, color: "#111827" }),
    menu: (provided) => ({ ...provided, backgroundColor: "#FFFFFF" }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#F3F4F6" : "#FFFFFF",
      color: "#111827",
      cursor: "pointer",
    }),
  };

  return (
    <>
      <SidebarMenu />
      <div className="custom-background">
        <Container className="d-flex align-items-center justify-content-center py-5">
          <Row className="w-100">
            <Col className="mx-auto" md={10} lg={12}>
              <div className="form-container">
                <h2 className="text-center mb-4">
                  โปรแกรมห้องข้อสอบ (ส่งข้อสอบสำหรับอาจารย์)
                </h2>

                {showAlert && (
                  <Alert
                    variant="danger"
                    onClose={() => setShowAlert(false)}
                    dismissible
                  >
                    กรุณากรอกข้อมูลให้ครบทุกช่องในรายละเอียดการสอบ
                  </Alert>
                )}

                <BootstrapForm onSubmit={handleSubmit}>
                  {/* เลือกชื่อวิชา */}
                  <BootstrapForm.Group controlId="course" className="mb-3">
                    <BootstrapForm.Label>ชื่อวิชา</BootstrapForm.Label>
                    <Select
                      options={
                        Array.isArray(dataE)
                          ? dataE.map((item) => ({
                            value: item.Ref,
                            label: item.Course,
                          }))
                          : []
                      }
                      onChange={(opt) => {
                        handleIdChangeWithCourse(opt);
                        handleRefChange(opt.value);
                      }}
                      value={selectedCourse}
                      styles={customStyles}
                      placeholder="เลือกชื่อวิชา"
                    />
                  </BootstrapForm.Group>

                  {/* ผู้สอน */}
                  <Row className="mb-3">
                    <Col md={9}>
                      <BootstrapForm.Group controlId="Lecturer" className="mb-3">
                        <BootstrapForm.Label>อาจารย์ผู้ออกข้อสอบ</BootstrapForm.Label>
                        <Select
                          options={[
                            ...lecturerOptions.map((lecturer) => ({
                              value: lecturer,
                              label: lecturer,
                            })),
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
                        <BootstrapForm.Group
                          controlId="otherLecturer"
                          className="mb-3"
                        >
                          <BootstrapForm.Label>เลือกอาจารย์ผู้ออกข้อสอบ</BootstrapForm.Label>
                          <Select
                            options={allLecturers.map((lecturer) => ({
                              value: lecturer,
                              label: lecturer,
                            }))}
                            value={
                              Data.Lecturer
                                ? { value: Data.Lecturer, label: Data.Lecturer }
                                : null
                            }
                            onChange={(opt) =>
                              setData((prev) => ({
                                ...prev,
                                Lecturer: opt?.value || "",
                              }))
                            }
                            styles={customStyles}
                            placeholder="เลือกอาจารย์"
                          />
                        </BootstrapForm.Group>
                      )}
                    </Col>
                  </Row>

                  {/* สถานะการสอบ */}
                  <Row className="mb-3">
                    <Col md={4}>
                      <BootstrapForm.Group controlId="exam_type" className="mb-3">
                        <BootstrapForm.Label>สถานะการสอบ</BootstrapForm.Label>
                        <BootstrapForm.Select
                          name="exam_type"
                          value={Data.exam_type}
                          onChange={(e) => {
                            const v = e.target.value;
                            setData(prev => ({
                              ...prev,
                              exam_type: v,
                              ...(v === "สอบนอกตาราง"
                                ? {
                                  copy: "", page: "", staple_conner: "", staple_apart: "",
                                  calculator: "", answesheet: "", answerbook_use: "",
                                  fileexam: []
                                }
                                : {}),
                            }));
                          }}
                        >
                          <option value="สอบในตาราง">สอบในตาราง</option>
                          <option value="สอบนอกตาราง">สอบนอกตาราง</option>
                        </BootstrapForm.Select>
                      </BootstrapForm.Group>
                    </Col>
                  </Row>

                  {/* วัน/เวลา/สถานะ */}
                  <Row className="mb-3">
                    <Col md={6}>
                      <BootstrapForm.Group controlId="eDate" className="mb-3">
                        <BootstrapForm.Label>วันสอบ</BootstrapForm.Label>
                        <BootstrapForm.Control
                          type="text" name="eDate"
                          value={Data.eDate} onChange={handleChange} readOnly
                        />
                      </BootstrapForm.Group>
                    </Col>
                    <Col md={6}>
                      <BootstrapForm.Group controlId="eTime" className="mb-3">
                        <BootstrapForm.Label>เวลาสอบ</BootstrapForm.Label>
                        <BootstrapForm.Control
                          type="text" name="eTime"
                          value={Data.eTime} onChange={handleChange} readOnly
                        />
                      </BootstrapForm.Group>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={4}>
                      <BootstrapForm.Group controlId="hr" className="mb-3">
                        <BootstrapForm.Label>ชั่วโมงการสอบ</BootstrapForm.Label>
                        <BootstrapForm.Control
                          type="text" name="hr"
                          value={Data.hr} onChange={handleChange} readOnly
                        />
                      </BootstrapForm.Group>
                    </Col>
                    <Col md={4}>
                      <BootstrapForm.Group controlId="NoSt" className="mb-3">
                        <BootstrapForm.Label>จำนวน นศ.</BootstrapForm.Label>
                        <BootstrapForm.Control
                          type="text" name="NoSt"
                          value={Data.NoSt} onChange={handleChange} readOnly
                        />
                      </BootstrapForm.Group>
                    </Col>
                    <Col md={4}>
                      <BootstrapForm.Group controlId="submit" className="mb-3">
                        <BootstrapForm.Label>สถานะการส่งข้อสอบ</BootstrapForm.Label>
                        <BootstrapForm.Control
                          type="text" name="submit"
                          value={Data.submit} onChange={handleChange} readOnly
                        />
                      </BootstrapForm.Group>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={8} className="d-flex align-items-end">
                      <Form.Group controlId="noExamCheckbox" className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="มีสอบแต่ไม่มีข้อสอบส่ง"
                          checked={noExam}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNoExam(checked);
                            if (checked) {
                              setData((prev) => ({ ...prev, fileexam: [] }));
                            }
                          }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* รายละเอียดการสอบ — แสดงเฉพาะ "สอบในตาราง" และไม่ได้ติ๊กไม่มีข้อสอบ */}
                  {Data.exam_type === "สอบในตาราง" && !noExam && (
                    <>
                      <h2 className="text-center mb-4">รายละเอียดการสอบ</h2>

                      <Row className="mb-3">
                        <Col md={4}>
                          <BootstrapForm.Group controlId="copy" className="mb-3">
                            <BootstrapForm.Label>จำนวนชุด</BootstrapForm.Label>
                            <BootstrapForm.Select
                              name="copy"
                              value={Data.copy}
                              onChange={handleChange}
                              style={inputStyle("copy")}
                            >
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
                              type="text" name="page"
                              value={Data.page}
                              onChange={handleChange}
                              style={inputStyle("page")}
                              onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                              inputMode="numeric" pattern="[0-9]*"
                            />
                          </BootstrapForm.Group>
                        </Col>
                        <Col md={4}>
                          <BootstrapForm.Group controlId="color" className="mb-3">
                            <BootstrapForm.Label>สี</BootstrapForm.Label>
                            <BootstrapForm.Control
                              type="text" name="color"
                              value={Data.color} onChange={handleChange} readOnly
                            />
                          </BootstrapForm.Group>
                        </Col>
                      </Row>

                      <Row className="mb-3">
                        <Col md={2}>
                          <BootstrapForm.Group controlId="sub_date" className="mb-3">
                            <BootstrapForm.Label>วันที่ส่ง</BootstrapForm.Label>
                            <BootstrapForm.Control
                              type="text" name="sub_date"
                              value={Data.sub_date} onChange={handleChange} readOnly
                            />
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
                              <BootstrapForm.Select
                                value={sectionCount}
                                onChange={handleSectionCountChange}
                              >
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
                                  onChange={(e) =>
                                    handleSectionTextChange(i + 1, e.target.value)
                                  }
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

                        {(Data.answesheet === "สมุดคำตอบ" ||
                          Data.answesheet === "กระดาษคอมพิวเตอร์") && (
                            <Col md={3}>
                              <BootstrapForm.Group controlId="answerbook_use" className="mb-3">
                                <BootstrapForm.Label>จำนวนเล่มต่อ 1 คน</BootstrapForm.Label>
                                <BootstrapForm.Control
                                  type="text" name="answerbook_use"
                                  value={Data.answerbook_use}
                                  onChange={handleAnswerBookCountChange}
                                  min="1"
                                  onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                                  inputMode="numeric" pattern="[0-9]*"
                                />
                              </BootstrapForm.Group>
                            </Col>
                          )}
                      </Row>

                      {/* หมายเหตุ (แบบใหม่) */}
                      <BootstrapForm.Group controlId="remark" className="mb-3">
                        <BootstrapForm.Label>หมายเหตุ</BootstrapForm.Label>
                        <BootstrapForm.Select
                          value={
                            remarkMode === "A4_BOTH"
                              ? "A4_BOTH"
                              : remarkMode === "A4_PAGES"
                                ? "A4_PAGES"
                                : ["นำกระดาษโน้ตห้องข้อสอบได้", "-"].includes(Data.remark)
                                  ? Data.remark
                                  : remarkMode === "CUSTOM"
                                    ? "other"
                                    : Data.remark || ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "A4_BOTH") {
                              setRemarkMode("A4_BOTH");
                              const txt = resolveRemarkText("A4_BOTH", a4SheetCount || "", "", Data.remark);
                              setData(prev => ({ ...prev, remark: txt }));
                            } else if (v === "A4_PAGES") {
                              setRemarkMode("A4_PAGES");
                              const txt = resolveRemarkText("A4_PAGES", "", a4PageCount || "", Data.remark);
                              setData(prev => ({ ...prev, remark: txt }));
                            } else if (v === "other") {
                              setRemarkMode("CUSTOM");
                              setData(prev => ({ ...prev, remark: "" }));
                            } else {
                              setRemarkMode("preset");
                              setData(prev => ({ ...prev, remark: v }));
                            }
                          }}
                          style={inputStyle("remark")}
                        >
                          <option value="">กรุณาเลือก</option>
                          <option value="นำกระดาษโน้ตห้องข้อสอบได้">นำกระดาษโน้ตห้องข้อสอบได้</option>
                          <option value="-">ไม่มี -</option>
                          <option value="A4_BOTH">อนุญาต A4 ... แผ่นหน้าหลัง</option>
                          <option value="A4_PAGES">อนุญาต A4 เข้าได้ ... หน้า (ที่เขียนด้วยลายมือตัวเอง)</option>
                          <option value="other">อื่นๆ...</option>
                        </BootstrapForm.Select>
                      </BootstrapForm.Group>

                      {remarkMode === "A4_BOTH" && (
                        <Row className="mb-3">
                          <Col md={4}>
                            <BootstrapForm.Group controlId="a4SheetCount">
                              <BootstrapForm.Label>จำนวนแผ่น (A4 หันหน้าหลัง)</BootstrapForm.Label>
                              <BootstrapForm.Control
                                type="number"
                                value={a4SheetCount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d]/g, "");
                                  setA4SheetCount(val);
                                  setData(prev => ({
                                    ...prev,
                                    remark: resolveRemarkText("A4_BOTH", val, "", prev.remark)
                                  }));
                                }}
                                min="0"
                              />
                            </BootstrapForm.Group>
                          </Col>
                        </Row>
                      )}

                      {remarkMode === "A4_PAGES" && (
                        <Row className="mb-3">
                          <Col md={4}>
                            <BootstrapForm.Group controlId="a4PageCount">
                              <BootstrapForm.Label>จำนวนหน้า (ลายมือ)</BootstrapForm.Label>
                              <BootstrapForm.Control
                                type="number"
                                value={a4PageCount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d]/g, "");
                                  setA4PageCount(val);
                                  setData(prev => ({
                                    ...prev,
                                    remark: resolveRemarkText("A4_PAGES", "", val, prev.remark)
                                  }));
                                }}
                                min="0"
                              />
                            </BootstrapForm.Group>
                          </Col>
                        </Row>
                      )}

                      {remarkMode === "CUSTOM" && (
                        <BootstrapForm.Group controlId="customRemark" className="mb-3">
                          <BootstrapForm.Label>กรอกหมายเหตุ</BootstrapForm.Label>
                          <BootstrapForm.Control
                            type="text" name="customRemark"
                            value={Data.remark}
                            onChange={(e) =>
                              setData((prev) => ({ ...prev, remark: e.target.value }))
                            }
                            placeholder="กรุณากรอกหมายเหตุ"
                          />
                        </BootstrapForm.Group>
                      )}

                      <BootstrapForm.Group controlId="fileexam" className="mb-4">
                        <BootstrapForm.Label>อัพโหลดไฟล์ข้อสอบ (เฉพาะ PDF)</BootstrapForm.Label>
                        <div className="d-flex flex-column gap-2">
                          <BootstrapForm.Control
                            type="file" name="fileexam"
                            onChange={handleFileAdd}
                            accept=".pdf,application/pdf"
                            multiple
                          />

                          {Data.fileexam?.length > 0 && (
                            <div className="mt-2">
                              <strong>
                                ไฟล์ PDF ที่เลือก ({Data.fileexam.length}/{Data.copy} ไฟล์):
                              </strong>
                              <ul className="list-group mt-2">
                                {Data.fileexam.map((file, index) => (
                                  <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span className="text-break">
                                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                    </span>
                                    <div className="d-flex gap-2">
                                      <Button
                                        variant="outline-primary" size="sm"
                                        onClick={() => {
                                          const url = URL.createObjectURL(file);
                                          const link = document.createElement("a");
                                          link.href = url; link.download = file.name;
                                          document.body.appendChild(link); link.click();
                                          document.body.removeChild(link); URL.revokeObjectURL(url);
                                        }}
                                      >
                                        ดาวน์โหลด
                                      </Button>
                                      <Button variant="outline-danger" size="sm" onClick={() => handleFileRemove(index)}>
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
                      <DownloadButton examRef={Data.Ref} className="me-2" />
                      <Button
                        type="submit"
                        variant="primary"
                        style={{ width: 160, whiteSpace: "nowrap", overflow: "hidden", height: 45, opacity: Data.submit === "ส่งแล้ว" ? 0.6 : 1 }}
                        disabled={Data.submit === "ส่งแล้ว"}
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

export default Sentform_roleteacher;
