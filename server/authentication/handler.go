package main

import (
	"encoding/json"
	"net/http"
	"os"
)

type Handler struct {
	Service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		Service: service,
	}
}

type DeviceResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURL string `json:"verification_url"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

func (h *Handler) CreateDevice(
	w http.ResponseWriter,
	r *http.Request,
) {
	device, err := h.Service.CreateDevice(
		r.Context(),
	)

	if err != nil {
		http.Error(
			w,
			"failed to create device",
			http.StatusInternalServerError,
		)
		return
	}

	response := DeviceResponse{
		DeviceCode:      device.DeviceCode,
		UserCode:        device.UserCode,
		VerificationURL: verificationURL(),
		ExpiresIn:       deviceTTL,
		Interval:        2,
	}

	writeJSON(
		w,
		http.StatusOK,
		response,
	)
}

type TokenRequest struct {
	DeviceCode string `json:"device_code"`
}

func (h *Handler) Token(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request TokenRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request",
			http.StatusBadRequest,
		)
		return
	}
	if request.DeviceCode == "" {
		http.Error(w, "device_code is required", http.StatusBadRequest)
		return
	}

	device, err := h.Service.GetDevice(
		r.Context(),
		request.DeviceCode,
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusNotFound,
			map[string]string{
				"status": "expired",
			},
		)
		return
	}

	if !device.Approved {
		writeJSON(
			w,
			http.StatusOK,
			map[string]string{
				"status": "pending",
			},
		)
		return
	}

	accessToken, err := CreateAccessToken(
		device.UserID,
	)

	if err != nil {
		http.Error(
			w,
			"failed to create access token",
			http.StatusInternalServerError,
		)
		return
	}

	refreshToken, err := CreateRefreshToken(
		device.UserID,
	)

	if err != nil {
		http.Error(
			w,
			"failed to create refresh token",
			http.StatusInternalServerError,
		)
		return
	}

	// Device code is one-time-use.
	_ = h.Service.DeleteDevice(
		r.Context(),
		device.DeviceCode,
	)

	writeJSON(
		w,
		http.StatusOK,
		map[string]string{
			"status":        "approved",
			"access_token":  accessToken,
			"refresh_token": refreshToken,
		},
	)
}

type ApproveRequest struct {
	UserCode string `json:"user_code"`
	UserID   string `json:"user_id"`
}

func (h *Handler) Approve(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request ApproveRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request",
			http.StatusBadRequest,
		)
		return
	}
	if request.UserCode == "" || request.UserID == "" {
		http.Error(w, "user_code and user_id are required", http.StatusBadRequest)
		return
	}

	err := h.Service.ApproveDevice(
		r.Context(),
		request.UserCode,
		request.UserID,
	)

	if err != nil {
		http.Error(
			w,
			"invalid device code",
			http.StatusNotFound,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]bool{
			"success": true,
		},
	)
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	data any,
) {
	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}

func verificationURL() string {
	if value := os.Getenv("VERIFICATION_URL"); value != "" {
		return value
	}
	return "http://localhost:3000/device"
}
