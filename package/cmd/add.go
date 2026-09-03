package command

import (
	"encoding/json"
	"os"

	"github.com/elrefai99/Qar/package/internal/command"
	"github.com/elrefai99/Qar/package/utils"
)

func (c *command.Task) CreateTask(payload command.CreateTaskPayload) error {
	path := "json/file.json"

	file, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var task []command.Task

	if err := json.Unmarshal(file, &task); err != nil {
		return err
	}

	var newId uint64 = 1
	if len(task) > 0 {
		newId = task[len(task)-1].ID + 1
	}

	uuid, err := utils.NewUUID()
	if err != nil {
		return err
	}
	task = append(task, command.Task{
		ID:   newId,
		Uuid: uuid,
	})
}
