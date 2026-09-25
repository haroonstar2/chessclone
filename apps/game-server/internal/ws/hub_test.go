package ws

import (
	"testing"
	"time"
)

func TestClientRegistration(t *testing.T) {
	// Create a new Hub
	hub := NewHub()
	go hub.Run()

	client := &Client{
		hub:      hub,
		conn:     nil, // No actual WebSocket connection needed for this test
		send:     make(chan []byte, 256),
		UserUUID: "test-user-uuid",
	}

	// Register the client with the Hub
	hub.register <- client	

	// Allow some time for the hub to process the registration
	time.Sleep(100 * time.Millisecond)

	// Check if the client is registered
	if _, ok := hub.clients[client]; !ok {
		t.Errorf("Client was not registered in the Hub")
	}

	// Unregister the client
	hub.unregister <- client

	// Allow some time for the hub to process the unregistration
	time.Sleep(100 * time.Millisecond)

	// Check if the client is unregistered
	if _, ok := hub.clients[client]; ok {
		t.Errorf("Client was not unregistered from the Hub")
	}
}