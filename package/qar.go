package main

import (
	"fmt"

	"github.com/elrefai99/Qar/package/utils"
)

type ToDoStruct struct {
	uid   string
	title string
}

func Qar() {
	id, err := utils.NewUUID()

	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("UUID String:", id)
}
