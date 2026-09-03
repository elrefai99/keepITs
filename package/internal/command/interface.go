package command

import "time"

type DailyTimeOverride struct {
	Time    string `json:"time" bson:"time"`
	EndTime string `json:"endTime" bson:"endTime"`
}

type Comment struct {
	ID        string `json:"id" bson:"id"`
	Text      string `json:"text" bson:"text"`
	CreatedAt string `json:"createdAt" bson:"createdAt"`
}

type MeetingType string

const (
	MeetingTypeNone   MeetingType = "none"
	MeetingTypeGoogle MeetingType = "google"
	MeetingTypeTeams  MeetingType = "teams"
	MeetingTypeCustom MeetingType = "custom"
)

type BoardStatus string

const (
	BoardStatusSpecNeeded BoardStatus = "spec-needed"
	BoardStatusTodo       BoardStatus = "todo"
	BoardStatusInProgress BoardStatus = "in-progress"
	BoardStatusBlocked    BoardStatus = "blocked"
	BoardStatusInReview   BoardStatus = "in-review"
	BoardStatusDone       BoardStatus = "done"
)

type Priority string

const (
	PriorityCritical Priority = "critical"
	PriorityMedium   Priority = "medium"
	PriorityLow      Priority = "low"
)

type Task struct {
	ID           uint64                       `json:"id" bson:"id"`
	Uuid         string                       `json:"uuid" bson:"uuid"`
	Title        string                       `json:"title" bson:"title"`
	UserID       string                       `json:"userId" bson:"userId"`
	Time         string                       `json:"time" bson:"time"`                           // e.g. "09:00" ('' for unscheduled)
	EndTime      string                       `json:"endTime,omitempty" bson:"endTime,omitempty"` // e.g. "10:00"
	DailyTimes   map[string]DailyTimeOverride `json:"dailyTimes,omitempty" bson:"dailyTimes,omitempty"`
	DurationDays *int                         `json:"durationDays,omitempty" bson:"durationDays,omitempty"`
	WorkDays     []string                     `json:"workDays,omitempty" bson:"workDays,omitempty"`
	StartDate    string                       `json:"startDate" bson:"startDate"` // YYYY-MM-DD ('' for unscheduled)
	EndDate      string                       `json:"endDate,omitempty" bson:"endDate,omitempty"`
	Description  string                       `json:"description" bson:"description"`
	Completed    bool                         `json:"completed" bson:"completed"`
	Started      *bool                        `json:"started,omitempty" bson:"started,omitempty"`
	Date         string                       `json:"date" bson:"date"`
	Order        *int                         `json:"order,omitempty" bson:"order,omitempty"`
	MeetingType  *MeetingType                 `json:"meetingType,omitempty" bson:"meetingType,omitempty"`
	MeetingURL   string                       `json:"meetingUrl,omitempty" bson:"meetingUrl,omitempty"`
	GuestEmails  []string                     `json:"guestEmails,omitempty" bson:"guestEmails,omitempty"`
	BoardStatus  *BoardStatus                 `json:"boardStatus,omitempty" bson:"boardStatus,omitempty"`
	TicketNumber *int                         `json:"ticketNumber,omitempty" bson:"ticketNumber,omitempty"`
	Comments     []Comment                    `json:"comments,omitempty" bson:"comments,omitempty"`
	Priority     *Priority                    `json:"priority,omitempty" bson:"priority,omitempty"`
	ProjectID    string                       `json:"projectId,omitempty" bson:"projectId,omitempty"`
	CreatedAt    *time.Time                   `json:"createdAt,omitempty" bson:"createdAt,omitempty"`
	UpdatedAt    *time.Time                   `json:"updatedAt,omitempty" bson:"updatedAt,omitempty"`
}
