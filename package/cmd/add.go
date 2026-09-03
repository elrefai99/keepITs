package cmd

import (
	"github.com/elrefai99/Qar/package/internal/command"
	"github.com/elrefai99/Qar/package/utils"
	"github.com/spf13/cobra"
)

func cobraCreate() *cobra.Command {
	return &cobra.Command{
		Use: "create",
		RunE: func(cmd *cobra.Command, args []string) error {
			name := utils.ReadLine("Please enter title: ")
			description := utils.ReadLine("Please enter description: ")

			task := &command.Task{}

			if err := task.CreateTask(command.CreateTaskPayload{
				Title:       name,
				Description: description,
			}); err != nil {
				return err
			}
			return nil
		},
	}
}

func init() {
	rootCmd.AddCommand(cobraCreate())
}
