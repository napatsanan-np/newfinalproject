package controllers

import (
	"github.com/services/deleteservice"
	"github.com/services/insertservice"
	"github.com/services/selectservice"
	"github.com/services/updateservice"
)

type Controller struct {
	SelectService *selectservice.UserSelectService
	Deleteservice *deleteservice.UserDeleteService
	Insertservice *insertservice.UseInsertService
	Updateservice *updateservice.Userupdateservice
}

func NewExamController(SelectService *selectservice.UserSelectService, Deleteservice *deleteservice.UserDeleteService, Insertservice *insertservice.UseInsertService, UpdateService *updateservice.Userupdateservice) *Controller {
	return &Controller{
		SelectService: SelectService,
		Deleteservice: Deleteservice,
		Insertservice: Insertservice,
		Updateservice: UpdateService,
	}
}
