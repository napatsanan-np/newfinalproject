package routes

import (
	"database/sql"

	"github.com/controllers"
	"github.com/gin-gonic/gin"
	"github.com/middleware"
	"github.com/services/deleteservice"
	"github.com/services/insertservice"
	"github.com/services/selectservice"
	"github.com/services/updateservice"
)

func SetupRoutes(r *gin.Engine, db *sql.DB) {

	// สร้าง services
	selectservice := selectservice.NewUserSelectService(db)
	deleteservice := deleteservice.NewUserDeleteService(db)
	insertservice := insertservice.NewUserInsertService(db)
	UpdateService := updateservice.NewUserUpdateService(db)

	// สร้าง controllers
	examController := controllers.NewExamController(selectservice, deleteservice, insertservice, UpdateService)

	// Public routes (no authentication required)
	r.POST("/api/login", examController.Login)
	r.GET("/api/sso/login", examController.LoginHandler)
	r.GET("/api/callback", examController.CallbackHandler)
	// Protected routes ConditionWithproctor //UpdateBackupExam

	//--------------------------------------------------------------(อาจารย์)--------------------------------------------------------------------------------------------------------------------------------------
	protected_teacher := r.Group("/api/teacher")
	protected_teacher.Use(
		middleware.AuthMiddleware(),
		middleware.RoleMiddleware("อาจารย์"),
		middleware.ActivityLogMiddleware(db),
	)
	{
		protected_teacher.GET("/GetExamtable", examController.ExamDatawithRoleTeach)
		protected_teacher.GET("/fetch/detail_exam", examController.FetchDetailExam)
		protected_teacher.POST("/Edit_DetailExam", examController.UpdateDetailExam)
	}
	//-----------------------------------------------------------------(กรรมการคุมสอบ)--------------------------------------------------------------------------------------------------------------------------------
	protected_proctor := r.Group("/api/proctor")
	protected_proctor.Use(
		middleware.AuthMiddleware(),
		middleware.RoleMiddleware("กรรมการคุมสอบ"),
		middleware.ActivityLogMiddleware(db),
	)
	{
		protected_proctor.GET("/GetExamtableProctor", examController.ExamDatawithRoleProctor)
		protected_proctor.GET("/GetExamtable", examController.ExamDatawithRoleTeach)
		protected_proctor.GET("/fetch/detail_exam", examController.FetchDetailExam)
	}
	//------------------------------------------------------------------(ผู้ดูแลระบบ)------------------------------------------------------------------------------------------------------------------------------------
	protected := r.Group("/api")
	protected.Use(
		middleware.AuthMiddleware(),
		middleware.RoleMiddleware("ผู้ดูแลระบบ", "กรรมการห้องข้อสอบ"),
		middleware.ActivityLogMiddleware(db),
	)
	{
		// protected.POST("/students/import", examController.StudentSig)
		// protected.GET("/students/:filename/:roomname/:rowFilterParam", examController.GetStd)

		protected.POST("/students/import", examController.ImportStudents)
		protected.GET("/students", examController.GetStudents)

		protected.POST("/upload", examController.ImportCSV)
		protected.POST("/DeleteTable", examController.Deltable)
		protected.POST("/DeleteTable/:ref", examController.Deltable)
		protected.GET("/detailexaminnerjoinroomexam/:ref", examController.ShowData)
		protected.POST("/Edit_DetailExam", examController.UpdateDetailExam)
		protected.POST("/New_Insert_Exam", examController.NewExam)
		protected.GET("/select_data/:tablename/:ref", examController.ShowData)
		protected.GET("/DataRoomexam", examController.FetchRoomExam)
		protected.GET("/DataRoomexamExamdetail", examController.InnerJoinExamroomExamdetail)
		protected.GET("/GetDataProctorInnerJoinRoomExam", examController.GetProtorWithRoomexam)
		protected.GET("/DataUser", examController.ShowDataUser)
		protected.GET("/GetProctorNames", examController.GetProctorNames)
		protected.GET("/GetProctorNames/:no", examController.GetProctorNameswithNo)
		protected.GET("/Getroomexamwithref/:ref", examController.Getroomexamwithref)
		protected.POST("/upload/proctor_condition", examController.ImportCSVProctor)
		protected.PUT("/UpdateBackupExam", examController.UpdateBackupExam) // UpdateBackupExam
		protected.POST("/update_proctor_assignments", examController.HandleUpdateProctorAssignments)
		protected.DELETE("/delete_proctor_assignments/:ref", examController.HandleDeleteProctorsByRef)
		protected.POST("/insert_data/users", examController.Insert)
		protected.PUT("/update_data/users/:id", examController.EditUser)
		protected.DELETE("/delete_data/users/:id", examController.DelUser)

		// ===================== Reports =====================
		// (เดิม) year/semester
		protected.GET("/reports/paper-usage/:academic_year/:semester", examController.GetPaperUsageReport)
		protected.GET("/reports/exam-submissions/:academic_year/:semester", examController.GetExamSubmissionReport)
		protected.GET("/reports/proctor-stats/:academic_year/:semester", examController.GetProctorReport)
		protected.GET("/reports/proctor-stats/:academic_year/:semester/:user_id", examController.GetProctorReport)

		// (ใหม่) year/semester/phase
		protected.GET("/reports/paper-usage/:academic_year/:semester/:phase", examController.GetPaperUsageReport)
		protected.GET("/reports/exam-submissions/:academic_year/:semester/:phase", examController.GetExamSubmissionReport)

		// (ใหม่) proctor-stats ใช้ static segment เพื่อไม่ชนกับ :user_id
		protected.GET("/reports/proctor-stats/:academic_year/:semester/phase/:phase", examController.GetProctorReport)
		protected.GET("/reports/proctor-stats/:academic_year/:semester/phase/:phase/user/:user_id", examController.GetProctorReport)

		protected.PUT("/edit_department/:id", examController.EditDept)
		protected.DELETE("/delete_department/:id", examController.DelDept)
		protected.POST("/add_department", examController.AddDept)
		//DeltableCondition
		protected.POST("/DeltableCondition", examController.DeltableCondition)
		// Public routes
		protected.GET("/GetUserWithRole", examController.GetUserWithRole)
		protected.POST("/SetSystemmanagement", examController.SystemMenagement)
		protected.POST("/selectConfig/exam_config", examController.Edit_System_Status)
		protected.POST("/delete_data/exam_config", examController.DeltableConfig)
		protected.POST("/update_data/exam_config/:academic_year/:semester", examController.Edit_System)
		protected.POST("/update_data/AddProctorexamroom", examController.Edit_RoleProctorExamroom)
		protected.POST("/delete_data/DeleteProctorexamroom", examController.Edit_RoleProctor)
		protected.GET("/select_data/:tablename", examController.ShowData)
		protected.GET("/GetExamtable/:name", examController.ExamDatawithRoleTeach)
		protected.GET("/GetExamtableProctor", examController.AllExamDatawithRoleProctor)

		protected.GET("/GetExamtableProctor/:name", examController.ExamDatawithRoleProctor)

		protected.POST("/AutoExamRoom", examController.AutoExamRoom)
		protected.POST("/AutoProctor", examController.AutoProctor)
		protected.POST("/UpdateExamRoom", examController.UpdateRoomExam)
		protected.POST("/DeleteExamRoom", examController.DelRoomExam)

		protected.GET("/getfile/:ref", examController.GetFiles)

		protected.GET("/ConditionWithproctor", examController.ConditionWithproctor)

		protected.POST("/rooms", examController.CreateRoom)            // Create a new room
		protected.PUT("/rooms/:room_id", examController.UpdateRoom)    // Update a room
		protected.DELETE("/rooms/:room_id", examController.DeleteRoom) // Delete a room
		protected.GET("/rooms/:room_id/seat-plan", examController.GetRoomSeatPlan) // ✅ NEW
		protected.PUT("/rooms/:room_id/seat-plan", examController.UpsertRoomSeatPlan)   // ✅ เพิ่ม
		protected.DELETE("/rooms/:room_id/seat-plan", examController.DeleteRoomSeatPlan) // ✅ เพิ่ม (ล้างผัง)

		protected.POST("/admin/update/examtable", examController.UpdateExamTableNew)
		protected.POST("/admin/update/roomexam", examController.UpdateRoomExamNew)
		protected.POST("/admin/update/detail_exam", examController.UpdateDetailExamNew)

		//ลองสร้างมาใหม่อันเก่าไม่รู้ทำไมดึงไม่ได้
		protected.GET("/select_data/detail_exam_all", examController.GetDetailExamForEdit)
		protected.GET("/select_data/examtable_all", examController.GetExamtableForEdit)
		protected.GET("/select_data/roomexam_all", examController.GetRoomexamForEdit)

		protected.POST("/admin/update/condition_proctor", examController.UpdateConditionProctorNew)
		protected.GET("/activity-logs", examController.GetUserActivityLogs)

	}
}
