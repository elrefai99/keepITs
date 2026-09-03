package command

import (
	"encoding/json"
	"os"
	"time"

	"github.com/elrefai99/Qar/package/utils"
)

func (c *Task) CreateTask(payload CreateTaskPayload) error {
	path := "json/file.json"

	file, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var task []Task

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
	status := StatusPending
	task = append(task, Task{
		ID:          newId,
		Uuid:        uuid,
		Status:      &status,
		Title:       payload.Title,
		Description: payload.Description,
		CreatedAt:   utils.TimerUtils(time.Now().UTC()),
		UpdatedAt:   utils.TimerUtils(time.Now().UTC()),
	})

	data, err := json.Marshal(task)
	if err != nil {
		return err
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return err
	}
	return nil
}
