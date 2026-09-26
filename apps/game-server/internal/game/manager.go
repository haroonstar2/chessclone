package game

import (
	"errors"
	"sync"
)

type Manager struct {
    rooms map[string]*GameRoom
    mu    sync.RWMutex
}

func NewManager() *Manager {
    return &Manager{
        rooms: make(map[string]*GameRoom),
    }
}

func (m *Manager) GetRoom(id string) (*GameRoom, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	room, exists := m.rooms[id]
	if !exists {
		return nil, errors.New("room not found")
	}
	return room, nil
}

func (m *Manager) CreateRoom(id string) *GameRoom {
    m.mu.Lock()
    defer m.mu.Unlock()

    room := NewGameRoom(id)
    m.rooms[id] = room
    return room
}

func (m *Manager) RemoveRoom(id string) {
    m.mu.Lock()
    defer m.mu.Unlock()
    delete(m.rooms, id)
}

func (m* Manager) JoinRoom(roomID string, client Sender) (*GameRoom, error) {
	room, err := m.GetRoom(roomID)
	if err != nil {
		room = m.CreateRoom(roomID)
	}

	if err := room.AddPlayer(client); err != nil {
		return nil, err
	}

	return room, nil
}