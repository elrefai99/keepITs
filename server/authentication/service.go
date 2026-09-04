package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const deviceTTL = 5 * 60

type DeviceSession struct {
	DeviceCode string `json:"device_code"`
	UserCode   string `json:"user_code"`
	UserID     string `json:"user_id,omitempty"`
	Approved   bool   `json:"approved"`
}

type Service struct{ Redis *Redis }

func NewService(redis *Redis) *Service { return &Service{Redis: redis} }

func randomString(bytesLength int) (string, error) {
	data := make([]byte, bytesLength)
	if _, err := rand.Read(data); err != nil {
		return "", err
	}
	return hex.EncodeToString(data), nil
}

func (s *Service) CreateDevice(ctx context.Context) (*DeviceSession, error) {
	deviceCode, err := randomString(32)
	if err != nil {
		return nil, err
	}
	userCode, err := randomString(4)
	if err != nil {
		return nil, err
	}
	device := &DeviceSession{DeviceCode: deviceCode, UserCode: userCode}
	data, err := json.Marshal(device)
	if err != nil {
		return nil, err
	}
	if err := s.Redis.Set(ctx, "device:"+deviceCode, string(data), deviceTTL); err != nil {
		return nil, err
	}
	if err := s.Redis.Set(ctx, "user-code:"+userCode, deviceCode, deviceTTL); err != nil {
		_ = s.Redis.Delete(ctx, "device:"+deviceCode)
		return nil, err
	}
	return device, nil
}

func (s *Service) GetDevice(ctx context.Context, deviceCode string) (*DeviceSession, error) {
	if strings.TrimSpace(deviceCode) == "" {
		return nil, errors.New("device code is required")
	}
	data, err := s.Redis.Get(ctx, "device:"+deviceCode)
	if err != nil {
		return nil, err
	}
	var device DeviceSession
	if err := json.Unmarshal([]byte(data), &device); err != nil {
		return nil, err
	}
	return &device, nil
}

func (s *Service) SaveDevice(ctx context.Context, device *DeviceSession) error {
	if device == nil || device.DeviceCode == "" {
		return errors.New("invalid device")
	}
	ttl, err := s.Redis.TTL(ctx, "device:"+device.DeviceCode)
	if err != nil || ttl <= 0 {
		return errors.New("device expired")
	}
	data, err := json.Marshal(device)
	if err != nil {
		return err
	}
	return s.Redis.Set(ctx, "device:"+device.DeviceCode, string(data), int(ttl/time.Second))
}

func (s *Service) ApproveDevice(ctx context.Context, userCode string, userID string) error {
	if strings.TrimSpace(userCode) == "" || strings.TrimSpace(userID) == "" {
		return errors.New("user code and user id are required")
	}
	deviceCode, err := s.Redis.Get(ctx, "user-code:"+userCode)
	if err != nil {
		return errors.New("device not found")
	}
	device, err := s.GetDevice(ctx, deviceCode)
	if err != nil || device.UserCode != userCode || device.Approved {
		return errors.New("device not found")
	}
	device.Approved = true
	device.UserID = userID
	return s.SaveDevice(ctx, device)
}

func (s *Service) DeleteDevice(ctx context.Context, deviceCode string) error {
	device, err := s.GetDevice(ctx, deviceCode)
	if err != nil {
		return err
	}
	if err := s.Redis.Delete(ctx, "device:"+deviceCode); err != nil {
		return err
	}
	return s.Redis.Delete(ctx, "user-code:"+device.UserCode)
}
