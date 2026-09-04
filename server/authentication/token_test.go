package main

import (
	"os"
	"testing"
)

func TestTokenRoundTrip(t *testing.T) {
	t.Setenv("JWT_SECRET", "01234567890123456789012345678901")
	token, err := CreateAccessToken("user-1")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := ParseToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "user-1" || claims.Type != "access" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestTokenRequiresSecret(t *testing.T) {
	if err := os.Unsetenv("JWT_SECRET"); err != nil {
		t.Fatal(err)
	}
	if _, err := CreateAccessToken("user-1"); err == nil {
		t.Fatal("expected missing secret error")
	}
}
