package command

type CreateTaskPayload struct {
	Title   string `json:"title" validate:"required,min=1,max=200"`
	Time    string `json:"time" validate:"omitempty,datetime=15:04"`
	EndTime string `json:"endTime,omitempty" validate:"omitempty,datetime=15:04"`

	DailyTimes   map[string]DailyTimeOverride `json:"dailyTimes,omitempty" validate:"omitempty,dive"`
	DurationDays *int                         `json:"durationDays,omitempty" validate:"omitempty,min=1"`
	WorkDays     []string                     `json:"workDays,omitempty" validate:"omitempty,dive,datetime=2006-01-02"`

	StartDate string `json:"startDate" validate:"required,datetime=2006-01-02"`
	EndDate   string `json:"endDate,omitempty" validate:"omitempty,datetime=2006-01-02"`

	Description string `json:"description" validate:"max=5000"`

	MeetingType MeetingType `json:"meetingType,omitempty" validate:"omitempty,oneof=none google teams custom"`
	MeetingURL  string      `json:"meetingUrl,omitempty" validate:"omitempty,url"`
	GuestEmails []string    `json:"guestEmails,omitempty" validate:"omitempty,dive,email"`

	BoardStatus  BoardStatus `json:"boardStatus,omitempty" validate:"omitempty,oneof=spec-needed todo in-progress blocked in-review done"`
	TicketNumber *int        `json:"ticketNumber,omitempty" validate:"omitempty,min=1"`

	Priority  Priority `json:"priority,omitempty" validate:"omitempty,oneof=critical medium low"`
	ProjectID string   `json:"projectId,omitempty" validate:"omitempty,mongodb"`
}

type UpdateTaskPayload struct {
	Title   *string `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	Time    *string `json:"time,omitempty" validate:"omitempty,datetime=15:04"`
	EndTime *string `json:"endTime,omitempty" validate:"omitempty,datetime=15:04"`

	DailyTimes   map[string]DailyTimeOverride `json:"dailyTimes,omitempty" validate:"omitempty,dive"`
	DurationDays *int                         `json:"durationDays,omitempty" validate:"omitempty,min=1"`
	WorkDays     []string                     `json:"workDays,omitempty" validate:"omitempty,dive,datetime=2006-01-02"`

	StartDate *string `json:"startDate,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string `json:"endDate,omitempty" validate:"omitempty,datetime=2006-01-02"`

	Description *string `json:"description,omitempty" validate:"omitempty,max=5000"`
	Completed   *bool   `json:"completed,omitempty"`
	Started     *bool   `json:"started,omitempty"`

	Order *int `json:"order,omitempty"`

	MeetingType *MeetingType `json:"meetingType,omitempty" validate:"omitempty,oneof=none google teams custom"`
	MeetingURL  *string      `json:"meetingUrl,omitempty" validate:"omitempty,url"`
	GuestEmails []string     `json:"guestEmails,omitempty" validate:"omitempty,dive,email"`

	BoardStatus  *BoardStatus `json:"boardStatus,omitempty" validate:"omitempty,oneof=spec-needed todo in-progress blocked in-review done"`
	TicketNumber *int         `json:"ticketNumber,omitempty" validate:"omitempty,min=1"`

	Priority  *Priority `json:"priority,omitempty" validate:"omitempty,oneof=critical medium low"`
	ProjectID *string   `json:"projectId,omitempty" validate:"omitempty,mongodb"`
}
